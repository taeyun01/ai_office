// AI 작업 엔진 (§7.5). pg_cron 또는 admin "지금 실행"이 호출한다.
// 요청에는 즉시 202로 답하고 실제 처리는 백그라운드에서 한다 (pg_net 타임아웃 회피).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createIssue, ensureLabel, GithubError } from "./github.ts";
import { ENV_KEY, generate, LlmError, maskSecrets, type Provider } from "./llm.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_TOKENS = { simple: 1500, complex: 4000 } as const;
const ENERGY_PER_TASK = 10;
// shortcut: Edge Function 벽시계 한도(150s) 안에 끝내기 위해 이 시간이 지나면 남은 작업은 다음 실행으로 넘긴다
const TIME_BUDGET_MS = 110_000;

type Db = SupabaseClient;

// 호출자 인증: pg_cron(공유 비밀) 또는 승인된 admin의 JWT
async function authorize(req: Request, admin: Db): Promise<boolean> {
  const secret = req.headers.get("x-engine-secret");
  if (secret) {
    const { data } = await admin.rpc("get_engine_secret");
    return !!data && data === secret;
  }
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!jwt) return false;
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u.user) return false;
  const { data: p } = await admin.from("profiles").select("role, status").eq("id", u.user.id).single();
  return p?.role === "admin" && p?.status === "approved";
}

async function log(db: Db, taskId: string, employeeId: string, level: "info" | "warn" | "error", message: string) {
  await db.from("task_logs").insert({ task_id: taskId, employee_id: employeeId, level, message });
}

