# AIOffice PRD

> 이 문서는 Claude Code가 AIOffice를 단계별로 구현하기 위한 제품 요구사항 문서다.
> 구현 전에 이 문서 전체를 읽고, **현재 지시받은 마일스톤만** 구현한다.

---

## 0. Claude Code 작업 규칙

1. 한 번에 하나의 마일스톤(§9)만 구현한다. 다음 마일스톤의 기능을 미리 만들지 않는다.
2. 각 마일스톤 시작 시 해당 섹션의 **완료 조건**을 먼저 확인하고, 끝나면 완료 조건을 하나씩 검증한 결과를 보고한다.
3. 마일스톤이 끝날 때마다 `npm run build`와 `npm run typecheck`를 실행하고 결과를 보여준다.
4. 이전 마일스톤에서 만든 스키마·데이터 접근 함수는 꼭 필요할 때만 수정하고, 수정하면 이유를 설명한다. 스키마 변경은 반드시 새 마이그레이션 파일로 한다.
5. 요구사항이 모호하면 추측으로 큰 구조를 정하지 말고, §11(미결정 사항)에 적힌 기본값을 따르거나 질문한다.
6. 비밀 키(LLM API 키, Supabase service role 키)는 절대 클라이언트 코드나 커밋에 넣지 않는다. `.env.example`에는 키 이름만 적는다.
7. 권한 체크는 UI에서만 하지 않는다. 항상 **서버(서버 액션/Edge Function) + RLS** 두 곳에서 막는다.
8. supabase mcp 연결 돼 있으니 활용할 것.
9. 로그인은 슈파베이스 이메일 로그인으로, 카카오는 추후에 추가 할거야
10. 관리자 계정은 ew20@naver.com 이걸로 미리 추가해뒀으니 이 이메일로 관리자로 설정할 것.

---

## 1. 개요

**AIOffice**는 실제로 LLM을 호출해 결과물을 만드는 AI 직원(에이전트)들을 3D 가상 오피스에서 관리하는 웹 앱이다.

- 화면은 투포인트 호스피탈, 게임개발 커쿤 같은 아이소메트릭 경영 시뮬레이션 게임 스타일이다.
- 관리자가 AI 직원을 채용하고 작업을 지시하면, 백엔드 작업 엔진이 정해진 근무시간에 LLM을 호출해 작업을 처리한다.
- 오피스는 항상 살아 있는 것처럼 보이지만(클라이언트 애니메이션), **실제 LLM 호출은 처리할 작업이 있을 때만** 일어난다. 비용은 시간이 아니라 작업 수에 비례해야 한다.
- 로그인한 사용자 중 관리자 승인을 받은 사람만 오피스에 들어올 수 있다.

## 2. 목표와 비목표

### 목표

- 관리자가 AI 직원을 만들고, 작업을 지시하고, 결과물을 확인할 수 있다.
- 작업은 서버에서 처리되며 브라우저를 닫아도 계속 진행된다.
- 모든 접속자가 같은 오피스 상태를 실시간으로 본다.
- LLM 비용이 예산 안에서 통제된다.

### 비목표 (이번 범위에서 만들지 않음)

- 에이전트끼리 대화하거나 작업을 서로 넘기는 멀티에이전트 협업
- 외부 서비스(이메일 발송, SNS 게시, 코드 배포 등)에 실제로 행동하는 기능. 결과물은 텍스트로 저장만 한다.
- 결제, 다중 회사(멀티 테넌시)
- 모바일 전용 UI (데스크톱 우선, 모바일은 깨지지 않을 정도만)

## 3. 사용자와 권한

| 역할                  | 설명                                                              | 할 수 있는 것                                                                                                                                        |
| --------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **admin**             | 서비스 소유자. 첫 관리자는 환경변수 `ADMIN_EMAIL`과 일치하는 계정 | 모든 것: 가입 승인/거절, AI 직원 생성·수정·삭제·일시정지, 작업 지시, 예산·근무시간 설정, LLM 모델과 API 키 관리, 작업 엔진 수동 실행, 전체 긴급 정지 |
| **member (approved)** | 관리자가 승인한 사용자                                            | 오피스 보기, 직원 상태·작업·로그·결과물 **읽기만**                                                                                                   |
| **pending**           | 가입했지만 아직 승인 안 된 사용자                                 | "관리자 승인 대기 중" 화면만 볼 수 있음. 데이터 읽기 불가                                                                                            |
| **rejected**          | 거절된 사용자                                                     | "가입이 거절되었습니다" 화면만 볼 수 있음                                                                                                            |
| 비로그인              | -                                                                 | 로그인/회원가입 화면만 접근 가능                                                                                                                     |

