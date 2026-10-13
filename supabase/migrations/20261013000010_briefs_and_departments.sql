-- 브리프(팀에 맡기기) + 새 부서 실시간 반영

-- 채용 모달에서 만든 부서가 모든 접속자 씬에 바로 나타나도록
alter publication supabase_realtime add table departments;

-- 대표가 준 브리프와 AI 팀장(PM)이 세운 분배 계획. 계획 단계 LLM 비용도 여기 기록한다.
create table briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  brief text not null,
  plan jsonb not null default '{}',
  status text not null default 'planned' check (status in ('planned', 'applied')),
  model_id uuid references llm_models(id),
  token_input int not null default 0,
  token_output int not null default 0,
  cost_usd numeric not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on briefs for each row execute function set_updated_at();
create index briefs_project_id_idx on briefs (project_id);

alter table briefs enable row level security;
create policy "briefs: approved read" on briefs for select using (is_approved());
create policy "briefs: admin insert" on briefs for insert with check (is_admin());
create policy "briefs: admin update" on briefs for update using (is_admin()) with check (is_admin());
create policy "briefs: admin delete" on briefs for delete using (is_admin());

alter table tasks add column brief_id uuid references briefs(id) on delete set null;
create index tasks_brief_id_idx on tasks (brief_id);

-- 월 비용 = 작업 비용 + 계획 단계 비용
create or replace function month_cost_usd()
returns numeric language sql security definer stable set search_path = public as $$
  with since as (select date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' as t)
  select
    coalesce((select sum(cost_usd) from tasks, since where completed_at >= since.t), 0)
    + coalesce((select sum(cost_usd) from briefs, since where created_at >= since.t), 0);
$$;
revoke execute on function month_cost_usd() from anon, authenticated, public;
