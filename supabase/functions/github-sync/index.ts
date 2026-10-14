// GitHub에 맡긴 작업(running + github_issue_number) 상태를 가져온다. pg_cron이 5분마다 호출.
// 연결된 PR이 있으면 done(결과물 = PR 링크·본문), PR 없이 이슈가 닫혔거나 너무 오래 걸리면 failed.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getIssue, listRecentPulls, pullForIssue, type Pull } from "./github.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TIMEOUT_MS = 6 * 60 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // pg_cron(공유 비밀) 또는 승인된 admin
  const secret = req.headers.get("x-engine-secret");
  if (secret) {
    const { data } = await db.rpc("get_engine_secret");
    if (data !== secret) return json({ error: "Unauthorized" }, 401);
  } else {
    const jwt = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
    const { data: u } = jwt ? await db.auth.getUser(jwt) : { data: { user: null } };
    const { data: me } = u.user ? await db.from("profiles").select("role, status").eq("id", u.user.id).single() : { data: null };
    if (me?.role !== "admin" || me?.status !== "approved") return json({ error: "Unauthorized" }, 401);
  }

  const { data: tasks, error } = await db
    .from("tasks")
    .select("id, workspace_id, assigned_employee_id, github_issue_number, started_at")
    .eq("status", "running")
    .not("github_issue_number", "is", null);
  if (error) return json({ error: error.message }, 500);
  if (!tasks?.length) return json({ checked: 0 });

  const log = (taskId: string, employeeId: string, level: "info" | "warn" | "error", message: string) =>
    db.from("task_logs").insert({ task_id: taskId, employee_id: employeeId, level, message });
  const release = (employeeId: string, taskId: string) =>
    db.from("employees").update({ status: "idle", current_task_id: null }).eq("id", employeeId).eq("current_task_id", taskId);

  let done = 0, failed = 0;
  const byWorkspace = new Map<string, typeof tasks>();
  for (const t of tasks) byWorkspace.set(t.workspace_id, [...(byWorkspace.get(t.workspace_id) ?? []), t]);
  for (const [ws, list] of byWorkspace) {
    const { data: w } = await db.from("workspaces").select("github_repo").eq("id", ws).single();
    const { data: token } = await db.rpc("get_github_token", { p_workspace: ws });
    if (!w?.github_repo || !token) continue; // 연동이 풀렸으면 다음에 다시 확인
    let pulls: Pull[];
    try {
      pulls = await listRecentPulls(token as string, w.github_repo);
    } catch (e) {
      console.error("github-sync pulls", ws, e instanceof Error ? e.message : e);
      continue;
    }

    for (const t of list) {
      const n = t.github_issue_number!;
      const pr = pullForIssue(pulls, n);
      const now = new Date().toISOString();
      if (pr) {
        const result = [`## PR #${pr.number}: ${pr.title}`, "", pr.html_url, "", pr.body ?? ""].join("\n");
        await db.from("tasks").update({
          status: "done", result, github_pr_url: pr.html_url, completed_at: now, error: null,
        }).eq("id", t.id);
        await release(t.assigned_employee_id, t.id);
        await log(t.id, t.assigned_employee_id, "info", `PR #${pr.number} 올라옴 · 리뷰 후 머지하세요 ${pr.html_url}`);
        done++;
        continue;
      }
      try {
        const issue = await getIssue(token as string, w.github_repo, n);
        const tooLong = t.started_at && Date.now() - new Date(t.started_at).getTime() > TIMEOUT_MS;
        if (issue.state === "closed" || tooLong) {
          const reason = issue.state === "closed" ? `PR 없이 이슈 #${n}이 닫힘` : `시간 초과: 6시간 안에 PR이 없음 (이슈 #${n}, Actions 로그 확인)`;
          await db.from("tasks").update({ status: "failed", error: reason, completed_at: now }).eq("id", t.id);
          await release(t.assigned_employee_id, t.id);
          await log(t.id, t.assigned_employee_id, "error", reason);
          failed++;
        }
      } catch (e) {
        console.error("github-sync issue", n, e instanceof Error ? e.message : e);
      }
    }
  }
  return json({ checked: tasks.length, done, failed });
});