## 4. 기술 스택

- **프론트엔드**: Next.js (App Router), TypeScript, Tailwind CSS
- **3D**: React Three Fiber, @react-three/drei, @react-three/postprocessing(외곽선)
- **클라이언트 상태**: Zustand
- **백엔드**: Supabase
  - Postgres (데이터), Auth (이메일 로그인), Realtime (상태 동기화)
  - Edge Functions (LLM 호출 작업 엔진), pg_cron (근무시간 스케줄)
- **LLM**: 여러 제공사 지원 (Anthropic Claude, OpenAI GPT, Google Gemini). Vercel AI SDK로 제공사별 호출을 하나의 인터페이스로 통일한다. 사용 가능한 모델 목록과 단가는 코드가 아니라 DB(`llm_models` 테이블)에서 관리한다. 자세한 내용은 §7.7.
- **배포**: Next.js는 Vercel, 백엔드는 Supabase

> Next.js API 라우트에서 LLM 작업을 실행하지 않는다. 서버리스 실행 시간 제한 때문에 긴 작업이 끊길 수 있다. LLM 호출은 Edge Function에서만 한다.

## 5. 아키텍처

```
[브라우저: Next.js + R3F]
   │  읽기: Supabase 클라이언트 (RLS 적용)
   │  쓰기(admin): 서버 액션 → Supabase
   │  구독: Supabase Realtime (employees, tasks, task_logs)
   ▼
[Supabase Postgres] ◀──── [pg_cron: 근무시간마다 호출]
   ▲                              │
   │ 결과·토큰·상태 저장            ▼
[Edge Function: run-agent-tasks] ──▶ [LLM 어댑터] ──▶ Claude / GPT / Gemini API
```

- 3D 애니메이션은 클라이언트에서만 돈다. 상태(working, idle 등)만 DB에서 받아 애니메이션을 바꾼다.
- 작업 엔진만 DB의 작업 상태를 바꾼다. 클라이언트가 진행률을 가짜로 올리는 시뮬레이션은 만들지 않는다.

### 폴더 구조 (권장)

```
src/
  app/                  # 라우트 (login, signup, pending, office, admin/*)
  components/
    scene/              # 3D 컴포넌트. props만 받고 DB 호출·비즈니스 로직 금지
    ui/                 # 패널, 모달, KPI 카드
  lib/
    db/                 # 데이터 접근 함수 (모든 Supabase 쿼리는 여기)
    supabase/           # 클라이언트/서버 Supabase 생성
  stores/               # Zustand 스토어
  types/                # Supabase에서 생성한 타입 + 도메인 타입
supabase/
  migrations/
  functions/run-agent-tasks/
  seed.sql (또는 seed 스크립트)
```

## 6. 데이터 모델

모든 테이블에 `id uuid pk`, `created_at`, `updated_at`을 둔다. **모든 테이블에 RLS를 켠다.**

### profiles

| 컬럼         | 타입                              | 설명                |
| ------------ | --------------------------------- | ------------------- |
| id           | uuid                              | auth.users.id와 1:1 |
| email        | text                              |                     |
| display_name | text                              |                     |
| role         | enum(admin, member)               | 기본 member         |
| status       | enum(pending, approved, rejected) | 기본 pending        |
| approved_by  | uuid null                         | 승인한 admin        |
| approved_at  | timestamptz null                  |                     |

- 회원가입 시 트리거로 profiles 행을 자동 생성한다.
- 이메일이 `ADMIN_EMAIL`과 같으면 role=admin, status=approved로 만든다.

### departments

| 컬럼                   | 타입        | 설명                                |
| ---------------------- | ----------- | ----------------------------------- |
| name                   | text        | 개발, 디자인, 콘텐츠, 데이터, 재무  |
| slug                   | text unique | dev, design, content, data, finance |
| color                  | text        | 3D 구역 포인트 색                   |
| position_x, position_z | float       | 3D 구역 중심                        |
| width, depth           | float       | 3D 구역 크기                        |

### employees (AI 직원)

