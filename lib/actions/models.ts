"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { upsertLlmModel } from "@/lib/db/llm";
import { insertAuditLog } from "@/lib/db/profiles";
import type { LlmModel } from "@/types";

const PROVIDERS = ["anthropic", "openai", "google"] as const;
type Provider = (typeof PROVIDERS)[number];

function parseProvider(v: unknown): Provider {
  if (!PROVIDERS.includes(v as Provider)) throw new Error("잘못된 제공사");
  return v as Provider;
}

// ---- API 키 (§7.8): 키 값은 Edge Function으로만 보내고 여기서는 보관·로그하지 않는다 ----

type KeyResult = { ok?: boolean; reason?: string | null; error?: string };

async function callKeyFn(body: Record<string, unknown>): Promise<KeyResult> {
  const { db } = await requireAdmin();
  const { data, error } = await db.functions.invoke<KeyResult>("verify-provider-key", { body });
  if (error) throw new Error("키 관리 함수 호출 실패");
  revalidatePath("/admin/models");
  return data ?? {};
}

export async function setProviderKey(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const r = await callKeyFn({ action: "set", provider: parseProvider(fd.get("provider")), key: String(fd.get("key") ?? "") });
    if (r.error) return { ok: false, error: r.error };
    return r.ok ? { ok: true } : { ok: false, error: `저장됨. 연결 테스트 실패: ${r.reason ?? "원인 불명"}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}

export async function deleteProviderKey(fd: FormData) {
  await callKeyFn({ action: "delete", provider: parseProvider(fd.get("provider")) });
}

export async function verifyProviderKey(fd: FormData) {
  await callKeyFn({ action: "verify", provider: parseProvider(fd.get("provider")) });
}

// ---- 모델 (§7.7) ----

export async function saveModel(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const { db, me } = await requireAdmin();
    const id = String(fd.get("id") ?? "");
    const row = {
      ...(id ? { id } : {}),
      provider: parseProvider(fd.get("provider")),
      model_name: String(fd.get("model_name") ?? "").trim(),
      display_name: String(fd.get("display_name") ?? "").trim(),
      input_price_per_mtok: Number(fd.get("input_price_per_mtok")),
      output_price_per_mtok: Number(fd.get("output_price_per_mtok")),
      tier: String(fd.get("tier")) as LlmModel["tier"],
      is_enabled: fd.get("is_enabled") === "on",
    };
    if (!row.model_name || !row.display_name) throw new Error("모델 ID와 표시 이름은 필수입니다.");
    if (!Number.isFinite(row.input_price_per_mtok) || !Number.isFinite(row.output_price_per_mtok)) throw new Error("단가가 숫자가 아닙니다.");
    if (!["fast", "balanced", "premium"].includes(row.tier)) throw new Error("잘못된 등급");
    const saved = await upsertLlmModel(db, row);
    await insertAuditLog(db, { actor_id: me.id, action: id ? "model.update" : "model.create", target_type: "llm_model", target_id: saved.id });
    revalidatePath("/admin/models");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}

export async function toggleModel(fd: FormData) {
  const { db, me } = await requireAdmin();
  const id = String(fd.get("id"));
  const enabled = String(fd.get("enabled")) === "true";
  const { error } = await db.from("llm_models").update({ is_enabled: enabled }).eq("id", id);
  if (error) throw error;
  await insertAuditLog(db, { actor_id: me.id, action: enabled ? "model.enable" : "model.disable", target_type: "llm_model", target_id: id });
  revalidatePath("/admin/models");
}
