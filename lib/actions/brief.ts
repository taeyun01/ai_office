"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { insertAuditLog } from "@/lib/db/profiles";
import { resolveProjectId } from "@/lib/form-resolvers";

export type BriefAssignment = {
  employee_id: string;
  title: string;
  instruction: string;
  task_type: "simple" | "complex";
  priority: number;
  reason: string;
};
export type BriefPlan = {
  summary: string;
  assignments: BriefAssignment[];
  skipped: { department: string; reason: string }[];
};
export type PlanResult =
  | { ok: true; briefId: string; plan: BriefPlan; model: string; costUsd: number }
  | { ok: false; error: string }
  | null;

// 1단계: AI 팀장(Edge Function plan-brief)에게 분배 계획을 받는다. 작업은 아직 만들지 않는다.
export async function planBrief(_prev: PlanResult, fd: FormData): Promise<PlanResult> {
  try {
    const { db, me } = await requireAdmin();
    const projectId = await resolveProjectId(db, me.id, fd);
    const brief = String(fd.get("brief") ?? "").trim();
    if (!projectId) return { ok: false, error: "업무를 고르세요." };
    if (brief.length < 5) return { ok: false, error: "브리프를 5자 이상 써 주세요." };
    const { data, error } = await db.functions.invoke<{
      brief_id?: string; plan?: BriefPlan; model?: string; cost_usd?: number; error?: string;
    }>("plan-brief", { body: { project_id: projectId, brief } });
    if (error) return { ok: false, error: "AI 팀장 호출 실패" };
    if (!data?.plan || !data.brief_id) return { ok: false, error: data?.error ?? "계획을 받지 못했습니다." };
    revalidatePath("/", "layout");
    return { ok: true, briefId: data.brief_id, plan: data.plan, model: data.model ?? "", costUsd: data.cost_usd ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}

// 2단계: 대표가 고른(필요하면 고친) 작업만 queued로 만든다. 직원 id·작업 유형은 저장된 계획 기준으로 검증.
export async function applyBrief(fd: FormData): Promise<{ created: number }> {
  const { db, me } = await requireAdmin();
  const briefId = String(fd.get("brief_id") ?? "");
  const { data: brief, error } = await db.from("briefs").select("*").eq("id", briefId).single();
  if (error) throw error;
  if (brief.status === "applied") throw new Error("이미 작업으로 만든 계획입니다.");
  const plan = brief.plan as unknown as BriefPlan;

  const picked = fd.getAll("pick").map(Number).filter((i) => Number.isInteger(i) && plan.assignments[i]);
  const rows = picked.map((i) => {
    const a = plan.assignments[i];
    const title = String(fd.get(`title_${i}`) ?? a.title).trim() || a.title;
    const instruction = String(fd.get(`instruction_${i}`) ?? a.instruction).trim() || a.instruction;
    return {
      project_id: brief.project_id,
      brief_id: brief.id,
      assigned_employee_id: a.employee_id,
      title,
      instruction,
      task_type: a.task_type,
      priority: a.priority,
      created_by: me.id,
    };
  });
  if (rows.length === 0) throw new Error("만들 작업을 하나 이상 고르세요.");

  const { error: insertError } = await db.from("tasks").insert(rows);
  if (insertError) throw insertError;
  await db.from("briefs").update({ status: "applied" }).eq("id", brief.id);
  await insertAuditLog(db, { actor_id: me.id, action: "brief.apply", target_type: "brief", target_id: brief.id });
  revalidatePath("/", "layout");
  return { created: rows.length };
}
