-- M1 시드: 모델, 부서, 직원 15, 프로젝트 8, 작업 20, 예산 1행
-- 여러 번 실행해도 안전하도록 기존 행은 건너뜀

-- LLM 모델 (단가: USD / 100만 토큰)
insert into llm_models (provider, model_name, display_name, input_price_per_mtok, output_price_per_mtok, tier) values
  ('anthropic', 'claude-haiku-5-5',  'Claude Haiku 5.5',  0.10, 0.50,  'fast'),
  ('anthropic', 'claude-sonnet-5-5', 'Claude Sonnet 5.5', 2.00, 10.00, 'balanced'),
  ('anthropic', 'claude-opus-5-5',   'Claude Opus 5.5',   4.00, 20.00, 'premium'),
  -- TODO: OpenAI 모델 ID·단가는 공식 페이지(platform.openai.com/docs/pricing)에서 확인 필요. 출처별로 값이 다름
  ('openai',    'gpt-5.6-luna',      'GPT-5.6 Luna',      0.20, 1.20,  'fast'),
  ('openai',    'gpt-5.6-sol',       'GPT-5.6 Sol',       4.00, 20.00, 'premium'),
  -- TODO: Gemini 모델 ID는 공식 페이지(ai.google.dev/gemini-api/docs/pricing)에서 확인 필요
  ('google',    'gemini-3-flash',    'Gemini 3 Flash',    0.50, 3.00,  'fast'),
  ('google',    'gemini-3.1-pro',    'Gemini 3.1 Pro',    2.00, 12.00, 'premium')
on conflict (provider, model_name) do nothing;

insert into llm_providers (provider) values ('anthropic'), ('openai'), ('google')
on conflict do nothing;

-- 부서 (3D 구역)
insert into departments (name, slug, color, position_x, position_z, width, depth) values
  ('개발',   'dev',     '#38bdf8', -12, -6, 10, 8),
  ('디자인', 'design',  '#f472b6',   0, -6, 10, 8),
  ('콘텐츠', 'content', '#fbbf24',  12, -6, 10, 8),
  ('데이터', 'data',    '#34d399',  -6,  6, 10, 8),
  ('재무',   'finance', '#a78bfa',   6,  6, 10, 8)
on conflict (slug) do nothing;

