import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { ProjectTable } from "@/components/admin/project-table";
import { listDepartments, listProjects, listTasks } from "@/lib/db/office";
import { getWorkspace } from "@/lib/db/workspaces";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

// 업무(= DB projects) 관리
async function Content({ params }: { params: Params }) {
  const { id } = await params;
  const db = await createClient();
  const workspace = await getWorkspace(db, id);
  if (!workspace) notFound();
  const [projects, departments, tasks] = await Promise.all([
    listProjects(db, id),
    listDepartments(db, id),
    listTasks(db, id),
  ]);
  const rows = projects.map((p) => {
    const mine = tasks.filter((t) => t.project_id === p.id);
    return { ...p, taskTotal: mine.length, taskDone: mine.filter((t) => t.status === "done").length };
  });
  return (
    <>
      <AdminNav current={`/p/${id}/admin/work`} workspace={workspace} />
      <ProjectTable projects={rows} departments={departments} />
    </>
  );
}

export default function WorkPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
