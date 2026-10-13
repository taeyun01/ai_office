-- M7: 보안·성능 어드바이저 지적 사항 반영

-- 1) search_path 고정
alter function set_updated_at() set search_path = public;
alter function engine_url() set search_path = public;

-- 2) 외부에서 호출할 이유가 없는 SECURITY DEFINER 함수는 REST RPC로 못 부르게
--    (is_admin / is_approved 는 RLS 정책이 호출하므로 남긴다)
revoke execute on function handle_new_user() from anon, authenticated, public;
revoke execute on function on_budget_settings_changed() from anon, authenticated, public;
revoke execute on function sync_engine_schedule() from anon, authenticated, public;

-- 3) RLS: auth.uid() 를 (select auth.uid()) 로 바꿔 행마다 재평가되지 않게
drop policy "profiles: own or admin read" on profiles;
create policy "profiles: own or admin read" on profiles
  for select using (id = (select auth.uid()) or is_admin());
drop policy "audit_logs: admin insert" on audit_logs;
create policy "audit_logs: admin insert" on audit_logs
  for insert with check (is_admin() and actor_id = (select auth.uid()));

-- 4) 중복 permissive 정책 정리: SELECT는 "approved read" 하나만(admin도 approved), 쓰기는 admin 전용 정책으로 분리
do $$
declare t text;
begin
  foreach t in array array['departments','llm_models','employees','projects','tasks','task_logs','budget_settings'] loop
    execute format('drop policy "%1$s: admin all" on %1$I', t);
    execute format('create policy "%1$s: admin insert" on %1$I for insert with check (is_admin())', t);
    execute format('create policy "%1$s: admin update" on %1$I for update using (is_admin()) with check (is_admin())', t);
    execute format('create policy "%1$s: admin delete" on %1$I for delete using (is_admin())', t);
  end loop;
end $$;

-- 5) 조회에 쓰이는 FK 인덱스
create index if not exists tasks_project_id_idx on tasks (project_id);
create index if not exists tasks_used_model_id_idx on tasks (used_model_id);
create index if not exists task_logs_employee_id_idx on task_logs (employee_id);
create index if not exists projects_department_id_idx on projects (department_id);
create index if not exists employees_model_id_idx on employees (model_id);
