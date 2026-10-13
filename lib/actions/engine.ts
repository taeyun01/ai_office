"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { insertAuditLog } from "@/lib/db/profiles";

// admin "지금 실행": pg_cron과 같은 Edge Function을 admin JWT로 호출 (해당 프로젝트만)
export async function runEngineNow(workspaceId: string) {
  const { db, me } = await requireAdmin();
  const { error } = await db.functions.invoke("run-agent-tasks", { body: { source: "manual", workspace_id: workspaceId } });
  if (error) throw new Error("엔진 호출 실패: " + error.message);
  await insertAuditLog(db, { actor_id: me.id, action: "engine.run", target_type: "workspace", target_id: workspaceId });
}

export async function setGlobalPaused(fd: FormData) {
  const { db, me } = await requireAdmin();
  const workspaceId = String(fd.get("workspace_id"));
  const paused = String(fd.get("paused")) === "true";
  const { error } = await db.from("budget_settings").update({ global_paused: paused }).eq("workspace_id", workspaceId);
  if (error) throw error;
  await insertAuditLog(db, { actor_id: me.id, action: paused ? "engine.pause" : "engine.resume", target_type: "workspace", target_id: workspaceId });
  revalidatePath(`/p/${workspaceId}`);
}
