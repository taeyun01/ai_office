import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { listProfiles } from "@/lib/db/profiles";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import { approveUser, rejectUser } from "./actions";

function UserRow({ user, children }: { user: Profile; children?: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-md border px-4 py-2 text-sm">
      <div>
        <div className="font-medium">{user.email}</div>
        <div className="text-xs text-muted-foreground">
          {user.display_name} · 가입 {new Date(user.created_at).toLocaleString("ko-KR")}
        </div>
      </div>
      {children}
    </li>
  );
}

async function UsersList() {
  const db = await createClient();
  const profiles = await listProfiles(db);
  const pending = profiles.filter((p) => p.status === "pending");
  const approved = profiles.filter((p) => p.status === "approved");

  return (
    <main className="flex flex-col gap-8">
      <section>
        <h1 className="mb-3 text-xl font-bold">승인 대기 ({pending.length})</h1>
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground">대기 중인 가입자가 없습니다.</p>
        )}
        <ul className="flex flex-col gap-2">
          {pending.map((u) => (
            <UserRow key={u.id} user={u}>
              <div className="flex gap-2">
                <form action={approveUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <Button size="sm" type="submit">승인</Button>
                </form>
                <form action={rejectUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <Button size="sm" variant="outline" type="submit">거절</Button>
                </form>
              </div>
            </UserRow>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold">승인된 사용자 ({approved.length})</h2>
        <ul className="flex flex-col gap-2">
          {approved.map((u) => (
            <UserRow key={u.id} user={u}>
              <span className="text-xs text-muted-foreground">{u.role}</span>
            </UserRow>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default function AdminUsersPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <AdminNav current="/admin/users" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <UsersList />
      </Suspense>
    </div>
  );
}
