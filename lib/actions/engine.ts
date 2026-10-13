"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { insertAuditLog } from "@/lib/db/profiles";

// admin "지금 실행": pg_cron과 같은 Edge Function을 admin JWT로 호출
export async function runEngineNow() {
  const { db, me } = await requireAdmin();
  const { error } = await db.functions.invoke("run-agent-tasks", { body: { source: "manual" } });
  if (error) throw new Error("엔진 호출 실패: " + error.message);
  await insertAuditLog(db, { actor_id: me.id, action: "engine.run" });
}

export async function setGlobalPaused(fd: FormData) {
  const { db, me } = await requireAdmin();
  const paused = String(fd.get("paused")) === "true";
  const { error } = await db.from("budget_settings").update({ global_paused: paused }).eq("singleton", true);
  if (error) throw error;
  await insertAuditLog(db, { actor_id: me.id, action: paused ? "engine.pause" : "engine.resume" });
  revalidatePath("/office");
}
