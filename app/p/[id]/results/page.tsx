import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResultsView } from "@/components/results/results-view";
import { listLlmModels } from "@/lib/db/llm";
import { listDepartments, listEmployees, listProjects, listTasks } from "@/lib/db/office";
import { getWorkspace } from "@/lib/db/workspaces";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

// 결과물 탭: 승인된 사용자 누구나 읽기 (RLS: approved read)
async function Content({ params }: { params: Params }) {
  const { id } = await params;
  const db = await createClient();
  const workspace = await getWorkspace(db, id);
  if (!workspace) notFound();
  const [tasks, employees, projects, departments, models] = await Promise.all([
    listTasks(db, id),
    listEmployees(db, id),
    listProjects(db, id),
    listDepartments(db, id),
    listLlmModels(db),
  ]);
  const done = tasks
    .filter((t) => t.status === "done" && t.result)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  return (
    <>
      <div className="mb-5 flex items-center gap-4">
        <Link href={`/p/${id}`} className="text-sm text-slate-400 hover:text-slate-100">← {workspace.name} 오피스</Link>
        <h1 className="text-xl font-bold">결과물</h1>
      </div>
      <ResultsView tasks={done} employees={employees} projects={projects} departments={departments} models={models} />
    </>
  );
}

export default function ResultsPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
