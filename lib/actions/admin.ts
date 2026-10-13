"use server";

import { requireAdmin } from "@/lib/auth";
import {
  deleteEmployee as dbDeleteEmployee,
  insertEmployee,
  insertTask,
  listEmployees,
  updateEmployee as dbUpdateEmployee,
} from "@/lib/db/office";
import { insertAuditLog } from "@/lib/db/profiles";
import { pickSeat } from "@/lib/seats";
import type { Task } from "@/types";

export type ActionResult = { ok: true } | { ok: false; error: string } | null;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const num = (fd: FormData, key: string, fallback: number) => {
  const n = Number(fd.get(key));
  return Number.isFinite(n) ? n : fallback;
};

// 폼 → 직원 컬럼. 필수값 검증은 여기서(신뢰 경계).
function parseEmployee(fd: FormData) {
  const row = {
    department_id: str(fd, "department_id"),
    name: str(fd, "name"),
    role: str(fd, "role"),
    system_prompt: str(fd, "system_prompt"),
    model_id: str(fd, "model_id"),
    daily_token_limit: Math.max(0, Math.floor(num(fd, "daily_token_limit", 50000))),
  };
  for (const [k, v] of Object.entries(row)) {
    if (v === "") throw new Error(`${k} 값이 비어 있습니다.`);
  }
  return row;
}

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "실패했습니다." };
  }
}

async function freeSeat(db: Awaited<ReturnType<typeof requireAdmin>>["db"], departmentId: string, excludeId?: string) {
  const { data: dept, error } = await db
    .from("departments")
    .select("position_x, position_z")
    .eq("id", departmentId)
    .single();
  if (error) throw error;
  const taken = (await listEmployees(db)).filter(
    (e) => e.department_id === departmentId && e.id !== excludeId,
  );
  return pickSeat(dept, taken);
}

export async function createEmployee(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const { db, me } = await requireAdmin();
    const row = parseEmployee(fd);
    const seat = await freeSeat(db, row.department_id);
    const created = await insertEmployee(db, { ...row, ...seat });
    await insertAuditLog(db, {
      actor_id: me.id,
      action: "employee.create",
      target_type: "employee",
      target_id: created.id,
    });
  });
}

export async function updateEmployee(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const { db, me } = await requireAdmin();
    const id = str(fd, "id");
    const row = parseEmployee(fd);
    const { data: current, error } = await db
      .from("employees")
      .select("department_id")
      .eq("id", id)
      .single();
    if (error) throw error;
    // 부서가 바뀌면 새 구역의 빈자리로 이동
    const seat =
      current.department_id === row.department_id ? {} : await freeSeat(db, row.department_id, id);
    await dbUpdateEmployee(db, id, { ...row, ...seat });
    await insertAuditLog(db, {
      actor_id: me.id,
      action: "employee.update",
      target_type: "employee",
      target_id: id,
    });
  });
}

export async function deleteEmployee(fd: FormData) {
  const { db, me } = await requireAdmin();
  const id = str(fd, "id");
  await dbDeleteEmployee(db, id);
  await insertAuditLog(db, {
    actor_id: me.id,
    action: "employee.delete",
    target_type: "employee",
    target_id: id,
  });
}

export async function setEmployeePaused(fd: FormData) {
  const { db, me } = await requireAdmin();
  const id = str(fd, "id");
  const paused = str(fd, "paused") === "true";
  await dbUpdateEmployee(db, id, { status: paused ? "paused" : "idle" });
  await insertAuditLog(db, {
    actor_id: me.id,
    action: paused ? "employee.pause" : "employee.resume",
    target_type: "employee",
    target_id: id,
  });
}

export async function createTask(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const { db, me } = await requireAdmin();
    const row = {
      project_id: str(fd, "project_id"),
      assigned_employee_id: str(fd, "assigned_employee_id"),
      title: str(fd, "title"),
      instruction: str(fd, "instruction"),
      task_type: (str(fd, "task_type") === "complex" ? "complex" : "simple") as Task["task_type"],
      priority: Math.floor(num(fd, "priority", 0)),
      created_by: me.id,
    };
    for (const k of ["project_id", "assigned_employee_id", "title", "instruction"] as const) {
      if (row[k] === "") throw new Error(`${k} 값이 비어 있습니다.`);
    }
    const created = await insertTask(db, row);
    await insertAuditLog(db, {
      actor_id: me.id,
      action: "task.create",
      target_type: "task",
      target_id: created.id,
    });
  });
}

// 회의실 소집/복귀 (연출용 상태). Realtime으로 모든 접속자 화면에서 직원들이 걸어간다.
export async function setMeeting(fd: FormData) {
  const { db, me } = await requireAdmin();
  const ids = fd.getAll("ids").map(String).filter(Boolean);
  const inMeeting = str(fd, "in_meeting") === "true";
  if (ids.length === 0) return;
  const { error } = await db.from("employees").update({ in_meeting: inMeeting }).in("id", ids);
  if (error) throw error;
  await insertAuditLog(db, {
    actor_id: me.id,
    action: inMeeting ? "meeting.call" : "meeting.dismiss",
    target_type: "employee",
  });
}