| 컬럼              | 타입                                 | 설명                              |
| ----------------- | ------------------------------------ | --------------------------------- |
| department_id     | uuid fk                              |                                   |
| name              | text                                 |                                   |
| role              | text                                 | 예: 프론트엔드 개발자, 카피라이터 |
| system_prompt     | text                                 | 이 직원의 역할 지시문             |
| model_id          | uuid fk → llm_models                 | 이 직원이 사용할 LLM 모델         |
| status            | enum(idle, working, resting, paused) |                                   |
| energy            | int 0~100                            | 연출용. 작업하면 감소, 쉬면 회복  |
| seat_x, seat_z    | float                                | 3D 좌석 위치                      |
| daily_token_limit | int                                  | 일일 토큰 한도                    |
| tokens_used_today | int                                  | 매일 0시(KST)에 초기화            |
| current_task_id   | uuid null                            |                                   |

### projects

| 컬럼              | 타입                         | 설명              |
| ----------------- | ---------------------------- | ----------------- |
| department_id     | uuid fk                      |                   |
| name, description | text                         |                   |
| status            | enum(planning, active, done) |                   |
| revenue           | numeric                      | 매출 기여 (KPI용) |

### tasks

| 컬럼                      | 타입                                | 설명                                  |
| ------------------------- | ----------------------------------- | ------------------------------------- |
| project_id                | uuid fk                             |                                       |
| assigned_employee_id      | uuid fk                             |                                       |
| title                     | text                                |                                       |
| instruction               | text                                | 작업 지시 내용                        |
| task_type                 | enum(simple, complex)               | simple: 분류·요약, complex: 기획·코드 |
| priority                  | int                                 | 높을수록 먼저                         |
| status                    | enum(queued, running, done, failed) |                                       |
| result                    | text null                           | LLM 결과물                            |
| error                     | text null                           |                                       |
| retry_count               | int                                 | 최대 2                                |
| token_input, token_output | int                                 |                                       |
| used_model_id             | uuid fk → llm_models null           | 실제로 호출한 모델 (비용 집계용)      |
| cost_usd                  | numeric                             |                                       |
| created_by                | uuid                                | 지시한 admin                          |
| started_at, completed_at  | timestamptz null                    |                                       |

### task_logs

| 컬럼                 | 타입                    | 설명 |
| -------------------- | ----------------------- | ---- |
| task_id, employee_id | uuid fk                 |      |
| level                | enum(info, warn, error) |      |
| message              | text                    |      |

### llm_models

| 컬럼                  | 타입                            | 설명                                              |
| --------------------- | ------------------------------- | ------------------------------------------------- |
| provider              | enum(anthropic, openai, google) | 제공사                                            |
| model_name            | text                            | 제공사 API에 보내는 실제 모델 ID                  |
| display_name          | text                            | 화면에 보여줄 이름                                |
| input_price_per_mtok  | numeric                         | 입력 100만 토큰당 USD                             |
| output_price_per_mtok | numeric                         | 출력 100만 토큰당 USD                             |
| tier                  | enum(fast, balanced, premium)   | 선택 화면에서 묶어 보여줄 등급                    |
| is_enabled            | bool                            | false면 선택 목록에서 숨기고 새 작업에 사용 안 함 |

- (provider, model_name)은 unique.
- 모델 ID와 단가는 바뀔 수 있으므로 시드에는 각 제공사의 현재 공식 문서를 확인해 넣고, 확인하지 못한 값은 추측하지 말고 TODO로 남긴다.

### llm_providers

제공사별 API 키 상태. **키 값 자체는 이 테이블에 저장하지 않는다.** 키는 Supabase Vault에 암호화해서 저장하고, 이 테이블에는 Vault 참조와 상태만 둔다.

| 컬럼             | 타입                               | 설명                                              |
| ---------------- | ---------------------------------- | ------------------------------------------------- |
| provider         | enum(anthropic, openai, google) pk | 제공사                                            |
| vault_secret_id  | uuid null                          | Vault에 저장된 키의 ID. null이면 키 없음          |
| key_hint         | text null                          | 화면 표시용. 키의 마지막 4자리만 (예: `••••a1b2`) |
| last_verified_at | timestamptz null                   | 마지막 연결 테스트 시각                           |
| last_verified_ok | bool null                          | 마지막 연결 테스트 성공 여부                      |
| updated_by       | uuid null                          | 마지막으로 키를 바꾼 admin                        |

