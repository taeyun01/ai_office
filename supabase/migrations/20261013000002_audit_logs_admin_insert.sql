-- M2: 관리자 서버 액션이 승인/거절 기록을 남길 수 있게 insert 허용
create policy "audit_logs: admin insert" on audit_logs
  for insert with check (is_admin() and actor_id = auth.uid());
