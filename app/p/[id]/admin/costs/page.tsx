import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { BudgetForm } from "@/components/admin/budget-form";
import { CostChart } from "@/components/admin/cost-chart";
import { getBudgetSettings, listLlmModels } from "@/lib/db/llm";
import { listEmployees, listTasks } from "@/lib/db/office";
import { getWorkspace } from "@/lib/db/workspaces";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Params = Promise<{ id: string }>;

const dateKST = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

function Ranking({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <section>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ol className="text-sm">
        {rows.length === 0 && <li className="text-muted-foreground">데이터 없음</li>}
        {rows.map(([name, usd], i) => (
          <li key={name} className="flex justify-between border-t py-1">
            <span>{i + 1}. {name}</span><span>${usd.toFixed(4)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

async function Content({ params }: { params: Params }) {
  const { id } = await params;
  const db = await createClient();
  const workspace = await getWorkspace(db, id);
  if (!workspace) notFound();
  const [tasks, employees, models, budget, { data: briefs, error: briefsError }] = await Promise.all([
    listTasks(db, id), listEmployees(db, id), listLlmModels(db), getBudgetSettings(db, id),
    db.from("briefs").select("created_at, cost_usd, model_id").eq("workspace_id", id),
  ]);
  if (briefsError) throw briefsError;
  const done = tasks.filter((t) => t.status === "done" && t.completed_at);

  // 최근 30일 일별 비용
  const days: { date: string; usd: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    days.push({ date: dateKST(d.toISOString()), usd: 0 });
  }
  const byDate = new Map(days.map((d) => [d.date, d]));
  // 작업 비용 + AI 팀장 계획 비용
  for (const c of [
    ...done.map((t) => ({ at: t.completed_at!, usd: Number(t.cost_usd) })),
    ...briefs.map((b) => ({ at: b.created_at, usd: Number(b.cost_usd) })),
  ]) {
    const day = byDate.get(dateKST(c.at));
    if (day) day.usd += c.usd;
  }
  const planCost = briefs.reduce((s, b) => s + Number(b.cost_usd), 0);

  const sumBy = (key: (t: (typeof done)[number]) => string) => {
    const m = new Map<string, number>();
    for (const t of done) m.set(key(t), (m.get(key(t)) ?? 0) + Number(t.cost_usd));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  };
  const empName = new Map(employees.map((e) => [e.id, e.name]));
  const modelName = new Map(models.map((m) => [m.id, m.display_name]));
  const failed = tasks.filter((t) => t.status === "failed");

  return (
    <div className="flex flex-col gap-8">
      <AdminNav current={`/p/${id}/admin/costs`} workspace={workspace} />
      <section>
        <h2 className="mb-2 text-xl font-bold">최근 30일 일별 비용</h2>
        <CostChart data={days} />
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <Ranking title="직원별 비용" rows={sumBy((t) => empName.get(t.assigned_employee_id) ?? "(삭제됨)")} />
        <Ranking title="모델별 비용" rows={sumBy((t) => (t.used_model_id && modelName.get(t.used_model_id)) ?? "(알 수 없음)")} />
      </div>
      <p className="-mt-4 text-xs text-muted-foreground">
        AI 팀장 계획 비용 {briefs.length}회 · ${planCost.toFixed(4)} (일별 차트와 월 예산에 포함)
      </p>
      <section>
        <h2 className="mb-2 text-xl font-bold">실패 작업 ({failed.length})</h2>
        <ul className="text-sm">
          {failed.length === 0 && <li className="text-muted-foreground">없음</li>}
          {failed.map((t) => (
            <li key={t.id} className="border-t py-1">
              <span className="font-medium">{t.title}</span>
              <span className="text-muted-foreground"> · {empName.get(t.assigned_employee_id)} · 재시도 {t.retry_count}</span>
              <div className="text-xs text-red-400">{t.error}</div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold">예산 · 근무시간 · 기본 모델</h2>
        <BudgetForm budget={budget} models={models} />
      </section>
    </div>
  );
}

export default function AdminCostsPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
