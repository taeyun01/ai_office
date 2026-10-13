// AI 팀장(PM): 대표의 브리프를 읽고 필요한 직원에게만 작업을 나눈 "계획"을 만든다.
// 계획만 저장하고 작업은 만들지 않는다 (대표가 확인 후 생성). 승인된 admin JWT로만 호출.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ENV_KEY, generate, LlmError, maskSecrets, type Provider } from "./llm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TIER_RANK: Record<string, number> = { balanced: 0, premium: 1, fast: 2 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Assignment = { employee_id: string; title: string; instruction: string; task_type: "simple" | "complex"; priority: number; reason: string };
type Plan = { summary: string; assignments: Assignment[]; skipped: { department: string; reason: string }[] };

const SYSTEM = `당신은 AI 회사의 PM(팀장)입니다. 대표가 준 브리프를 읽고, 직원 목록 중 이 일에 꼭 필요한 직원에게만 작업을 나눠 줍니다.
규칙:
- 필요 없는 부서·직원에게는 일을 주지 않습니다. 빠진 부서는 skipped에 한 줄 이유를 적습니다.
- 한 직원에게 여러 작업을 줄 수 있지만, 같은 일을 두 명에게 중복해서 주지 않습니다.
- instruction은 그 직원이 브리프를 보지 않아도 바로 작업할 수 있게 구체적으로 씁니다: 맥락, 해야 할 일, 산출물 형식과 분량.
- 다른 작업의 결과가 필요한 작업은 priority를 낮게, 먼저 해야 하는 작업(기획·카피·구조 설계 등)은 높게 줍니다. priority는 0~10 정수.
- task_type은 짧은 분류·요약·카피는 simple, 기획·설계·코드·긴 문서는 complex.
- 모든 문장은 한국어.
- 반드시 아래 JSON 하나만 출력합니다. 코드펜스나 설명을 붙이지 않습니다.
{"summary":"한두 문장 계획 요약","assignments":[{"employee_id":"직원 id","title":"작업 제목","instruction":"구체적 지시","task_type":"simple|complex","priority":0,"reason":"이 직원에게 맡긴 이유"}],"skipped":[{"department":"부서명","reason":"제외 이유"}]}`;

// LLM 출력에서 JSON 객체만 꺼내 검증한다. 모르는 직원 id나 빈 값은 버린다.
function parsePlan(text: string, validIds: Set<string>): Plan {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("계획 형식을 읽을 수 없습니다.");
  const raw = JSON.parse(text.slice(start, end + 1));
  const assignments: Assignment[] = (Array.isArray(raw.assignments) ? raw.assignments : [])
    .filter((a: Record<string, unknown>) => validIds.has(String(a.employee_id)) && a.title && a.instruction)
    .map((a: Record<string, unknown>) => ({
      employee_id: String(a.employee_id),
      title: String(a.title).slice(0, 200),
      instruction: String(a.instruction).slice(0, 4000),
      task_type: a.task_type === "complex" ? "complex" : "simple",
      priority: Math.max(0, Math.min(10, Math.round(Number(a.priority) || 0))),
      reason: String(a.reason ?? "").slice(0, 300),
    }));
  if (assignments.length === 0) throw new Error("맡길 직원을 찾지 못했습니다. 브리프를 더 구체적으로 써 주세요.");
  const skipped = (Array.isArray(raw.skipped) ? raw.skipped : []).map((s: Record<string, unknown>) => ({
    department: String(s.department ?? ""),
    reason: String(s.reason ?? ""),
  }));
  return { summary: String(raw.summary ?? ""), assignments, skipped };
}

