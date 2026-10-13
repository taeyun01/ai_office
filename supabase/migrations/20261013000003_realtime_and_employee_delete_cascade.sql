-- M4: 실시간 구독 대상 테이블 발행 + 직원 삭제 시 작업도 함께 삭제
alter publication supabase_realtime add table employees, tasks, task_logs;

alter table tasks drop constraint tasks_assigned_employee_id_fkey;
alter table tasks add constraint tasks_assigned_employee_id_fkey
  foreign key (assigned_employee_id) references employees(id) on delete cascade;