### budget_settings (단일 행)

| 컬럼                     | 타입                 | 설명                                                       |
| ------------------------ | -------------------- | ---------------------------------------------------------- |
| monthly_budget_usd       | numeric              | 회사 월 예산                                               |
| work_hours               | jsonb                | 작업 엔진 실행 시각 목록 (KST), 기본 `["10:00", "16:00"]`  |
| default_model_simple_id  | uuid fk → llm_models | simple 작업 기본 모델 (직원 모델이 비활성화됐을 때 대체용) |
| default_model_complex_id | uuid fk → llm_models | complex 작업 기본 모델 (대체용)                            |
| max_tasks_per_run        | int                  | 한 번 실행에 처리할 최대 작업 수, 기본 10                  |
| global_paused            | bool                 | 전체 긴급 정지                                             |

### audit_logs

| 컬럼                   | 타입       | 설명                                                                                                                 |
| ---------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| actor_id               | uuid       |                                                                                                                      |
| action                 | text       | user.approve, user.reject, employee.create, employee.delete, task.create, budget.update, engine.run, engine.pause 등 |
| target_type, target_id | text, uuid |                                                                                                                      |
| metadata               | jsonb      |                                                                                                                      |

### RLS 요약

| 테이블                                                         | approved member | admin                              | pending/rejected |
| -------------------------------------------------------------- | --------------- | ---------------------------------- | ---------------- |
| profiles                                                       | 본인 행 읽기    | 전체 읽기·수정                     | 본인 행 읽기     |
| departments, employees, projects, tasks, task_logs, llm_models | 읽기            | 전체                               | 없음             |
| budget_settings                                                | 읽기            | 전체                               | 없음             |
| llm_providers                                                  | 없음            | 읽기 (쓰기는 §7.7의 서버 함수로만) | 없음             |
| audit_logs                                                     | 없음            | 읽기                               | 없음             |

- 작업 엔진(Edge Function)은 service role로 동작한다.
- 권한 체크용 SQL 함수 `is_admin()`, `is_approved()`를 만들어 정책에서 재사용한다.

## 7. 기능 요구사항

### 7.1 인증과 가입 승인

- 이메일/비밀번호 로그인, 회원가입
- 미들웨어로 라우트 보호:
  - 비로그인 → `/login`
  - pending → `/pending`, rejected → `/rejected`
  - `/admin/*`는 admin만
- `/admin/users`: 대기 중 가입자 목록(이메일, 가입일), 승인/거절 버튼, 승인된 사용자 목록
- 승인/거절은 audit_logs에 기록

### 7.2 3D 오피스 씬

- 아이소메트릭 카메라: 드래그로 이동, 휠로 확대/축소, 맵 경계 밖으로 못 나감
- 부서 구역(색 구분 바닥), 책상, 의자, 모니터, 화이트보드, 로우폴리 아바타를 DB 위치에 배치
- 부드러운 그림자, 따뜻한 실내 조명, 그리드 바닥
- 직원 상태별 애니메이션 (클라이언트 전용):
  - working: 책상에서 타이핑
  - idle: 자리에서 두리번
  - resting: 휴게 공간으로 이동
  - paused: 회색 처리, 정지
- 씬 컴포넌트는 props만 받는다. DB 호출, 비즈니스 로직 금지.

### 7.3 상호작용과 실시간 반영

- 아바타 또는 책상 클릭 → 외곽선 강조 + 오른쪽 사이드 패널
- 사이드 패널: 이름, 부서, 역할, 상태, 현재 작업, 에너지, 오늘 사용 토큰/한도, 최근 작업 로그, 완료 결과물 목록(클릭 시 전문 보기)
- Supabase Realtime으로 employees, tasks, task_logs 변경 구독 → Zustand 스토어 갱신 → 화면 반영
- 패널이 바뀌어도 3D 씬 전체가 다시 렌더링되면 안 된다. 바뀐 직원만 갱신한다.

### 7.4 관리자 기능 (admin만 보이고, 서버에서도 막음)

- **신규 AI 직원 채용 모달**: 부서, 이름, 역할, 시스템 프롬프트, LLM 모델, 일일 토큰 한도 → 저장 즉시 3D 씬에 아바타 생성. 좌석은 해당 부서 구역의 빈자리에 자동 배정
  - 모델 선택은 제공사(Claude / GPT / Gemini)별로 묶은 드롭다운. 각 항목에 등급(fast/balanced/premium)과 입력·출력 단가를 함께 표시
  - API 키가 등록되지 않은 제공사(`llm_providers.vault_secret_id`가 null)의 모델은 비활성화하고 "API 키 없음"으로 표시
  - 기존 직원의 모델도 수정 화면에서 바꿀 수 있음
