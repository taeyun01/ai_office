-- M5: API 키 Vault 함수, 작업 엔진 SQL 헬퍼, pg_cron 스케줄

-- ---------- API 키 (Vault) ----------
-- 키 값은 llm_providers에 저장하지 않는다. 아래 함수는 service role만 호출 가능.

create or replace function set_provider_key(p_provider llm_provider, p_key text, p_actor uuid)
returns void language plpgsql security definer set search_path = public, vault as $$
declare
  sid uuid;
begin
  if length(p_key) < 8 then raise exception 'API 키가 너무 짧습니다.'; end if;
  select vault_secret_id into sid from llm_providers where provider = p_provider;
  if sid is null then
    sid := vault.create_secret(p_key, 'llm_' || p_provider::text, 'LLM API key');
  else
    perform vault.update_secret(sid, p_key);
  end if;
  update llm_providers
    set vault_secret_id = sid, key_hint = '••••' || right(p_key, 4), updated_by = p_actor,
        last_verified_at = null, last_verified_ok = null
    where provider = p_provider;
end $$;

create or replace function delete_provider_key(p_provider llm_provider)
returns void language plpgsql security definer set search_path = public, vault as $$
declare
  sid uuid;
begin
  select vault_secret_id into sid from llm_providers where provider = p_provider;
  if sid is not null then delete from vault.secrets where id = sid; end if;
  update llm_providers
    set vault_secret_id = null, key_hint = null, last_verified_at = null, last_verified_ok = null
    where provider = p_provider;
end $$;

create or replace function get_provider_key(p_provider llm_provider)
returns text language sql security definer stable set search_path = public, vault as $$
  select s.decrypted_secret
  from llm_providers p join vault.decrypted_secrets s on s.id = p.vault_secret_id
  where p.provider = p_provider;
$$;

-- pg_cron → Edge Function 호출용 공유 비밀. 마이그레이션이 직접 만들어 사용자 설정이 필요 없다.
select vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'engine_secret', 'pg_cron → run-agent-tasks 인증')
where not exists (select 1 from vault.secrets where name = 'engine_secret');

create or replace function get_engine_secret()
returns text language sql security definer stable set search_path = vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'engine_secret';
$$;

revoke execute on function set_provider_key(llm_provider, text, uuid) from anon, authenticated, public;
revoke execute on function delete_provider_key(llm_provider) from anon, authenticated, public;
revoke execute on function get_provider_key(llm_provider) from anon, authenticated, public;
revoke execute on function get_engine_secret() from anon, authenticated, public;

-- ---------- 작업 엔진 헬퍼 (service role 전용) ----------

-- 30분 넘게 running인 작업은 엔진이 죽은 것으로 보고 queued로 되돌림 (§8 신뢰성)
create or replace function recover_stale_tasks()
returns int language sql security definer set search_path = public as $$
  with r as (
    update tasks set status = 'queued', started_at = null
    where status = 'running' and started_at < now() - interval '30 minutes'
    returning 1
  ) select count(*)::int from r;
$$;

-- 일일 한도를 넘긴 직원은 resting으로
create or replace function rest_exhausted_employees()
returns int language sql security definer set search_path = public as $$
  with r as (
    update employees set status = 'resting', current_task_id = null
    where status in ('idle', 'working') and tokens_used_today >= daily_token_limit
    returning 1
  ) select count(*)::int from r;
$$;

-- queued 작업을 priority desc, created_at asc 로 최대 n개 집어 running으로 바꾼다.
-- FOR UPDATE SKIP LOCKED 로 동시 실행 시 중복 처리를 막는다. paused/한도 초과 직원의 작업은 건너뛴다.
create or replace function claim_tasks(p_limit int)
returns setof tasks language sql security definer set search_path = public as $$
  update tasks t set status = 'running', started_at = now()
  where t.id in (
    select t2.id from tasks t2
    join employees e on e.id = t2.assigned_employee_id
    where t2.status = 'queued'
      and e.status <> 'paused'
      and e.tokens_used_today < e.daily_token_limit
    order by t2.priority desc, t2.created_at
    limit p_limit
    for update of t2 skip locked
  )
  returning t.*;
$$;

-- 이번 달(KST) 누적 비용
create or replace function month_cost_usd()
returns numeric language sql security definer stable set search_path = public as $$
  select coalesce(sum(cost_usd), 0) from tasks
  where completed_at >= date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
$$;

revoke execute on function recover_stale_tasks() from anon, authenticated, public;
revoke execute on function rest_exhausted_employees() from anon, authenticated, public;
revoke execute on function claim_tasks(int) from anon, authenticated, public;
revoke execute on function month_cost_usd() from anon, authenticated, public;

-- ---------- 스케줄 (pg_cron) ----------

-- shortcut: 프로젝트 URL 하드코딩, 프로젝트가 바뀌면 이 함수만 수정
create or replace function engine_url() returns text language sql immutable as $$
  select 'https://mnvtsasmsyhngdbwrusx.supabase.co/functions/v1/run-agent-tasks';
$$;

-- budget_settings.work_hours (KST "HH:MM" 목록) 대로 engine-* cron 잡을 다시 만든다
create or replace function sync_engine_schedule()
returns void language plpgsql security definer set search_path = public, cron as $$
declare
  j record;
  h text;
  hh int; mm int;
begin
  for j in select jobname from cron.job where jobname like 'engine-%' loop
    perform cron.unschedule(j.jobname);
  end loop;
  for h in select jsonb_array_elements_text(work_hours) from budget_settings loop
    hh := split_part(h, ':', 1)::int; mm := split_part(h, ':', 2)::int;
    perform cron.schedule(
      'engine-' || replace(h, ':', ''),
      format('%s %s * * *', mm, (hh + 15) % 24),   -- KST → UTC (-9h)
      $cmd$
        select net.http_post(
          url := engine_url(),
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-engine-secret', get_engine_secret()),
          body := '{"source":"cron"}'::jsonb,
          timeout_milliseconds := 10000
        );
      $cmd$
    );
  end loop;
end $$;

create or replace function on_budget_settings_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.work_hours is distinct from old.work_hours then perform sync_engine_schedule(); end if;
  return new;
end $$;

create trigger budget_settings_sync_schedule
  after update on budget_settings
  for each row execute function on_budget_settings_changed();

select sync_engine_schedule();

-- 매일 0시(KST = 15:00 UTC): 토큰 사용량 초기화, resting → idle
select cron.schedule('daily-reset', '0 15 * * *', $$
  update employees set tokens_used_today = 0,
    status = case when status = 'resting' then 'idle' else status end
$$);
