import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { ProjectTable } from "@/components/admin/project-table";
import { listDepartments, listProjects, listTasks } from "@/lib/db/office";
import { createClient } from "@/lib/supabase/server";

async function Content() {
  const db = await createClient();
  const [projects, departments, tasks] = await Promise.all([listProjects(db), listDepartments(db), listTasks(db)]);
  const rows = projects.map((p) => {
    const mine = tasks.filter((t) => t.project_id === p.id);
    return { ...p, taskTotal: mine.length, taskDone: mine.filter((t) => t.status === "done").length };
  });
  return <ProjectTable projects={rows} departments={departments} />;
}

export default function AdminProjectsPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <AdminNav current="/admin/projects" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
