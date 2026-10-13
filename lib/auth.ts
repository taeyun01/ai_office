import { getMyProfile } from "@/lib/db/profiles";
import { createClient } from "@/lib/supabase/server";

// 서버 액션 공통: 요청자가 승인된 admin인지 확인. RLS도 같은 조건으로 막는다.
export async function requireAdmin() {
  const db = await createClient();
  const me = await getMyProfile(db);
  if (me.role !== "admin" || me.status !== "approved") {
    throw new Error("관리자만 할 수 있습니다.");
  }
  return { db, me };
}
