# 망호컵 백엔드 연동 기획서

## 1. 배경 및 목적

현재 망호컵은 **클라이언트(localStorage) 기반**으로 경매 상태를 관리한다.
디스코드 봇을 통해 참가자가 직접 입찰할 수 있도록 하려면,
경매 상태의 **source of truth를 서버로 이전**해야 한다.

### 목표
- 웹 UI의 경매 진행자(호스트)가 경매를 시작/관리
- 디스코드 봇을 통해 팀장(캡틴)이 특정 금액을 입찰
- 모든 클라이언트(웹 + 봇)에 입찰 상태가 **실시간 동기화**

---

## 2. 현재 구조 (AS-IS)

```
[웹 브라우저]
  ├─ home.tsx: 전체 상태 관리 (phase, captains, auctionPool, history)
  ├─ auction.tsx: 라운드 상태 (timer, currentBid, highestBidder)
  └─ localStorage: 스냅샷 저장 (draft.v1, round.v1)
```

- 상태 전부 클라이언트 메모리 + localStorage
- 서버는 CSV 파싱(action)만 담당
- 입찰은 웹 UI에서만 가능

---

## 3. 목표 구조 (TO-BE)

```
[디스코드 봇] ──WebSocket──┐
                            ▼
                     [백엔드 서버]
                     ├─ REST API (경매 관리)
                     ├─ WebSocket Hub (실시간 브로드캐스트)
                     └─ SQLite DB (상태 저장)
                            ▲
[웹 브라우저] ──WebSocket───┘
```

### 역할 분리

| 주체 | 역할 |
|------|------|
| **웹 호스트** | 경매 생성, 캡틴 선택, 경매 시작/스킵/되돌리기 |
| **디스코드 봇** | 캡틴의 입찰 명령을 서버에 전달 |
| **백엔드 서버** | 경매 상태 관리, 타이머, 유효성 검증, 브로드캐스트 |

---

## 4. 데이터 모델

### 4.1 테이블 설계

```sql
-- 경매 세션
CREATE TABLE auction_session (
  id            TEXT PRIMARY KEY,     -- UUID
  phase         TEXT NOT NULL,        -- 'captainSelect' | 'auction' | 'result'
  members_per_team INTEGER NOT NULL,
  round_seconds INTEGER NOT NULL DEFAULT 30,
  auction_index INTEGER NOT NULL DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 플레이어
CREATE TABLE player (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES auction_session(id),
  name          TEXT NOT NULL,
  tier          TEXT NOT NULL,
  memo          TEXT DEFAULT '',
  is_captain    INTEGER DEFAULT 0,    -- 0 or 1
  pool_order    INTEGER,              -- 경매 순서 (셔플 결과)
  assigned_to   TEXT REFERENCES captain(id)  -- 낙찰된 캡틴
);

-- 캡틴
CREATE TABLE captain (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES auction_session(id),
  player_id     TEXT NOT NULL REFERENCES player(id),
  budget        INTEGER NOT NULL,
  discord_user_id TEXT              -- 디스코드 유저 매핑 (nullable)
);

-- 현재 라운드 (진행 중인 경매 1건)
CREATE TABLE round (
  session_id    TEXT PRIMARY KEY REFERENCES auction_session(id),
  player_id     TEXT NOT NULL REFERENCES player(id),
  current_bid   INTEGER NOT NULL,
  highest_bidder_id TEXT REFERENCES captain(id),
  time_left     INTEGER NOT NULL,
  is_started    INTEGER DEFAULT 0,
  started_at    DATETIME
);

-- 경매 이력 (되돌리기용)
CREATE TABLE bid_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    TEXT NOT NULL REFERENCES auction_session(id),
  captain_id    TEXT NOT NULL REFERENCES captain(id),
  player_id     TEXT NOT NULL REFERENCES player(id),
  amount        INTEGER NOT NULL,
  prev_budget   INTEGER NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 디스코드 유저 매핑

캡틴 선택 후, 호스트가 각 캡틴에 디스코드 유저를 매핑한다.

```
호스트 웹 UI:
  캡틴 "홍길동" ← Discord: @hong#1234
  캡틴 "김철수" ← Discord: @kim#5678
```

매핑 방식 (택 1):
- **A) 호스트가 직접 입력**: 웹 UI에서 캡틴별 디스코드 ID 입력
- **B) 봇 명령어로 등록**: `/등록 캡틴이름` → 봇이 discord_user_id 매핑

---

## 5. API 설계

### 5.1 REST API (호스트용)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/sessions` | 세션 생성 (CSV URL → 파싱 → 세션+플레이어 저장) |
| GET | `/api/sessions/:id` | 세션 전체 상태 조회 |
| POST | `/api/sessions/:id/captains` | 캡틴 확정 (선택된 ID 목록) |
| POST | `/api/sessions/:id/start-round` | 현재 라운드 시작 (타이머 시작) |
| POST | `/api/sessions/:id/skip` | 현재 선수 스킵 |
| POST | `/api/sessions/:id/undo` | 마지막 낙찰 되돌리기 |
| POST | `/api/sessions/:id/force-settle` | 즉시 낙찰 |

### 5.2 WebSocket 이벤트

**서버 → 클라이언트 (브로드캐스트)**

| 이벤트 | 페이로드 | 설명 |
|--------|----------|------|
| `round:start` | `{ player, timeLeft, startPrice }` | 라운드 시작 |
| `round:tick` | `{ timeLeft }` | 매초 타이머 |
| `round:bid` | `{ captainId, amount, timeLeft }` | 새 입찰 발생 |
| `round:settle` | `{ captainId, player, amount }` | 낙찰 |
| `round:skip` | `{ player }` | 스킵 |
| `round:undo` | `{ captainId, player, restoredBudget }` | 되돌리기 |
| `session:update` | `{ captains, auctionIndex }` | 전체 상태 갱신 |

