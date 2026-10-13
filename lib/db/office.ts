import type { Db } from "@/types";
import type { TablesInsert, TablesUpdate } from "@/types/database";

// 오피스 화면용 읽기 함수. RLS가 적용되므로 승인된 사용자만 결과를 받는다.

export async function listDepartments(db: Db, workspaceId: string) {
  const { data, error } = await db.from("departments").select("*").eq("workspace_id", workspaceId).order("name");
  if (error) throw error;
  return data;
}

export async function listEmployees(db: Db, workspaceId: string) {
  const { data, error } = await db.from("employees").select("*").eq("workspace_id", workspaceId).order("name");
  if (error) throw error;
  return data;
}

export async function listProjects(db: Db, workspaceId: string) {
  const { data, error } = await db.from("projects").select("*").eq("workspace_id", workspaceId).order("name");
  if (error) throw error;
  return data;
}

export async function listTasks(db: Db, workspaceId: string, employeeId?: string) {
  let q = db
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("priority", { ascending: false })
    .order("created_at");
  if (employeeId) q = q.eq("assigned_employee_id", employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}


// ---- admin 쓰기 (RLS: admin만) ----

export async function insertEmployee(db: Db, row: TablesInsert<"employees">) {
  const { data, error } = await db.from("employees").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateEmployee(db: Db, id: string, patch: TablesUpdate<"employees">) {
  const { error } = await db.from("employees").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteEmployee(db: Db, id: string) {
  const { error } = await db.from("employees").delete().eq("id", id);
  if (error) throw error;
}

export async function insertTask(db: Db, row: TablesInsert<"tasks">) {
  const { data, error } = await db.from("tasks").insert(row).select().single();
  if (error) throw error;
  return data;
}

// 오피스 화면용: 최근 로그만 (오래된 로그까지 전부 내려보내지 않게)
export async function listRecentTaskLogs(db: Db, workspaceId: string, limit = 200) {
  const { data, error } = await db
    .from("task_logs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function upsertProject(db: Db, row: TablesInsert<"projects">) {
  const { data, error } = await db.from("projects").upsert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProject(db: Db, id: string) {
  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) throw error;
}
