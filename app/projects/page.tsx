import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { WorkspaceGrid } from "@/components/projects/workspace-grid";
import { getMyProfile } from "@/lib/db/profiles";
import { listWorkspaces } from "@/lib/db/workspaces";
import { createClient } from "@/lib/supabase/server";

// 시작 화면: 프로젝트(= 오피스) 목록. 카드를 고르면 그 오피스로 들어간다.
async function Content() {
  const db = await createClient();
  const [me, workspaces, { data: employees, error: e1 }, { data: tasks, error: e2 }] = await Promise.all([
    getMyProfile(db),
    listWorkspaces(db),
    db.from("employees").select("workspace_id"),
    db.from("tasks").select("workspace_id, status"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const count = <T extends { workspace_id: string }>(rows: T[], ws: string, pred: (r: T) => boolean = () => true) =>
    rows.filter((r) => r.workspace_id === ws && pred(r)).length;
  const cards = workspaces.map((w) => ({
    ...w,
    employees: count(employees, w.id),
    queued: count(tasks, w.id, (t) => t.status === "queued"),
    done: count(tasks, w.id, (t) => t.status === "done"),
  }));
  const isAdmin = me.role === "admin";

  return (
    <>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">프로젝트</h1>
          <p className="mt-1 text-sm text-slate-400">프로젝트마다 AI 직원들이 일하는 오피스가 하나씩 있어요.</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {isAdmin && (
            <>
              <Link href="/admin/users" className="text-slate-300 hover:underline">사용자</Link>
              <Link href="/admin/models" className="text-slate-300 hover:underline">모델 · API 키</Link>
            </>
          )}
          <LogoutButton />
        </div>
      </header>
      <WorkspaceGrid workspaces={cards} isAdmin={isAdmin} />
    </>
  );
}

export default function ProjectsPage() {
  return (
    <main className="mx-auto min-h-svh max-w-5xl p-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
