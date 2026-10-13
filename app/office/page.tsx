import { Suspense } from "react";
import { OfficeClient } from "@/components/office/office-client";
import { getBudgetSettings, listLlmModels, listLlmProviders } from "@/lib/db/llm";
import {
  listAllTaskLogs,
  listDepartments,
  listEmployees,
  listProjects,
  listTasks,
} from "@/lib/db/office";
import { getMyProfile } from "@/lib/db/profiles";
import { createClient } from "@/lib/supabase/server";

async function Office() {
  const db = await createClient();
  const me = await getMyProfile(db);
  const isAdmin = me.role === "admin";
  const [departments, employees, projects, tasks, taskLogs, llmModels, providers, budget] =
    await Promise.all([
      listDepartments(db),
      listEmployees(db),
      listProjects(db),
      listTasks(db),
      listAllTaskLogs(db),
      listLlmModels(db),
      isAdmin ? listLlmProviders(db) : Promise.resolve([]),
      getBudgetSettings(db),
    ]);
  const providerHasKey = Object.fromEntries(
    providers.map((p) => [p.provider, p.vault_secret_id !== null]),
  );
  return (
    <OfficeClient
      initial={{ departments, employees, projects, tasks, taskLogs, llmModels, budget }}
      isAdmin={isAdmin}
      providerHasKey={providerHasKey}
    />
  );
}

export default function OfficePage() {
  return (
    <main className="relative h-svh w-full bg-[#0b1020]">
      <Suspense fallback={<p className="p-6 text-sm text-slate-400">오피스 불러오는 중…</p>}>
        <Office />
      </Suspense>
    </main>
  );
}