- **작업 지시 모달**: 프로젝트, 담당 직원, 제목, 지시 내용, 작업 유형, 우선순위 → tasks에 queued로 추가
- 직원 일시정지/재개, 수정, 삭제 (삭제 시 확인 창)
- 작업 엔진 "지금 실행" 버튼, "전체 긴급 정지" 토글

### 7.5 AI 작업 엔진 (Edge Function `run-agent-tasks`)

실행 순서:

1. `budget_settings.global_paused`가 true면 즉시 종료
2. 이번 달 누적 비용이 `monthly_budget_usd` 이상이면 종료하고 warn 로그 기록
3. queued 작업을 priority 내림차순, created_at 오름차순으로 최대 `max_tasks_per_run`개 가져온다. `FOR UPDATE SKIP LOCKED`로 중복 실행을 막는다.
4. 각 작업마다:
   - 담당 직원이 paused거나 일일 한도를 넘었으면 건너뜀 (한도 초과 시 직원을 resting으로)
   - 작업 running, 직원 working으로 변경, task_logs 기록
   - 직원의 system_prompt + 작업 instruction으로 LLM 어댑터(§7.7)를 호출. 모델은 직원의 model_id → 그 모델이 비활성화됐으면 task_type별 기본 모델
   - 성공: result, 토큰, 비용 저장, done으로 변경, 직원 tokens_used_today 증가, 에너지 감소
   - 실패: retry_count < 2면 다시 queued, 아니면 failed + error 저장
   - 직원을 idle로 되돌림
5. **queued 작업이 없으면 LLM을 한 번도 호출하지 않는다.**

스케줄:

- pg_cron이 `work_hours` 시각(KST)에 Edge Function을 호출한다.
- 매일 0시(KST)에 모든 직원의 `tokens_used_today`를 0으로, resting 직원을 idle로 되돌린다.
- admin의 "지금 실행"은 같은 함수를 호출한다.

비용 계산:

- `llm_models`의 입력/출력 단가로 `cost_usd`를 계산한다. 작업에는 실제로 사용한 model_id도 함께 저장한다(`used_model_id`).

### 7.6 대시보드, KPI, 필터

- 상단 바: 부서 선택기. 바꾸면 카메라가 해당 구역으로 부드럽게 이동
- KPI 카드 (DB 기준 계산): 진행 중 프로젝트 수, 전체 작업 완료율, 직원 가동률(working 직원 / 전체 직원), 오늘 완료 작업 수, 총 매출
- 비용 카드: 이번 달 사용액 / 월 예산 게이지, 오늘 사용 토큰
- 필터: working만 보기, 선택 부서만 하이라이트, paused/resting 보기
- `/admin/costs`: 일별 비용 차트, 직원별·모델별 비용 순위, 실패 작업 목록, 예산·근무시간·기본 모델 설정 폼

### 7.7 멀티 LLM 지원

- Edge Function 안에 `llm/` 어댑터 모듈을 둔다. 외부에는 함수 하나만 노출한다:
  `generate({ provider, modelName, system, prompt, maxTokens }) → { text, inputTokens, outputTokens }`
- 내부 구현은 Vercel AI SDK의 제공사 패키지(Anthropic, OpenAI, Google)를 사용한다. 작업 엔진은 제공사를 몰라도 된다.
- 제공사별 API 키는 관리자 페이지에서 등록하고 Supabase Vault에 암호화해 저장한다 (§7.8). 작업 엔진은 실행할 때마다 Vault에서 키를 읽는다. 키가 없는 제공사의 모델이 배정된 작업은 failed 처리하고 "API 키 없음" 에러를 남긴다.
- 제공사별로 에러(요청 한도 초과, 서버 오류)를 공통 형식으로 바꿔서, 재시도 규칙(§7.5)이 똑같이 적용되게 한다.
- 새 제공사를 추가할 때 어댑터 파일 하나와 enum 값만 추가하면 되도록 만든다.
- admin 전용 `/admin/models` 페이지: 모델 목록, 추가·수정, 활성화 토글, 단가 수정

