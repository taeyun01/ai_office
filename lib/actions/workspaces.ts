"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { insertAuditLog } from "@/lib/db/profiles";
import { normalizeGithubRepo } from "@/lib/db/workspaces";

function parse(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) throw new Error("프로젝트 이름을 입력하세요.");
  return {
    name,
    description: String(fd.get("description") ?? "").trim() || null,
    github_repo: normalizeGithubRepo(String(fd.get("github_repo") ?? "")),
  };
}

// 새 프로젝트 = 새 오피스. 기본 팀(5개 부서·15명)과 예산 설정을 복사해서 시작한다.
export async function createWorkspace(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let id: string;
  try {
    const { db, me } = await requireAdmin();
    const { data, error } = await db.from("workspaces").insert({ ...parse(fd), created_by: me.id }).select("id").single();
    if (error) throw error;
    id = data.id;
    const { error: seedError } = await db.rpc("seed_workspace", { p_workspace: id });
    if (seedError) {
      // 기본 팀을 못 만들면 빈 껍데기 프로젝트가 남지 않게 지운다
      await db.from("workspaces").delete().eq("id", id);
      throw seedError;
    }
    await insertAuditLog(db, { actor_id: me.id, action: "workspace.create", target_type: "workspace", target_id: id });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
  redirect(`/p/${id}`);
}

export async function updateWorkspace(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const { db, me } = await requireAdmin();
    const id = String(fd.get("id"));
    const { error } = await db.from("workspaces").update(parse(fd)).eq("id", id);
    if (error) throw error;
    await insertAuditLog(db, { actor_id: me.id, action: "workspace.update", target_type: "workspace", target_id: id });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}

// 프로젝트 삭제는 직원·작업·결과물까지 전부 지운다. 이름을 정확히 다시 입력해야 한다.
export async function deleteWorkspace(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const { db, me } = await requireAdmin();
    const id = String(fd.get("id"));
    const { data: ws, error } = await db.from("workspaces").select("name").eq("id", id).single();
    if (error) throw error;
    if (String(fd.get("confirm_name") ?? "").trim() !== ws.name) throw new Error("프로젝트 이름이 일치하지 않습니다.");
    const { error: delError } = await db.from("workspaces").delete().eq("id", id);
    if (delError) throw delError;
    await insertAuditLog(db, { actor_id: me.id, action: "workspace.delete", target_type: "workspace", target_id: id, metadata: { name: ws.name } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}
