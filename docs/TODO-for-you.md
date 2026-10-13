# 직접 해야 할 일

Claude가 대신 할 수 없는 항목. 끝낸 건 체크하세요.

## Supabase 대시보드

- [ ] **Authentication → URL Configuration → Redirect URLs**에 `http://localhost:3000/auth/callback` 추가 (배포 후 `https://<도메인>/auth/callback`도). 없으면 가입 확인 메일 링크가 돌아오지 않음.
- [ ] 배포 시 `NEXT_PUBLIC_SITE_URL`을 배포 도메인으로 설정 (가입 확인 메일 링크의 복귀 주소).

- [ ] **Authentication → Settings → Password Security**에서 "Leaked password protection" 켜기 (보안 어드바이저 경고).

## Claude Code 설정

- [ ] Supabase MCP의 "destructive operations" 확인창은 MCP 서버가 띄우는 것이라 Claude가 끌 수 없습니다. Claude는 DELETE/DROP을 최대한 피하도록 작업합니다. 그래도 줄이고 싶으면 Claude Code에서 `/permissions` → Allow에 `mcp__supabase__execute_sql`, `mcp__supabase__apply_migration` 추가 (Claude Code 쪽 확인은 사라지지만 MCP 서버 쪽 확인은 남을 수 있음).

## LLM 모델 단가 확인 (M1 시드)

검색 결과가 출처마다 달라서 아래 값은 확인이 필요합니다. 공식 페이지에서 확인 후 `/admin/models`(M5에서 생성)에서 고치거나 `supabase/seed.sql`을 수정하세요.

| 제공사 | 모델 ID(시드) | 입력 $/1M | 출력 $/1M | 확인처 |
|---|---|---|---|---|
| OpenAI | `gpt-5.6-luna` | 0.20 | 1.20 | platform.openai.com/docs/pricing |
| OpenAI | `gpt-5.6-sol` | 4.00 | 20.00 | 〃 (프로모션 단가일 수 있음) |
| Google | `gemini-3-flash` | 0.50 | 3.00 | ai.google.dev/gemini-api/docs/pricing |
| Google | `gemini-3.1-pro` | 2.00 | 12.00 | 〃 |

Claude 3개(`claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`)는 공식 단가라 확인 불필요.

## LLM API 키 등록 (M5 — 실제 LLM 호출 확인에 필요)

Claude가 가짜 키로 "키가 잘못됨" 경로까지는 확인했지만, 실제 결과물 생성은 진짜 키가 있어야 합니다.

- [ ] `/admin/models` 상단 "API 키" 카드에서 Claude / GPT / Gemini 키 등록 (등록 직후 연결 테스트가 자동 실행됨)
- [ ] 연결 테스트가 "성공"이면 오피스 화면의 **지금 실행** 버튼 클릭 → 작업이 `done`으로 바뀌고 직원 패널 "완료 결과물"에 나타나는지 확인
- [ ] 세 제공사 모두 등록하면 시드 직원이 제공사별로 나뉘어 있으니 각각 1명 이상 처리되는지 확인 (M5 완료 조건)
- [ ] 비용은 `llm_models` 단가로 계산됩니다. OpenAI/Gemini 단가·모델 ID가 위 표의 추정값이면 먼저 수정하세요. 모델 ID가 틀리면 작업이 "키가 잘못됨"이 아닌 다른 에러로 실패합니다.
- 키는 Supabase Vault에만 저장되고, Next.js 환경변수(`SUPABASE_SERVICE_ROLE_KEY`)는 현재 필요 없습니다.

## 테스트 계정

- Claude가 브라우저 검증용으로 `qa-admin@example.com`(admin), `qa-member@example.com`(member) 계정을 DB에 직접 만들었습니다. 비밀번호는 `.env.local`의 `E2E_ADMIN_PASSWORD` / `E2E_MEMBER_PASSWORD`. **운영 배포 전에 두 계정을 삭제하세요** (Authentication → Users).
