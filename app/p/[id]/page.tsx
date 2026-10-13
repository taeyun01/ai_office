import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OfficeClient } from "@/components/office/office-client";
import { getBudgetSettings, listLlmModels, listLlmProviders } from "@/lib/db/llm";
import {
  listDepartments,
  listEmployees,
  listProjects,
  listRecentTaskLogs,
  listTasks,
} from "@/lib/db/office";
import { getMyProfile } from "@/lib/db/profiles";
import { getWorkspace } from "@/lib/db/workspaces";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

async function Office({ params }: { params: Params }) {
  const { id } = await params;
  const db = await createClient();
  const [me, workspace] = await Promise.all([getMyProfile(db), getWorkspace(db, id)]);
  if (!workspace) notFound();
  const isAdmin = me.role === "admin";
  const [departments, employees, projects, tasks, taskLogs, llmModels, providers, budget] =
    await Promise.all([
      listDepartments(db, id),
      listEmployees(db, id),
      listProjects(db, id),
      listTasks(db, id),
      listRecentTaskLogs(db, id),
      listLlmModels(db),
      isAdmin ? listLlmProviders(db) : Promise.resolve([]),
      getBudgetSettings(db, id),
    ]);
  const providerHasKey = Object.fromEntries(
    providers.map((p) => [p.provider, p.vault_secret_id !== null]),
  );
  return (
    <OfficeClient
      // 프로젝트를 바꾸면 스토어·구독을 새로 시작
      key={id}
      workspace={workspace}
      initial={{ departments, employees, projects, tasks, taskLogs, llmModels, budget }}
      isAdmin={isAdmin}
      providerHasKey={providerHasKey}
    />
  );
}

export default function OfficePage({ params }: { params: Params }) {
  return (
    <main className="relative h-svh w-full bg-[#0b1020]">
      <Suspense fallback={<p className="p-6 text-sm text-slate-400">오피스 불러오는 중…</p>}>
        <Office params={params} />
      </Suspense>
    </main>
  );
}