-- AI 직원 15명 (부서별 3, 세 제공사에 골고루 배정)
insert into employees (department_id, name, role, system_prompt, model_id, seat_x, seat_z)
select d.id, e.name, e.role, e.system_prompt, m.id, d.position_x + e.dx, d.position_z + e.dz
from (values
  ('dev', '김민준', '프론트엔드 개발자', '당신은 React/Next.js 프론트엔드 개발자입니다. 요청받은 UI를 TypeScript 코드로 작성하고, 접근성과 성능을 고려하며, 결과는 마크다운 코드 블록으로 제출합니다.', 'anthropic', 'claude-sonnet-5-5', -3, 0),
  ('dev', '이서연', '백엔드 개발자', '당신은 Postgres/Supabase 백엔드 개발자입니다. 스키마, SQL, 서버 로직을 설계하고 보안(RLS)을 항상 고려합니다. 결과는 마크다운으로 제출합니다.', 'openai', 'gpt-5.6-sol', 0, 0),
  ('dev', '박도윤', 'QA 엔지니어', '당신은 QA 엔지니어입니다. 기능 명세를 읽고 테스트 케이스와 예상 결과를 표로 정리하며, 엣지 케이스를 빠짐없이 찾습니다.', 'google', 'gemini-3-flash', 3, 0),
  ('design', '최하은', 'UI 디자이너', '당신은 UI 디자이너입니다. 화면 구성, 컴포넌트 명세, 색상·타이포 가이드를 텍스트로 상세히 작성합니다. 다크 모던 테마를 기본으로 합니다.', 'anthropic', 'claude-sonnet-5-5', -3, 0),
  ('design', '정지호', 'UX 리서처', '당신은 UX 리서처입니다. 사용자 시나리오와 페르소나를 만들고, 사용성 문제를 찾아 개선안을 우선순위와 함께 제시합니다.', 'openai', 'gpt-5.6-luna', 0, 0),
  ('design', '강수아', '브랜드 디자이너', '당신은 브랜드 디자이너입니다. 브랜드 톤앤매너, 로고 콘셉트, 네이밍 아이디어를 제안하고 근거를 설명합니다.', 'google', 'gemini-3.1-pro', 3, 0),
  ('content', '윤예준', '카피라이터', '당신은 카피라이터입니다. 짧고 임팩트 있는 한국어 카피를 여러 안으로 제시하고, 각 안의 의도를 한 줄로 설명합니다.', 'anthropic', 'claude-haiku-5-5', -3, 0),
  ('content', '임시우', '블로그 에디터', '당신은 테크 블로그 에디터입니다. 주제를 받으면 제목, 목차, 본문 초안을 마크다운으로 작성합니다. 과장 없이 정확하게 씁니다.', 'openai', 'gpt-5.6-sol', 0, 0),
  ('content', '한지아', 'SNS 마케터', '당신은 SNS 마케터입니다. 플랫폼별(인스타그램, X, 링크드인) 게시물 초안과 해시태그를 제안합니다.', 'google', 'gemini-3-flash', 3, 0),
  ('data', '오준서', '데이터 분석가', '당신은 데이터 분석가입니다. 주어진 데이터나 질문에 대해 분석 계획, SQL 쿼리, 해석을 마크다운으로 작성합니다.', 'anthropic', 'claude-opus-5-5', -3, 0),
  ('data', '서하린', 'ML 엔지니어', '당신은 ML 엔지니어입니다. 문제에 맞는 모델링 접근법을 제안하고, 평가 지표와 리스크를 함께 설명합니다.', 'openai', 'gpt-5.6-luna', 0, 0),
  ('data', '신은우', '데이터 엔지니어', '당신은 데이터 엔지니어입니다. 파이프라인 설계, 스키마, 데이터 품질 체크 방안을 제시합니다.', 'google', 'gemini-3.1-pro', 3, 0),
  ('finance', '권시윤', '재무 분석가', '당신은 재무 분석가입니다. 비용·매출 자료를 받아 요약, 추세, 리스크를 표와 함께 정리합니다.', 'anthropic', 'claude-haiku-5-5', -3, 0),
  ('finance', '황다은', '예산 관리자', '당신은 예산 관리자입니다. 예산 계획을 세우고 지출 항목을 분류하며, 절감 가능한 항목을 제안합니다.', 'openai', 'gpt-5.6-luna', 0, 0),
  ('finance', '조태양', '회계 담당자', '당신은 회계 담당자입니다. 거래 내역을 분류하고 월간 결산 요약을 작성합니다. 숫자는 반드시 검산합니다.', 'google', 'gemini-3-flash', 3, 0)
) as e(dept, name, role, system_prompt, provider, model_name, dx, dz)
join departments d on d.slug = e.dept
join llm_models m on m.provider = e.provider::llm_provider and m.model_name = e.model_name
where not exists (select 1 from employees x where x.name = e.name);

-- 프로젝트 8
insert into projects (department_id, name, description, status, revenue)
select d.id, p.name, p.description, p.status::project_status, p.revenue
from (values
  ('dev',     '오피스 웹앱 v1',     'AI 오피스 관리 웹앱 첫 버전',           'active',   0),
  ('dev',     '모바일 반응형 대응', '데스크톱 UI를 모바일에서도 깨지지 않게', 'planning', 0),
  ('design',  '디자인 시스템',     '다크 모던 테마 컴포넌트 가이드',         'active',   0),
  ('content', '런칭 블로그 시리즈', '제품 소개 블로그 4편',                   'active',   1200),
  ('content', 'SNS 캠페인 10월',   '10월 SNS 게시물 기획',                   'planning', 800),
  ('data',    '비용 대시보드',     'LLM 비용 분석 리포트',                   'active',   0),
  ('data',    '사용자 행동 분석',   '초기 사용자 행동 로그 분석',             'planning', 0),
  ('finance', '4분기 예산 계획',   '4분기 LLM·인프라 예산',                  'active',   3500)
) as p(dept, name, description, status, revenue)
join departments d on d.slug = p.dept
where not exists (select 1 from projects x where x.name = p.name);