### 7.8 API 키 관리 (관리자 페이지)

화면 (`/admin/models` 상단의 "API 키" 섹션):

- 제공사(Claude / GPT / Gemini)마다 카드 하나
- 카드에 표시: 등록 여부, 키 힌트(`••••a1b2`), 마지막 연결 테스트 결과와 시각, 마지막으로 바꾼 사람
- 버튼: **키 등록/교체**(비밀번호 입력창), **연결 테스트**, **키 삭제**(확인 창)
- 저장 후에는 입력창을 비우고, 키 전체 값은 다시는 화면에 보여주지 않는다. 키를 잊었으면 교체만 가능

저장 흐름:

1. admin이 키 입력 → Next.js 서버 액션으로 전송 (클라이언트 상태나 localStorage에 남기지 않음)
2. 서버 액션이 요청자가 admin인지 확인
3. 서버 측(service role)에서 SQL 함수 `set_provider_key(provider, key)` 호출
   - Vault에 키가 없으면 `vault.create_secret`, 있으면 `vault.update_secret`
   - `llm_providers`에 vault_secret_id, key_hint(마지막 4자리), updated_by 저장
4. 저장 직후 자동으로 연결 테스트 실행
5. audit_logs에 `provider_key.set` 기록 (키 값은 절대 기록하지 않음, 제공사와 key_hint만)

삭제 흐름: `delete_provider_key(provider)` → Vault 비밀 삭제, vault_secret_id와 key_hint를 null로, audit_logs에 `provider_key.delete` 기록

연결 테스트: Edge Function `verify-provider-key`가 Vault에서 키를 읽어 해당 제공사에 가장 저렴한 최소 요청을 보내고, 결과를 `last_verified_at`, `last_verified_ok`에 저장. 실패 시 "키가 잘못됨 / 한도 초과 / 네트워크 오류"처럼 원인만 보여준다.

읽기 흐름: 작업 엔진은 SQL 함수 `get_provider_key(provider)`로 `vault.decrypted_secrets`에서 키를 읽는다.

보안 규칙:

- `set_provider_key`, `delete_provider_key`, `get_provider_key`는 `SECURITY DEFINER`로 만들고, `anon`과 `authenticated` 역할의 실행 권한을 회수(REVOKE)한다. **service role만 호출 가능**
- 키 값은 클라이언트로 응답하지 않는다. 서버 액션 응답에도, 에러 메시지에도, 로그에도 넣지 않는다
- 제공사 SDK의 에러 메시지에 키가 섞여 나올 수 있으므로, 저장 전에 키 패턴을 가린다
- 환경변수 키(§10)는 Vault에 키가 없을 때만 쓰는 대체용이다. 둘 다 있으면 Vault 키가 우선

### 7.9 디자인

- 다크 모던 테마, 시안/블루 네온 포인트
- UI 패널은 반투명 다크 배경, 얇은 시안 테두리
- 한국어 UI

## 8. 비기능 요구사항

- **성능**: 직원 30명이 움직여도 60 FPS. 반복 메쉬(책상, 의자, 모니터)는 인스턴싱. Realtime 업데이트 시 바뀐 객체만 리렌더링
- **보안**: 모든 테이블 RLS, 서버 측 권한 체크, 비밀 키 클라이언트 노출 금지. LLM API 키는 Vault에만 저장하고 한 번 저장된 키는 어떤 화면·API로도 다시 꺼낼 수 없어야 한다
- **비용 안전장치**: 전체 정지, 월 예산, 직원별 일일 한도, 실행당 최대 작업 수 네 겹으로 막는다
- **신뢰성**: 작업 엔진이 중간에 죽어도 running으로 30분 이상 남은 작업은 다음 실행 때 queued로 되돌린다
- **타입 안정성**: `any` 사용 금지. Supabase 타입은 CLI로 생성

## 9. 마일스톤

각 마일스톤은 별도 지시로 하나씩 진행한다.

### M1. 프로젝트 세팅 + DB

- Next.js, Tailwind, Supabase 클라이언트 세팅, `.env.example`
- §6 전체 테이블(llm_models 포함) 마이그레이션, enum, `is_admin()`/`is_approved()` 함수, RLS 정책
- 시드: LLM 모델(Claude, GPT, Gemini 각각 fast 1개 + premium 1개 이상), 부서 5, AI 직원 15(부서별 3, 역할별 시스템 프롬프트 포함), 프로젝트 8, queued 작업 20, budget_settings 1행
- 타입 생성(`src/types/`), 데이터 접근 함수(`src/lib/db/`)
- **완료 조건**: 마이그레이션과 시드가 오류 없이 적용됨 / 데이터 모델 설명 5줄 / 빌드·타입 체크 통과

