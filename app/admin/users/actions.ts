"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { insertAuditLog, setProfileStatus } from "@/lib/db/profiles";

async function review(formData: FormData, status: "approved" | "rejected") {
  const { db, me } = await requireAdmin();
  const id = String(formData.get("id"));
  await setProfileStatus(db, id, status, me.id);
  await insertAuditLog(db, {
    actor_id: me.id,
    action: status === "approved" ? "user.approve" : "user.reject",
    target_type: "profile",
    target_id: id,
  });
  revalidatePath("/admin/users");
}

export async function approveUser(formData: FormData) {
  await review(formData, "approved");
}

export async function rejectUser(formData: FormData) {
  await review(formData, "rejected");
}
