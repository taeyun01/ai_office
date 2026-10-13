import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { ModelTable } from "@/components/admin/model-table";
import { ProviderKeyCard } from "@/components/admin/provider-key-card";
import { listLlmModels, listLlmProviders } from "@/lib/db/llm";
import { listProfiles } from "@/lib/db/profiles";
import { createClient } from "@/lib/supabase/server";

async function Content() {
  const db = await createClient();
  const [models, providers, profiles] = await Promise.all([
    listLlmModels(db),
    listLlmProviders(db),
    listProfiles(db),
  ]);
  const nameOf = (id: string | null) => profiles.find((p) => p.id === id)?.display_name ?? null;
  const order = { anthropic: 0, openai: 1, google: 2 } as const;

  return (
    <>
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">API 키</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[...providers]
            .sort((a, b) => order[a.provider] - order[b.provider])
            .map((p) => (
              <ProviderKeyCard key={p.provider} row={p} updatedByName={nameOf(p.updated_by)} />
            ))}
        </div>
      </section>
      <ModelTable models={models} />
    </>
  );
}

export default function AdminModelsPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <AdminNav current="/admin/models" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
