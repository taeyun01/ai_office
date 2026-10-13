import { NEW_DEPARTMENT, NEW_PROJECT } from "@/lib/constants";
import { insertAuditLog } from "@/lib/db/profiles";
import { pickDepartmentSlot } from "@/lib/seats";
import type { Db } from "@/types";

// 서버 액션 공용: 드롭다운에서 "새로 만들기"를 골랐으면 먼저 만들고 id를 돌려준다.
// (requireAdmin 이후에만 호출할 것)

export async function resolveProjectId(db: Db, actorId: string, fd: FormData) {
  const id = String(fd.get("project_id") ?? "");
  if (id !== NEW_PROJECT) return id;
  const name = String(fd.get("new_project_name") ?? "").trim();
  const departmentId = String(fd.get("new_project_department_id") ?? "");
  if (!name || !departmentId) throw new Error("새 업무 이름과 부서를 입력하세요.");
  const { data, error } = await db
    .from("projects")
    .insert({ name, department_id: departmentId, status: "active" })
    .select("id")
    .single();
  if (error) throw error;
  await insertAuditLog(db, { actor_id: actorId, action: "project.create", target_type: "project", target_id: data.id });
  return data.id;
}

export async function resolveDepartmentId(db: Db, actorId: string, fd: FormData) {
  const id = String(fd.get("department_id") ?? "");
  if (id !== NEW_DEPARTMENT) return id;
  const name = String(fd.get("new_department_name") ?? "").trim();
  const color = String(fd.get("new_department_color") ?? "");
  if (!name) throw new Error("새 부서 이름을 입력하세요.");
  const workspaceId = String(fd.get("workspace_id") ?? "");
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("부서 색이 올바르지 않습니다.");
  if (!workspaceId) throw new Error("프로젝트 정보가 없습니다.");
  const { data: existing, error: listError } = await db
    .from("departments")
    .select("position_x, position_z")
    .eq("workspace_id", workspaceId);
  if (listError) throw listError;
  const { data, error } = await db
    .from("departments")
    .insert({ workspace_id: workspaceId, name, color, slug: `dept-${crypto.randomUUID().slice(0, 8)}`, ...pickDepartmentSlot(existing) })
    .select("id")
    .single();
  if (error) throw error;
  await insertAuditLog(db, { actor_id: actorId, action: "department.create", target_type: "department", target_id: data.id });
  return data.id;
}