**클라이언트 → 서버 (입찰)**

| 이벤트 | 페이로드 | 설명 |
|--------|----------|------|
| `bid` | `{ sessionId, captainId, amount }` | 입찰 요청 |

### 5.3 디스코드 봇 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/입찰 [금액]` | 매핑된 캡틴으로 입찰 |
| `/내정보` | 현재 예산, 팀원 목록 확인 |
| `/현재경매` | 현재 경매 대상 선수 + 최고 입찰가 확인 |

봇은 내부적으로 WebSocket 클라이언트로 서버에 연결되어 입찰을 전달하고,
라운드 이벤트를 수신하여 디스코드 채널에 실시간으로 알림을 보낸다.

---

## 6. 타이머 처리

**현재**: 클라이언트 `setTimeout`으로 1초마다 감소
**변경**: 서버에서 타이머 관리

```
서버:
  - round 시작 시 started_at 기록
  - 1초 간격 setInterval로 time_left 감소
  - 매 tick마다 WebSocket 브로드캐스트
  - time_left === 0 이면 자동 낙찰/스킵 처리
  - 새 입찰 시 time_left 리셋

클라이언트:
  - WebSocket으로 받은 timeLeft를 표시만 함
  - 타이머 로직 제거
```

---

## 7. 입찰 유효성 검증 (서버)

모든 입찰은 서버에서 검증한다:

```
1. 세션이 존재하고 phase === 'auction'
2. 라운드가 시작된 상태 (is_started === 1)
3. 해당 캡틴이 현재 최고 입찰자가 아님
4. 캡틴 팀이 아직 풀이 아님 (members < membersPerTeam)
5. 금액 >= minBid (첫 입찰이면 startPrice, 아니면 currentBid + 1)
6. 금액 <= 캡틴 예산
```

검증 실패 시 입찰자에게만 에러를 반환하고 브로드캐스트하지 않는다.

---

## 8. 웹 프론트엔드 변경사항

### 변경되는 부분
| 현재 | 변경 후 |
|------|---------|
| localStorage에 상태 저장 | 서버 DB가 source of truth |
| 클라이언트 타이머 (setTimeout) | 서버 타이머 + WebSocket tick 수신 |
| auction.tsx 내 입찰 로직 | 서버에 입찰 요청 → 결과 수신 |
| home.tsx에서 전체 상태 관리 | 서버 상태를 WebSocket으로 동기화 |

### 유지되는 부분
- UI 컴포넌트 구조 (auction, captain-select, draft-result)
- 티어별 색상, 시작가 등 표시 로직
- CSV 파싱 (서버 action에서 이미 처리 중)

### 새로 추가
- WebSocket 연결 훅 (`useAuctionSocket`)
- 세션 ID 기반 URL 라우팅 (`/session/:id`)
- 캡틴-디스코드 매핑 UI

---

## 9. 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| DB | **SQLite (better-sqlite3)** | 별도 서버 불필요, 단일 세션 운영에 적합 |
| WebSocket | **ws** 라이브러리 | React Router의 Node 서버에 붙여서 사용 |
| 디스코드 봇 | **discord.js** | 표준 라이브러리, 슬래시 커맨드 지원 |
| ORM | 없음 (raw SQL) | 테이블 5개, 단순 쿼리 → ORM 오버헤드 불필요 |

---

## 10. 구현 순서

### Phase 1: DB + API
1. SQLite 스키마 생성 및 마이그레이션
2. 세션 CRUD API 구현
3. 캡틴 선택/확정 API
4. 기존 CSV 파싱 → 세션 생성으로 연결

### Phase 2: 서버 경매 로직
5. 서버 타이머 구현 (라운드 시작/틱/종료)
6. 입찰 처리 + 유효성 검증
7. 자동 낙찰/스킵/되돌리기 로직
8. 경매 이력(bid_history) 기록

### Phase 3: WebSocket
9. ws 서버 셋업 (React Router 서버에 통합)
10. 이벤트 브로드캐스트 구현
11. 프론트엔드 WebSocket 훅 (`useAuctionSocket`)
12. 기존 클라이언트 로직 → WebSocket 수신으로 전환

### Phase 4: 디스코드 봇
13. discord.js 봇 셋업 + 슬래시 커맨드 등록
14. 캡틴-디스코드 유저 매핑
15. `/입찰`, `/내정보`, `/현재경매` 구현
16. 봇 → WebSocket 클라이언트로 서버 연결
17. 경매 이벤트 → 디스코드 채널 알림

---

## 11. 고려사항

### 동시성
- 동시에 두 캡틴이 같은 금액으로 입찰할 수 있음
- 서버에서 **순차 처리** (SQLite 단일 쓰기 + 메모리 락)로 선착순 보장

### 세션 복구
- 서버 재시작 시 DB에서 상태 복원
- 진행 중이던 라운드의 타이머는 `started_at` + `time_left` 기반으로 재계산

### 배포
- 현재 Dockerfile 존재 → 컨테이너 배포 가능
- SQLite 파일은 볼륨 마운트로 영속화
- 봇은 같은 컨테이너 or 별도 프로세스로 실행

### 보안
- 호스트 API는 세션 생성 시 발급하는 `hostToken`으로 인증
- 봇 입찰은 discord_user_id 검증으로 본인 캡틴만 입찰 가능
- WebSocket 연결 시 sessionId 유효성 확인