### M2. 인증 + 가입 승인

- §7.1 전체
- **완료 조건**: ADMIN_EMAIL 계정이 admin으로 생성됨 / 일반 가입자는 /pending에서 막힘 / admin이 승인하면 오피스 접근 가능 / pending 계정으로 employees를 직접 쿼리해도 빈 결과 / 승인 기록이 audit_logs에 남음

### M3. 3D 오피스 씬

- §7.2 전체 (아직 클릭 상호작용 없음)
- **완료 조건**: 시드 데이터대로 5개 구역, 15명 아바타 배치 / 카메라 이동·확대·경계 제한 동작 / 상태별 애니메이션 확인 / 씬 컴포넌트에 Supabase import 없음

### M4. 상호작용 + 실시간 + 관리자 기능

- §7.3, §7.4 (엔진 실행 버튼은 M5에서 연결)
- **완료 조건**: 클릭 시 외곽선과 패널 표시 / 브라우저 두 개에서 한쪽이 직원을 만들면 다른 쪽에 즉시 나타남 / member 계정에는 관리자 버튼이 안 보이고, 서버 액션을 직접 호출해도 거부됨

### M5. AI 작업 엔진

- §7.5, §7.7(LLM 어댑터, /admin/models), §7.8(API 키 관리), 관리자 "지금 실행"·"긴급 정지" 연결
- **완료 조건**: "지금 실행" 시 queued 작업이 처리되어 result 저장 / 처리 중 3D 아바타가 working으로 바뀜 / queued가 없으면 LLM 호출 0회 / global_paused, 월 예산 초과, 일일 한도 초과 각각에서 호출이 멈추는 것 확인 / Claude, GPT, Gemini 모델을 쓰는 직원 각각 1명씩 작업이 정상 처리되고 비용이 모델 단가대로 계산됨 / 관리자 페이지에서 등록한 키로 작업이 처리되고, 연결 테스트 결과가 표시됨 / 키를 삭제하면 그 제공사 모델 작업이 failed + "API 키 없음" 처리 / member 계정으로 `get_provider_key`를 호출하면 거부됨 / 키 값이 audit_logs, task_logs, 에러 메시지 어디에도 없음 / API 키가 클라이언트 번들에 없음

### M6. 대시보드, KPI, 필터

- §7.6, §7.9
- **완료 조건**: KPI가 DB 값과 일치 / 부서 선택 시 카메라 이동 / 필터 동작 / /admin/costs에서 설정 변경이 엔진에 반영됨

### M7. 검토, 최적화, 보안 점검

- 버그, 성능 병목, 미사용 코드 정리 / 인스턴싱 적용 / 60 FPS 확인
- §8 체크리스트 전부 점검하고 결과를 표로 보고
- **완료 조건**: 빌드·타입 체크 통과 결과 출력 / 보안·비용 점검표 전 항목 통과

## 10. 환경변수 (.env.example)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # 서버 전용
ADMIN_EMAIL=
# 아래 LLM 키는 Supabase Edge Function 시크릿으로만 설정. Next.js에 두지 않음 (대체용)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
# 위 3개는 선택 사항. 보통은 관리자 페이지(§7.8)에서 등록하고, 비워 둬도 된다
```

## 11. 미결정 사항 (기본값으로 진행)

| 항목                | 기본값                                        |
| ------------------- | --------------------------------------------- |
| 근무시간            | 하루 2회, 10:00과 16:00 (KST)                 |
| 월 예산             | 10 USD로 시작                                 |
| 직원 일일 토큰 한도 | 50,000                                        |
| 실행당 최대 작업 수 | 10                                            |
| 시간대              | Asia/Seoul                                    |
| 결과물 형식         | 마크다운 텍스트                               |
| API 키 저장소       | Supabase Vault (환경변수는 대체용)            |
| 신규 직원 기본 모델 | balanced 등급 중 API 키가 설정된 첫 번째 모델 |
| 시드 직원 모델 배정 | 세 제공사에 골고루 나눠 배정 (테스트용)       |
