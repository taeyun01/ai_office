-- M1: 스키마 전체 (enum, 테이블, 권한 함수, RLS, 프로필 트리거)

-- enums
create type user_role as enum ('admin', 'member');
create type user_status as enum ('pending', 'approved', 'rejected');
create type employee_status as enum ('idle', 'working', 'resting', 'paused');
create type project_status as enum ('planning', 'active', 'done');
create type task_type as enum ('simple', 'complex');
create type task_status as enum ('queued', 'running', 'done', 'failed');
create type log_level as enum ('info', 'warn', 'error');
create type llm_provider as enum ('anthropic', 'openai', 'google');
create type model_tier as enum ('fast', 'balanced', 'premium');

-- updated_at 자동 갱신
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 테이블
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role user_role not null default 'member',
  status user_status not null default 'pending',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text not null,
  position_x float not null default 0,
  position_z float not null default 0,
  width float not null default 10,
  depth float not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table llm_models (
  id uuid primary key default gen_random_uuid(),
  provider llm_provider not null,
  model_name text not null,
  display_name text not null,
  input_price_per_mtok numeric not null,
  output_price_per_mtok numeric not null,
  tier model_tier not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, model_name)
);

create table llm_providers (
  provider llm_provider primary key,
  vault_secret_id uuid,
  key_hint text,
  last_verified_at timestamptz,
  last_verified_ok boolean,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  name text not null,
  role text not null,
  system_prompt text not null,
  model_id uuid not null references llm_models(id),
  status employee_status not null default 'idle',
  energy int not null default 100 check (energy between 0 and 100),
  seat_x float not null default 0,
  seat_z float not null default 0,
  daily_token_limit int not null default 50000,
  tokens_used_today int not null default 0,
  current_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  name text not null,
  description text,
  status project_status not null default 'planning',
  revenue numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  assigned_employee_id uuid not null references employees(id),
  title text not null,
  instruction text not null,
  task_type task_type not null default 'simple',
  priority int not null default 0,
  status task_status not null default 'queued',
  result text,
  error text,
  retry_count int not null default 0,
  token_input int not null default 0,
  token_output int not null default 0,
  used_model_id uuid references llm_models(id),
  cost_usd numeric not null default 0,
  created_by uuid references profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table employees
  add constraint employees_current_task_fk
  foreign key (current_task_id) references tasks(id) on delete set null;

create table task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  level log_level not null default 'info',
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table budget_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  monthly_budget_usd numeric not null default 10,
  work_hours jsonb not null default '["10:00", "16:00"]',
  default_model_simple_id uuid references llm_models(id),
  default_model_complex_id uuid references llm_models(id),
  max_tasks_per_run int not null default 10,
  global_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on tasks (status, priority desc, created_at);
create index on tasks (assigned_employee_id);
create index on task_logs (task_id);
create index on employees (department_id);

do $$
declare t text;
begin
  foreach t in array array['profiles','departments','llm_models','llm_providers','employees','projects','tasks','task_logs','budget_settings','audit_logs'] loop
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- 권한 함수 (security definer: profiles RLS 재귀 방지)
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

create or replace function is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and status = 'approved'
  );
$$;

-- 회원가입 시 profiles 자동 생성
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  -- shortcut: 관리자 이메일 하드코딩, 관리자가 여럿 필요해지면 설정 테이블로 이동
  admin_email constant text := 'ew20@naver.com';
begin
  insert into profiles (id, email, display_name, role, status, approved_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    case when new.email = admin_email then 'admin'::user_role else 'member' end,
    case when new.email = admin_email then 'approved'::user_status else 'pending' end,
    case when new.email = admin_email then now() end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 이미 가입된 사용자 백필
insert into profiles (id, email, display_name, role, status, approved_at)
select
  id, email, split_part(email, '@', 1),
  case when email = 'ew20@naver.com' then 'admin'::user_role else 'member' end,
  case when email = 'ew20@naver.com' then 'approved'::user_status else 'pending' end,
  case when email = 'ew20@naver.com' then now() end
from auth.users
on conflict (id) do nothing;

-- RLS
alter table profiles enable row level security;
alter table departments enable row level security;
alter table llm_models enable row level security;
alter table llm_providers enable row level security;
alter table employees enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table task_logs enable row level security;
alter table budget_settings enable row level security;
alter table audit_logs enable row level security;

create policy "profiles: own or admin read" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "profiles: admin update" on profiles
  for update using (is_admin()) with check (is_admin());

-- 승인 사용자 읽기 + admin 전체: departments, llm_models, employees, projects, tasks, task_logs, budget_settings
do $$
declare t text;
begin
  foreach t in array array['departments','llm_models','employees','projects','tasks','task_logs','budget_settings'] loop
    execute format('create policy "%1$s: approved read" on %1$I for select using (is_approved())', t);
    execute format('create policy "%1$s: admin all" on %1$I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

create policy "llm_providers: admin read" on llm_providers
  for select using (is_admin());
create policy "audit_logs: admin read" on audit_logs
  for select using (is_admin());