async function runEngine(db: Db, workspaceId: string) {
  const started = Date.now();
  const { data: settings } = await db.from("budget_settings").select("*").eq("workspace_id", workspaceId).single();
  if (!settings || settings.global_paused) return { skipped: "global_paused" };

  const { data: monthCost } = await db.rpc("month_cost_usd", { p_workspace: workspaceId });
  if (Number(monthCost) >= Number(settings.monthly_budget_usd)) {
    await db.from("audit_logs").insert({
      action: "engine.budget_exceeded",
      target_type: "workspace",
      target_id: workspaceId,
      metadata: { month_cost_usd: monthCost, monthly_budget_usd: settings.monthly_budget_usd },
    });
    console.warn("월 예산 초과로 엔진 종료", monthCost, settings.monthly_budget_usd);
    return { skipped: "budget_exceeded" };
  }

  await db.rpc("recover_stale_tasks");
  await db.rpc("rest_exhausted_employees");
  const { data: tasks, error } = await db.rpc("claim_tasks", { p_limit: settings.max_tasks_per_run, p_workspace: workspaceId });
  if (error) throw error;
  if (!tasks || tasks.length === 0) return { processed: 0 }; // queued가 없으면 LLM 호출 0회

  const { data: models } = await db.from("llm_models").select("*");
  const modelById = new Map((models ?? []).map((m) => [m.id, m]));
  const keyCache = new Map<Provider, string | null>();
  const keyFor = async (provider: Provider) => {
    if (!keyCache.has(provider)) {
      const { data } = await db.rpc("get_provider_key", { p_provider: provider });
      keyCache.set(provider, (data as string | null) || Deno.env.get(ENV_KEY[provider]) || null);
    }
    return keyCache.get(provider)!;
  };

  // 코드 작업 직원용: 프로젝트 저장소와 GitHub 토큰 (없으면 그 작업은 실패 처리)
  const { data: workspace } = await db.from("workspaces").select("github_repo").eq("id", workspaceId).single();
  const { data: ghToken } = await db.rpc("get_github_token", { p_workspace: workspaceId });
  let labelReady: Promise<void> | null = null;

  const results = await Promise.allSettled(
    tasks.map(async (task) => {
      if (Date.now() - started > TIME_BUDGET_MS) {
        await db.from("tasks").update({ status: "queued", started_at: null }).eq("id", task.id);
        return;
      }
      const { data: emp } = await db.from("employees").select("*").eq("id", task.assigned_employee_id).single();
      if (!emp) return;
      const eid = emp.id;

      // 모델: 직원 모델 → 비활성화면 task_type별 기본 모델
      let model = modelById.get(emp.model_id);
      if (!model?.is_enabled) {
        const fallbackId = task.task_type === "complex" ? settings.default_model_complex_id : settings.default_model_simple_id;
        model = fallbackId ? modelById.get(fallbackId) : undefined;
      }

      await db.from("employees").update({ status: "working", current_task_id: task.id }).eq("id", eid);
      await log(db, task.id, eid, "info", emp.works_on_code ? "코드 작업 시작 (GitHub)" : `작업 시작 (${model?.display_name ?? "모델 없음"})`);

      const finishEmployee = async (patch: Record<string, unknown> = {}) =>
        db.from("employees").update({ status: "idle", current_task_id: null, ...patch }).eq("id", eid);

      const fail = async (message: string, retryable: boolean) => {
        const safe = maskSecrets(message);
        if (retryable && task.retry_count < 2) {
          await db.from("tasks").update({ status: "queued", started_at: null, retry_count: task.retry_count + 1, error: safe }).eq("id", task.id);
          await log(db, task.id, eid, "warn", `실패, 재시도 예정 (${task.retry_count + 1}/2): ${safe}`);
        } else {
          await db.from("tasks").update({ status: "failed", error: safe, completed_at: new Date().toISOString() }).eq("id", task.id);
          await log(db, task.id, eid, "error", `실패: ${safe}`);
        }
        await finishEmployee();
      };

      // 코드 작업: LLM을 직접 부르지 않고 저장소에 이슈를 올린다 → Claude Code Action이 PR 생성 → github-sync가 완료 처리
      // 직원은 PR이 올라올 때까지 working 상태로 남는다
      if (emp.works_on_code) {
        const repo = workspace?.github_repo;
        const token = ghToken as string | null;
        if (!repo || !token) return fail("GitHub 연동 안 됨 (프로젝트 설정에서 저장소·토큰 확인)", false);
        try {
          labelReady ??= ensureLabel(token, repo);
          await labelReady;
          const body = [
            task.instruction,
            "",
            "---",
            `**담당 AI 직원:** ${emp.name} (${emp.role})`,
            "",
            "**직원 역할 지시:**",
            emp.system_prompt,
            "",
            `_AIOffice에서 자동 생성된 이슈입니다. 작업 후 PR 본문에 \`Closes #이슈번호\`를 넣어 주세요._`,
            `<!-- aioffice-task:${task.id} -->`,
          ].join("\n");
          const issue = await createIssue(token, repo, task.title, body);
          await db.from("tasks").update({ github_issue_number: issue.number, github_issue_url: issue.html_url, used_model_id: null }).eq("id", task.id);
          await log(db, task.id, eid, "info", `GitHub 이슈 #${issue.number} 생성 → Claude Code가 PR 작업 중`);
        } catch (e) {
          const retryable = e instanceof GithubError && (e.status >= 500 || e.status === 403);
          await fail(e instanceof Error ? e.message : String(e), retryable);
        }
        return;
      }

      if (!model) return fail("사용 가능한 모델이 없음", false);
      const apiKey = await keyFor(model.provider as Provider);
      if (!apiKey) return fail(`API 키 없음 (${model.provider})`, false);

      try {
        const r = await generate({
          provider: model.provider as Provider,
          modelName: model.model_name,
          apiKey,
          system: emp.system_prompt,
          prompt: `# ${task.title}\n\n${task.instruction}\n\n결과는 마크다운으로 작성하세요.`,
          maxTokens: MAX_TOKENS[task.task_type as keyof typeof MAX_TOKENS],
        });
        const cost =
          (r.inputTokens * Number(model.input_price_per_mtok) + r.outputTokens * Number(model.output_price_per_mtok)) / 1_000_000;
        await db.from("tasks").update({
          status: "done", result: r.text, error: null,
          token_input: r.inputTokens, token_output: r.outputTokens,
          used_model_id: model.id, cost_usd: cost, completed_at: new Date().toISOString(),
        }).eq("id", task.id);
        await finishEmployee({
          tokens_used_today: emp.tokens_used_today + r.inputTokens + r.outputTokens,
          energy: Math.max(0, emp.energy - ENERGY_PER_TASK),
        });
        await log(db, task.id, eid, "info", `완료 · ${r.inputTokens}+${r.outputTokens} 토큰 · $${cost.toFixed(5)}`);
      } catch (e) {
        const err = e instanceof LlmError ? e : new LlmError(String(e), "other", false);
        await fail(err.message, err.retryable);
      }
    }),
  );
  return { processed: tasks.length, failed: results.filter((r) => r.status === "rejected").length };
}

Deno.serve(async (req) => {
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  if (!(await authorize(req, db))) return new Response("Unauthorized", { status: 401 });

  // workspace_id가 있으면 그 프로젝트만, 없으면 모든 프로젝트를 차례로
  const body = await req.json().catch(() => ({}));
  const ids: string[] = body.workspace_id
    ? [String(body.workspace_id)]
    : ((await db.from("workspaces").select("id")).data ?? []).map((w: { id: string }) => w.id);
  const p = (async () => {
    for (const id of ids) {
      await runEngine(db, id).catch((e) => console.error("engine error", id, maskSecrets(String(e))));
    }
  })();
  EdgeRuntime.waitUntil(p);
  return new Response(JSON.stringify({ started: true }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
});
