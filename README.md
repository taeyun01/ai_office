# AIOffice

LLM을 호출해 결과물을 만드는 AI 직원들을 3D 아이소메트릭 오피스에서 관리하는 웹 앱. 요구사항은 `docs/ai-office-prd.md`.

## 시작

```bash
cp .env.example .env.local   # Supabase URL / publishable key 입력
npm install
npm run dev
```

Supabase 쪽은 `supabase/migrations/*.sql`을 순서대로 적용하고 `supabase/seed.sql`을 실행한다. Edge Function은 `supabase/functions/*`를 배포한다 (`verify_jwt = false`, 함수 안에서 직접 인증).

직접 해야 하는 설정(리다이렉트 URL, LLM API 키 등)은 `docs/TODO-for-you.md`.

## 구조

- `app/` — 라우트. `login`, `signup`, `pending`, `rejected`, `office`(3D 오피스), `admin/users|models|costs`
- `components/scene/` — R3F 3D 컴포넌트. props만 받고 DB 호출 없음
- `components/office/` — 오피스 화면 UI (상단 바, KPI, 직원 패널, 관리자 툴바, 폼)
- `components/admin/` — 관리자 페이지 UI
- `lib/db/` — 모든 Supabase 쿼리. `lib/actions/` — 서버 액션(admin 권한 체크 + RLS 이중 차단)
- `lib/supabase/` — 클라이언트/서버/미들웨어 Supabase 생성. `lib/realtime.ts` — 실시간 구독 → `stores/office-store.ts`(Zustand)
- `supabase/functions/run-agent-tasks` — 작업 엔진(pg_cron 또는 "지금 실행"이 호출). `verify-provider-key` — API 키 등록/삭제/검증(Vault)
- `types/database.ts` — Supabase 생성 타입 (`npx supabase gen types` 또는 MCP)

## 권한

- `admin`: 모든 것. `member`(승인됨): 읽기 전용. `pending`/`rejected`: 안내 화면만.
- 첫 관리자 이메일은 `supabase/migrations/20261013000001_init.sql`의 `handle_new_user()`에 하드코딩.