Deno.serve(async (req) => {
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const jwt = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  const { data: u } = jwt ? await db.auth.getUser(jwt) : { data: { user: null } };
  if (!u.user) return json({ error: "Unauthorized" }, 401);
  const { data: me } = await db.from("profiles").select("role, status").eq("id", u.user.id).single();
  if (me?.role !== "admin" || me?.status !== "approved") return json({ error: "관리자만 할 수 있습니다." }, 403);

  const body = await req.json().catch(() => ({}));
  const projectId = String(body.project_id ?? "");
  const brief = String(body.brief ?? "").trim();
  if (!projectId || brief.length < 5) return json({ error: "프로젝트와 브리프(5자 이상)를 입력하세요." });

  // 비용 안전장치: 긴급 정지·월 예산은 계획 단계에도 적용
  const { data: settings } = await db.from("budget_settings").select("*").single();
  if (settings?.global_paused) return json({ error: "긴급 정지 중이라 계획을 세울 수 없습니다." });
  const { data: monthCost } = await db.rpc("month_cost_usd");
  if (Number(monthCost) >= Number(settings?.monthly_budget_usd ?? 0)) return json({ error: "이번 달 예산을 다 썼습니다." });

  const [{ data: employees }, { data: departments }, { data: models }, { data: project }] = await Promise.all([
    db.from("employees").select("id, name, role, department_id, status").neq("status", "paused"),
    db.from("departments").select("id, name"),
    db.from("llm_models").select("*").eq("is_enabled", true),
    db.from("projects").select("name, description").eq("id", projectId).single(),
  ]);
  if (!employees?.length) return json({ error: "일할 수 있는 직원이 없습니다." });

  // PM 모델: complex 기본 모델 → 키가 없으면 키가 있는 모델 중 balanced 우선
  const keyOf = new Map<string, string | null>();
  const keyFor = async (p: string) => {
    if (!keyOf.has(p)) {
      const { data } = await db.rpc("get_provider_key", { p_provider: p });
      keyOf.set(p, (data as string | null) || Deno.env.get(ENV_KEY[p as Provider]) || null);
    }
    return keyOf.get(p)!;
  };
  const candidates = [
    ...(models ?? []).filter((m) => m.id === settings?.default_model_complex_id),
    ...(models ?? []).sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]),
  ];
  let model = null;
  let apiKey: string | null = null;
  for (const m of candidates) {
    apiKey = await keyFor(m.provider);
    if (apiKey) { model = m; break; }
  }
  if (!model || !apiKey) return json({ error: "API 키가 등록된 모델이 없습니다. /admin/models에서 키를 등록하세요." });

  const deptName = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const roster = employees.map((e) => ({ employee_id: e.id, name: e.name, role: e.role, department: deptName.get(e.department_id) }));
  const prompt = `# 프로젝트\n${project?.name ?? ""}${project?.description ? ` — ${project.description}` : ""}\n\n# 대표의 브리프\n${brief}\n\n# 직원 목록\n${JSON.stringify(roster, null, 1)}`;

  try {
    const r = await generate({ provider: model.provider as Provider, modelName: model.model_name, apiKey, system: SYSTEM, prompt, maxTokens: 6000 });
    const plan = parsePlan(r.text, new Set(employees.map((e) => e.id)));
    const cost = (r.inputTokens * Number(model.input_price_per_mtok) + r.outputTokens * Number(model.output_price_per_mtok)) / 1_000_000;
    const { data: saved, error } = await db.from("briefs").insert({
      project_id: projectId, brief, plan, model_id: model.id,
      token_input: r.inputTokens, token_output: r.outputTokens, cost_usd: cost, created_by: u.user.id,
    }).select("id").single();
    if (error) throw error;
    await db.from("audit_logs").insert({ actor_id: u.user.id, action: "brief.plan", target_type: "brief", target_id: saved.id, metadata: { assignments: plan.assignments.length } });
    return json({ brief_id: saved.id, plan, model: model.display_name, cost_usd: cost });
  } catch (e) {
    const msg = e instanceof LlmError ? e.message : e instanceof Error ? e.message : String(e);
    return json({ error: "계획 실패: " + maskSecrets(msg, apiKey) });
  }
});
