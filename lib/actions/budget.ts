"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { insertAuditLog } from "@/lib/db/profiles";

// 예산·근무시간·기본 모델 설정 (§7.6). work_hours 변경은 DB 트리거가 pg_cron 잡을 다시 만든다.
export async function updateBudgetSettings(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const { db, me } = await requireAdmin();
    const monthly = Number(fd.get("monthly_budget_usd"));
    const maxTasks = Math.floor(Number(fd.get("max_tasks_per_run")));
    const hours = String(fd.get("work_hours") ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (!(monthly >= 0)) throw new Error("월 예산은 0 이상이어야 합니다.");
    if (!(maxTasks >= 1 && maxTasks <= 50)) throw new Error("실행당 최대 작업 수는 1~50 사이여야 합니다.");
    if (hours.length === 0 || hours.some((h) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(h))) {
      throw new Error("근무시간은 HH:MM 형식을 쉼표로 구분해 입력하세요. 예: 10:00, 16:00");
    }
    const patch = {
      monthly_budget_usd: monthly,
      max_tasks_per_run: maxTasks,
      work_hours: hours,
      default_model_simple_id: String(fd.get("default_model_simple_id") || "") || null,
      default_model_complex_id: String(fd.get("default_model_complex_id") || "") || null,
    };
    const { error } = await db.from("budget_settings").update(patch).eq("singleton", true);
    if (error) throw error;
    await insertAuditLog(db, { actor_id: me.id, action: "budget.update" });
    revalidatePath("/admin/costs");
    revalidatePath("/office");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}
