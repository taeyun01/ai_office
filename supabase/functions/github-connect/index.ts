// 프로젝트별 GitHub 연동: 토큰 저장/삭제/점검. 승인된 admin JWT로만 호출.
// 토큰 값은 Vault에만 저장하고 응답·로그에 넣지 않는다.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ensureLabel, getRepo, GithubError, hasWorkflow } from "./github.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  const { data: u } = jwt ? await db.auth.getUser(jwt) : { data: { user: null } };
  if (!u.user) return json({ error: "Unauthorized" }, 401);
  const { data: me } = await db.from("profiles").select("role, status").eq("id", u.user.id).single();
  if (me?.role !== "admin" || me?.status !== "approved") return json({ error: "관리자만 할 수 있습니다." }, 403);

  const body = await req.json().catch(() => ({}));
  const ws = String(body.workspace_id ?? "");
  const action = String(body.action ?? "");
  const { data: workspace } = await db.from("workspaces").select("id, github_repo").eq("id", ws).maybeSingle();
  if (!workspace) return json({ error: "프로젝트를 찾을 수 없습니다." });

  const audit = (act: string, metadata: Record<string, unknown> = {}) =>
    db.from("audit_logs").insert({ actor_id: u.user!.id, action: act, target_type: "workspace", target_id: ws, metadata });

  if (action === "set") {
    const token = String(body.token ?? "").trim();
    const { error } = await db.rpc("set_github_token", { p_workspace: ws, p_token: token });
    if (error) return json({ error: error.message.replaceAll(token, "***") });
    await audit("github_token.set", { hint: "••••" + token.slice(-4) });
    return json(await check());
  }
  if (action === "delete") {
    await db.rpc("delete_github_token", { p_workspace: ws });
    await audit("github_token.delete");
    return json({ ok: true });
  }
  if (action === "verify") return json(await check());
  return json({ error: "알 수 없는 action" });

  // 저장소 접근·쓰기 권한·라벨·워크플로 파일을 점검한다
  async function check() {
    const repo = workspace!.github_repo;
    if (!repo) return { ok: false, reason: "프로젝트에 GitHub 저장소 주소가 없습니다." };
    const { data: token } = await db.rpc("get_github_token", { p_workspace: ws });
    if (!token) return { ok: false, reason: "토큰이 없습니다." };
    try {
      const r = await getRepo(token as string, repo);
      await ensureLabel(token as string, repo);
      const workflow = await hasWorkflow(token as string, repo);
      return {
        ok: true,
        repo: r.full_name,
        workflow,
        reason: workflow ? null : ".github/workflows/ai-office.yml 이 저장소에 없습니다. 설정 가이드를 확인하세요.",
      };
    } catch (e) {
      return { ok: false, reason: e instanceof GithubError ? e.message : "GitHub 연결 실패" };
    }
  }
});
