"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";

export type GithubCheck = { ok?: boolean; repo?: string; workflow?: boolean; reason?: string | null; error?: string };

// 토큰 값은 Edge Function(github-connect)으로만 넘기고 여기서는 보관·로그하지 않는다
async function call(body: Record<string, unknown>): Promise<GithubCheck> {
  const { db } = await requireAdmin();
  const { data, error } = await db.functions.invoke<GithubCheck>("github-connect", { body });
  if (error) throw new Error("GitHub 연동 함수 호출 실패");
  revalidatePath(`/p/${body.workspace_id}`, "layout");
  return data ?? {};
}

const summary = (r: GithubCheck): ActionResult =>
  r.error ? { ok: false, error: r.error }
  : !r.ok ? { ok: false, error: r.reason ?? "연결 실패" }
  : r.workflow ? { ok: true }
  : { ok: false, error: `토큰은 정상입니다. 단, ${r.reason}` };

export async function setGithubToken(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    return summary(await call({ action: "set", workspace_id: String(fd.get("workspace_id")), token: String(fd.get("token") ?? "") }));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}

export async function verifyGithub(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    return summary(await call({ action: "verify", workspace_id: String(fd.get("workspace_id")) }));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}

export async function deleteGithubToken(fd: FormData) {
  await call({ action: "delete", workspace_id: String(fd.get("workspace_id")) });
}
