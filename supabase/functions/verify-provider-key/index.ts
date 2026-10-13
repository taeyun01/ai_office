// API 키 관리 (§7.8): set / delete / verify. 승인된 admin의 JWT로만 호출 가능.
// 키 값은 응답·로그·에러 메시지 어디에도 넣지 않는다.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ENV_KEY, generate, LlmError, maskSecrets, type Provider } from "./llm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PROVIDERS: Provider[] = ["anthropic", "openai", "google"];

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
  const action = body.action as "set" | "delete" | "verify";
  const provider = body.provider as Provider;
  if (!PROVIDERS.includes(provider)) return json({ error: "잘못된 제공사" }, 400);

  const audit = (act: string, metadata: Record<string, unknown> = {}) =>
    db.from("audit_logs").insert({ actor_id: u.user!.id, action: act, target_type: "llm_provider", metadata: { provider, ...metadata } });

  if (action === "set") {
    const key = String(body.key ?? "");
    const { error } = await db.rpc("set_provider_key", { p_provider: provider, p_key: key, p_actor: u.user.id });
    if (error) return json({ error: maskSecrets(error.message, key) }, 400);
    await audit("provider_key.set", { key_hint: "••••" + key.slice(-4) });
    // 저장 직후 자동 연결 테스트
    return json(await verify(provider));
  }

  if (action === "delete") {
    const { error } = await db.rpc("delete_provider_key", { p_provider: provider });
    if (error) return json({ error: error.message }, 400);
    await audit("provider_key.delete");
    return json({ ok: true });
  }

  if (action === "verify") return json(await verify(provider));
  return json({ error: "알 수 없는 action" }, 400);

  async function verify(p: Provider) {
    const { data: vaultKey } = await db.rpc("get_provider_key", { p_provider: p });
    const apiKey = (vaultKey as string | null) || Deno.env.get(ENV_KEY[p]);
    const { data: model } = await db
      .from("llm_models").select("model_name").eq("provider", p).eq("is_enabled", true)
      .order("tier").limit(1).maybeSingle(); // tier enum 순서: fast가 먼저 → 가장 저렴한 모델
    let ok = false;
    let reason: string | null = null;
    if (!apiKey) reason = "키 없음";
    else if (!model) reason = "활성화된 모델 없음";
    else {
      try {
        await generate({ provider: p, modelName: model.model_name, apiKey, system: "Reply with OK.", prompt: "ping", maxTokens: 5 });
        ok = true;
      } catch (e) {
        reason = e instanceof LlmError ? e.message.split(":")[0] : "알 수 없는 오류";
      }
    }
    await db.from("llm_providers").update({ last_verified_at: new Date().toISOString(), last_verified_ok: ok }).eq("provider", p);
    return { ok, reason };
  }
});
