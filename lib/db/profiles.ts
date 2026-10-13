import type { Db, Profile } from "@/types";

export async function getMyProfile(db: Db) {
  // admin은 RLS로 모든 profiles를 읽을 수 있으므로 본인 id로 한정
  const { data: claims } = await db.auth.getClaims();
  const uid = claims?.claims.sub;
  if (!uid) throw new Error("로그인이 필요합니다.");
  const { data, error } = await db.from("profiles").select("*").eq("id", uid).single();
  if (error) throw error;
  return data;
}

// admin 전용 (RLS: admin만 전체 읽기)
export async function listProfiles(db: Db) {
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function setProfileStatus(
  db: Db,
  id: string,
  status: Extract<Profile["status"], "approved" | "rejected">,
  actorId: string,
) {
  const { error } = await db
    .from("profiles")
    .update({
      status,
      approved_by: actorId,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function insertAuditLog(
  db: Db,
  log: { actor_id: string; action: string; target_type?: string; target_id?: string },
) {
  const { error } = await db.from("audit_logs").insert(log);
  if (error) throw error;
}
