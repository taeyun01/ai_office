-- 프로젝트(workspaces) = 오피스 하나 + GitHub 저장소 하나.
-- 부서·직원·업무(projects)·작업·로그·브리프·예산이 전부 프로젝트에 속한다. 기존 데이터는 기본 프로젝트로 옮긴다.
-- (DB의 projects 테이블은 화면에서 "업무"라고 부른다)

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  github_repo text check (github_repo is null or github_repo ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on workspaces for each row execute function set_updated_at();
alter table workspaces enable row level security;
create policy "workspaces: approved read" on workspaces for select using (is_approved());
create policy "workspaces: admin insert" on workspaces for insert with check (is_admin());
create policy "workspaces: admin update" on workspaces for update using (is_admin()) with check (is_admin());
create policy "workspaces: admin delete" on workspaces for delete using (is_admin());

-- 기존 데이터를 기본 프로젝트로
do $$
declare
  ws uuid;
  t text;
begin
  insert into workspaces (name, description) values ('AI 오피스', '처음 만든 기본 오피스') returning id into ws;
  foreach t in array array['departments','employees','projects','tasks','task_logs','briefs','budget_settings'] loop
    execute format('alter table %I add column workspace_id uuid references workspaces(id) on delete cascade', t);
    execute format('update %I set workspace_id = %L', t, ws);
    execute format('alter table %I alter column workspace_id set not null', t);
    execute format('create index %I on %I (workspace_id)', t || '_workspace_id_idx', t);
  end loop;
end $$;

-- 예산 설정: 전역 1행 → 프로젝트마다 1행
alter table budget_settings drop column singleton;
alter table budget_settings add constraint budget_settings_workspace_unique unique (workspace_id);

-- 부서 slug는 프로젝트 안에서만 유일
alter table departments drop constraint departments_slug_key;
alter table departments add constraint departments_workspace_slug_unique unique (workspace_id, slug);

-- 하위 테이블의 workspace_id는 부모에서 자동으로 채운다 (다른 프로젝트 데이터와 섞이지 않게 DB에서 보장)
create or replace function set_workspace_from_department() returns trigger
language plpgsql set search_path = public as $$
begin
  select workspace_id into new.workspace_id from departments where id = new.department_id;
  return new;
end $$;
create trigger employees_workspace before insert or update of department_id on employees
  for each row execute function set_workspace_from_department();
create trigger projects_workspace before insert or update of department_id on projects
  for each row execute function set_workspace_from_department();

create or replace function set_task_workspace() returns trigger
language plpgsql set search_path = public as $$
declare
  emp_ws uuid;
begin
  select workspace_id into new.workspace_id from projects where id = new.project_id;
  select workspace_id into emp_ws from employees where id = new.assigned_employee_id;
  if emp_ws is distinct from new.workspace_id then
    raise exception '업무와 담당 직원이 서로 다른 프로젝트에 속해 있습니다.';
  end if;
  return new;
end $$;
create trigger tasks_workspace before insert or update of project_id, assigned_employee_id on tasks
  for each row execute function set_task_workspace();

create or replace function set_workspace_from_task() returns trigger
language plpgsql set search_path = public as $$
begin
  select workspace_id into new.workspace_id from tasks where id = new.task_id;
  return new;
end $$;
create trigger task_logs_workspace before insert on task_logs
  for each row execute function set_workspace_from_task();

create or replace function set_workspace_from_project() returns trigger
language plpgsql set search_path = public as $$
begin
  select workspace_id into new.workspace_id from projects where id = new.project_id;
  return new;
end $$;
create trigger briefs_workspace before insert on briefs
  for each row execute function set_workspace_from_project();

-- 엔진 함수: 프로젝트 단위
drop function claim_tasks(int);
create or replace function claim_tasks(p_limit int, p_workspace uuid)
returns setof tasks language sql security definer set search_path = public as $$
  update tasks t set status = 'running', started_at = now()
  where t.id in (
    select t2.id from tasks t2
    join employees e on e.id = t2.assigned_employee_id
    where t2.workspace_id = p_workspace
      and t2.status = 'queued'
      and e.status <> 'paused'
      and e.tokens_used_today < e.daily_token_limit
    order by t2.priority desc, t2.created_at
    limit p_limit
    for update of t2 skip locked
  )
  returning t.*;
$$;

drop function month_cost_usd();
create or replace function month_cost_usd(p_workspace uuid)
returns numeric language sql security definer stable set search_path = public as $$
  with since as (select date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' as t)
  select
    coalesce((select sum(cost_usd) from tasks, since where workspace_id = p_workspace and completed_at >= since.t), 0)
    + coalesce((select sum(cost_usd) from briefs, since where workspace_id = p_workspace and created_at >= since.t), 0);
$$;

revoke execute on function claim_tasks(int, uuid) from anon, authenticated, public;
revoke execute on function month_cost_usd(uuid) from anon, authenticated, public;

-- 스케줄: 프로젝트별 근무시간마다 engine-<프로젝트id 앞 8자>-HHMM 잡
create or replace function sync_engine_schedule()
returns void language plpgsql security definer set search_path = public, cron as $$
declare
  j record;
  b record;
  h text;
  hh int; mm int;
begin
  for j in select jobname from cron.job where jobname like 'engine-%' loop
    perform cron.unschedule(j.jobname);
  end loop;
  for b in select workspace_id, work_hours from budget_settings loop
    for h in select jsonb_array_elements_text(b.work_hours) loop
      hh := split_part(h, ':', 1)::int; mm := split_part(h, ':', 2)::int;
      perform cron.schedule(
        'engine-' || left(b.workspace_id::text, 8) || '-' || replace(h, ':', ''),
        format('%s %s * * *', mm, (hh + 15) % 24),   -- KST → UTC
        format($cmd$
          select net.http_post(
            url := engine_url(),
            headers := jsonb_build_object('Content-Type', 'application/json', 'x-engine-secret', get_engine_secret()),
            body := jsonb_build_object('source', 'cron', 'workspace_id', %L),
            timeout_milliseconds := 10000
          );
        $cmd$, b.workspace_id)
      );
    end loop;
  end loop;
end $$;

drop trigger budget_settings_sync_schedule on budget_settings;
drop function on_budget_settings_changed();
create or replace function on_budget_settings_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform sync_engine_schedule();
  return null;
end $$;
create trigger budget_settings_sync_schedule
  after insert or delete or update of work_hours on budget_settings
  for each statement execute function on_budget_settings_changed();
revoke execute on function on_budget_settings_changed() from anon, authenticated, public;
revoke execute on function sync_engine_schedule() from anon, authenticated, public;

select sync_engine_schedule();

-- 새 프로젝트 기본 팀: 5개 부서 + 15명 + 예산 설정. admin 권한(RLS)으로 실행된다.
create or replace function seed_workspace(p_workspace uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  fallback uuid := (select id from llm_models where is_enabled order by tier limit 1);
begin
  insert into departments (workspace_id, name, slug, color, position_x, position_z, width, depth) values
    (p_workspace, '개발',   'dev',     '#38bdf8', -12, -6, 10, 8),
    (p_workspace, '디자인', 'design',  '#f472b6',   0, -6, 10, 8),
    (p_workspace, '콘텐츠', 'content', '#fbbf24',  12, -6, 10, 8),
    (p_workspace, '데이터', 'data',    '#34d399',  -6,  6, 10, 8),
    (p_workspace, '재무',   'finance', '#a78bfa',   6,  6, 10, 8);

  insert into employees (department_id, name, role, system_prompt, model_id, seat_x, seat_z)
  select d.id, e.name, e.role, e.system_prompt, coalesce(m.id, fallback), d.position_x + e.dx, d.position_z
  from (values
    ('dev', '김민준', '프론트엔드 개발자', '당신은 React/Next.js 프론트엔드 개발자입니다. 요청받은 UI를 TypeScript 코드로 작성하고, 접근성과 성능을 고려하며, 결과는 마크다운 코드 블록으로 제출합니다.', 'claude-sonnet-5-5', -3),
    ('dev', '이서연', '백엔드 개발자', '당신은 Postgres/Supabase 백엔드 개발자입니다. 스키마, SQL, 서버 로직을 설계하고 보안(RLS)을 항상 고려합니다. 결과는 마크다운으로 제출합니다.', 'claude-sonnet-5-5', 0),
    ('dev', '박도윤', 'QA 엔지니어', '당신은 QA 엔지니어입니다. 기능 명세를 읽고 테스트 케이스와 예상 결과를 표로 정리하며, 엣지 케이스를 빠짐없이 찾습니다.', 'claude-haiku-5-5', 3),
    ('design', '최하은', 'UI 디자이너', '당신은 UI 디자이너입니다. 화면 구성, 컴포넌트 명세, 색상·타이포 가이드를 텍스트로 상세히 작성합니다. 다크 모던 테마를 기본으로 합니다.', 'claude-sonnet-5-5', -3),
    ('design', '정지호', 'UX 리서처', '당신은 UX 리서처입니다. 사용자 시나리오와 페르소나를 만들고, 사용성 문제를 찾아 개선안을 우선순위와 함께 제시합니다.', 'claude-haiku-5-5', 0),
    ('design', '강수아', '브랜드 디자이너', '당신은 브랜드 디자이너입니다. 브랜드 톤앤매너, 로고 콘셉트, 네이밍 아이디어를 제안하고 근거를 설명합니다.', 'claude-sonnet-5-5', 3),
    ('content', '윤예준', '카피라이터', '당신은 카피라이터입니다. 짧고 임팩트 있는 한국어 카피를 여러 안으로 제시하고, 각 안의 의도를 한 줄로 설명합니다.', 'claude-haiku-5-5', -3),
    ('content', '임시우', '블로그 에디터', '당신은 테크 블로그 에디터입니다. 주제를 받으면 제목, 목차, 본문 초안을 마크다운으로 작성합니다. 과장 없이 정확하게 씁니다.', 'claude-sonnet-5-5', 0),
    ('content', '한지아', 'SNS 마케터', '당신은 SNS 마케터입니다. 플랫폼별(인스타그램, X, 링크드인) 게시물 초안과 해시태그를 제안합니다.', 'claude-haiku-5-5', 3),
    ('data', '오준서', '데이터 분석가', '당신은 데이터 분석가입니다. 주어진 데이터나 질문에 대해 분석 계획, SQL 쿼리, 해석을 마크다운으로 작성합니다.', 'claude-sonnet-5-5', -3),
    ('data', '서하린', 'ML 엔지니어', '당신은 ML 엔지니어입니다. 문제에 맞는 모델링 접근법을 제안하고, 평가 지표와 리스크를 함께 설명합니다.', 'claude-sonnet-5-5', 0),
    ('data', '신은우', '데이터 엔지니어', '당신은 데이터 엔지니어입니다. 파이프라인 설계, 스키마, 데이터 품질 체크 방안을 제시합니다.', 'claude-haiku-5-5', 3),
    ('finance', '권시윤', '재무 분석가', '당신은 재무 분석가입니다. 비용·매출 자료를 받아 요약, 추세, 리스크를 표와 함께 정리합니다.', 'claude-haiku-5-5', -3),
    ('finance', '황다은', '예산 관리자', '당신은 예산 관리자입니다. 예산 계획을 세우고 지출 항목을 분류하며, 절감 가능한 항목을 제안합니다.', 'claude-haiku-5-5', 0),
    ('finance', '조태양', '회계 담당자', '당신은 회계 담당자입니다. 거래 내역을 분류하고 월간 결산 요약을 작성합니다. 숫자는 반드시 검산합니다.', 'claude-haiku-5-5', 3)
  ) as e(dept, name, role, system_prompt, model_name, dx)
  join departments d on d.workspace_id = p_workspace and d.slug = e.dept
  left join llm_models m on m.model_name = e.model_name and m.is_enabled;

  insert into budget_settings (workspace_id, default_model_simple_id, default_model_complex_id)
  values (
    p_workspace,
    (select id from llm_models where model_name = 'claude-haiku-5-5'),
    (select id from llm_models where model_name = 'claude-sonnet-5-5')
  );
end $$;
revoke execute on function seed_workspace(uuid) from anon, public;
