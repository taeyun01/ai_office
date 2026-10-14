-- GitHub 연동: "코드 작업" 직원의 작업은 LLM 대신 프로젝트 저장소에 이슈로 올라가고,
-- 저장소의 Claude Code Action이 PR을 만든다. github-sync 가 PR을 찾아 작업을 완료 처리한다.

alter table employees add column works_on_code boolean not null default false;

alter table tasks add column github_issue_number int;
alter table tasks add column github_issue_url text;
alter table tasks add column github_pr_url text;
create index tasks_github_running_idx on tasks (workspace_id) where status = 'running' and github_issue_number is not null;

-- 프로젝트별 GitHub 토큰: 값은 Vault에만, 여기엔 참조와 힌트만
alter table workspaces add column github_secret_id uuid;
alter table workspaces add column github_token_hint text;

create or replace function set_github_token(p_workspace uuid, p_token text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare sid uuid;
begin
  if length(p_token) < 20 then raise exception 'GitHub 토큰이 너무 짧습니다.'; end if;
  select github_secret_id into sid from workspaces where id = p_workspace;
  if sid is null then
    sid := vault.create_secret(p_token, 'github_' || p_workspace::text, 'GitHub token');
  else
    perform vault.update_secret(sid, p_token);
  end if;
  update workspaces set github_secret_id = sid, github_token_hint = '••••' || right(p_token, 4) where id = p_workspace;
end $$;

create or replace function delete_github_token(p_workspace uuid)
returns void language plpgsql security definer set search_path = public, vault as $$
declare sid uuid;
begin
  select github_secret_id into sid from workspaces where id = p_workspace;
  if sid is not null then delete from vault.secrets where id = sid; end if;
  update workspaces set github_secret_id = null, github_token_hint = null where id = p_workspace;
end $$;

create or replace function get_github_token(p_workspace uuid)
returns text language sql security definer stable set search_path = public, vault as $$
  select s.decrypted_secret from workspaces w join vault.decrypted_secrets s on s.id = w.github_secret_id
  where w.id = p_workspace;
$$;

revoke execute on function set_github_token(uuid, text) from anon, authenticated, public;
revoke execute on function delete_github_token(uuid) from anon, authenticated, public;
revoke execute on function get_github_token(uuid) from anon, authenticated, public;

-- GitHub에 맡긴 작업은 Claude Code가 오래 걸릴 수 있으므로 30분 복구 대상에서 뺀다 (시간 초과는 github-sync가 처리)
create or replace function recover_stale_tasks()
returns int language sql security definer set search_path = public as $$
  with r as (
    update tasks set status = 'queued', started_at = null
    where status = 'running' and github_issue_number is null and started_at < now() - interval '30 minutes'
    returning 1
  ) select count(*)::int from r;
$$;

-- github-sync: 5분마다. GitHub에서 기다리는 작업이 있을 때만 Edge Function을 부른다.
select cron.schedule('github-sync', '*/5 * * * *', $cmd$
  select net.http_post(
    url := replace(engine_url(), 'run-agent-tasks', 'github-sync'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-engine-secret', get_engine_secret()),
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 10000
  )
  where exists (select 1 from tasks where status = 'running' and github_issue_number is not null);
$cmd$);

-- 기본 프로젝트를 이 저장소에 연결하고, 프론트·백엔드 개발자를 코드 작업 담당으로
update workspaces set github_repo = 'taeyun01/ai_office' where name = 'AI 오피스' and github_repo is null;
update employees set works_on_code = true
where role in ('프론트엔드 개발자', '백엔드 개발자')
  and workspace_id in (select id from workspaces where github_repo = 'taeyun01/ai_office');