-- 작업 20 (전부 queued)
insert into tasks (project_id, assigned_employee_id, title, instruction, task_type, priority)
select p.id, e.id, t.title, t.instruction, t.task_type::task_type, t.priority
from (values
  ('오피스 웹앱 v1', '김민준', '사이드 패널 컴포넌트 명세', '직원 상세 사이드 패널의 props와 상태 구조를 TypeScript 인터페이스로 설계하라.', 'complex', 5),
  ('오피스 웹앱 v1', '이서연', '작업 큐 조회 SQL', 'priority 내림차순, created_at 오름차순으로 queued 작업을 가져오는 SQL을 작성하라. FOR UPDATE SKIP LOCKED 포함.', 'complex', 5),
  ('오피스 웹앱 v1', '박도윤', '로그인 플로우 테스트 케이스', '이메일 로그인, 가입 승인 대기, 거절 화면에 대한 테스트 케이스를 표로 정리하라.', 'simple', 3),
  ('모바일 반응형 대응', '김민준', '반응형 브레이크포인트 제안', '데스크톱 우선 UI에 적용할 Tailwind 브레이크포인트 전략을 제안하라.', 'simple', 1),
  ('모바일 반응형 대응', '박도윤', '모바일 깨짐 체크리스트', '모바일에서 확인해야 할 레이아웃 깨짐 항목을 체크리스트로 작성하라.', 'simple', 1),
  ('디자인 시스템', '최하은', '버튼 컴포넌트 가이드', '다크 모던 테마의 버튼 variant(primary, ghost, danger)와 상태별 색상을 정의하라.', 'complex', 4),
  ('디자인 시스템', '강수아', '브랜드 컬러 팔레트', '시안/블루 네온 포인트를 쓰는 브랜드 팔레트를 HEX 코드와 함께 제안하라.', 'simple', 3),
  ('디자인 시스템', '정지호', '온보딩 사용성 점검', '신규 사용자가 가입부터 오피스 진입까지 겪는 흐름의 사용성 문제를 찾아라.', 'complex', 2),
  ('런칭 블로그 시리즈', '임시우', '1편: AI 오피스 소개', 'AI 직원을 3D 오피스에서 관리하는 제품 소개 글 초안을 작성하라.', 'complex', 4),
  ('런칭 블로그 시리즈', '임시우', '2편: 작업 엔진 동작 원리', '정해진 근무시간에만 LLM을 호출하는 작업 엔진의 원리를 설명하는 글을 작성하라.', 'complex', 3),
  ('런칭 블로그 시리즈', '윤예준', '블로그 시리즈 제목 카피', '런칭 블로그 시리즈 제목 카피를 5안 제시하라.', 'simple', 2),
  ('SNS 캠페인 10월', '한지아', '인스타그램 게시물 3개', '제품 런칭을 알리는 인스타그램 게시물 3개와 해시태그를 작성하라.', 'simple', 2),
  ('SNS 캠페인 10월', '윤예준', '캠페인 슬로건', '10월 캠페인 슬로건을 5안 제시하라.', 'simple', 1),
  ('비용 대시보드', '오준서', '일별 비용 집계 쿼리', 'tasks 테이블에서 일별·모델별 cost_usd 합계를 구하는 SQL을 작성하라.', 'complex', 5),
  ('비용 대시보드', '신은우', '비용 데이터 품질 체크', 'cost_usd와 토큰 수의 정합성을 검증하는 체크 항목을 설계하라.', 'simple', 2),
  ('사용자 행동 분석', '서하린', '행동 로그 분석 접근법', '초기 사용자의 행동 로그로 이탈 원인을 찾는 분석 접근법을 제안하라.', 'complex', 1),
  ('사용자 행동 분석', '오준서', '핵심 지표 정의', '사용자 행동 분석에 쓸 핵심 지표 5개를 정의하고 계산식을 적어라.', 'simple', 1),
  ('4분기 예산 계획', '권시윤', '3분기 비용 요약', '3분기 LLM 비용 추세를 요약하고 리스크를 정리하라.', 'simple', 3),
  ('4분기 예산 계획', '황다은', '4분기 예산안 초안', '월 10 USD 예산을 기준으로 4분기 LLM 예산 배분안을 작성하라.', 'complex', 4),
  ('4분기 예산 계획', '조태양', '9월 결산 요약', '9월 거래 내역을 분류하고 결산 요약을 작성하라.', 'simple', 2)
) as t(project, employee, title, instruction, task_type, priority)
join projects p on p.name = t.project
join employees e on e.name = t.employee
where not exists (select 1 from tasks x where x.title = t.title);

-- 예산 설정 1행
insert into budget_settings (default_model_simple_id, default_model_complex_id)
select
  (select id from llm_models where model_name = 'claude-haiku-5-5'),
  (select id from llm_models where model_name = 'claude-sonnet-5-5')
where not exists (select 1 from budget_settings);
