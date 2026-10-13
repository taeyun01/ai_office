"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { deleteProject as dbDeleteProject, upsertProject } from "@/lib/db/office";
import { insertAuditLog } from "@/lib/db/profiles";
import type { Project } from "@/types";

const STATUSES: Project["status"][] = ["planning", "active", "done"];

export async function saveProject(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const { db, me } = await requireAdmin();
    const id = String(fd.get("id") ?? "");
    const row = {
      ...(id ? { id } : {}),
      name: String(fd.get("name") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim() || null,
      department_id: String(fd.get("department_id") ?? ""),
      status: String(fd.get("status")) as Project["status"],
      revenue: Number(fd.get("revenue") ?? 0),
    };
    if (!row.name || !row.department_id) throw new Error("이름과 부서는 필수입니다.");
    if (!STATUSES.includes(row.status)) throw new Error("잘못된 상태");
    if (!Number.isFinite(row.revenue) || row.revenue < 0) throw new Error("매출은 0 이상 숫자여야 합니다.");
    const saved = await upsertProject(db, row);
    await insertAuditLog(db, { actor_id: me.id, action: id ? "project.update" : "project.create", target_type: "project", target_id: saved.id });
    revalidatePath("/admin/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}

export async function deleteProject(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const { db, me } = await requireAdmin();
    const id = String(fd.get("id"));
    // 작업이 남아 있으면 삭제하지 않는다 (작업 결과물 유실 방지)
    const { count, error } = await db.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", id);
    if (error) throw error;
    if (count) throw new Error(`작업 ${count}개가 남아 있어 삭제할 수 없습니다. 상태를 '완료'로 바꾸세요.`);
    await dbDeleteProject(db, id);
    await insertAuditLog(db, { actor_id: me.id, action: "project.delete", target_type: "project", target_id: id });
    revalidatePath("/admin/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}
