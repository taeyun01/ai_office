"use client";

import { useOfficeStore } from "@/stores/office-store";

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-[7rem] rounded-lg border border-cyan-500/30 bg-[#0b1020]/80 px-3 py-2 backdrop-blur">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-lg font-semibold leading-tight text-slate-100">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

const todayKST = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const monthKST = () => todayKST().slice(0, 7);
const dateKST = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

// KPI와 비용 카드 (§7.6). 스토어의 DB row로 계산하므로 Realtime 변경이 바로 반영된다.
export function KpiBar() {
  const projects = useOfficeStore((s) => s.projects);
  const employees = useOfficeStore((s) => s.employees);
  const tasks = useOfficeStore((s) => s.tasks);
  const budget = useOfficeStore((s) => s.budget);

  const emps = Object.values(employees);
  const all = Object.values(tasks);
  const done = all.filter((t) => t.status === "done");
  const today = todayKST();
  const month = monthKST();
  const doneToday = done.filter((t) => t.completed_at && dateKST(t.completed_at) === today).length;
  const monthCost = all
    .filter((t) => t.completed_at && dateKST(t.completed_at).startsWith(month))
    .reduce((s, t) => s + Number(t.cost_usd), 0);
  const working = emps.filter((e) => e.status === "working").length;
  const tokensToday = emps.reduce((s, e) => s + e.tokens_used_today, 0);
  const revenue = projects.reduce((s, p) => s + Number(p.revenue), 0);
  const monthly = Number(budget?.monthly_budget_usd ?? 0);
  const pct = monthly > 0 ? Math.min(100, (monthCost / monthly) * 100) : 0;

  return (
    <div className="flex flex-wrap gap-2">
      <Tile label="진행 중 프로젝트" value={String(projects.filter((p) => p.status === "active").length)} sub={`전체 ${projects.length}`} />
      <Tile label="작업 완료율" value={all.length ? `${Math.round((done.length / all.length) * 100)}%` : "-"} sub={`${done.length} / ${all.length}`} />
      <Tile label="직원 가동률" value={emps.length ? `${Math.round((working / emps.length) * 100)}%` : "-"} sub={`${working} / ${emps.length} 작업 중`} />
      <Tile label="오늘 완료" value={String(doneToday)} sub="작업" />
      <Tile label="총 매출" value={`$${revenue.toLocaleString()}`} />
      <div className="min-w-[11rem] rounded-lg border border-cyan-500/30 bg-[#0b1020]/80 px-3 py-2 backdrop-blur">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>이번 달 비용</span>
          <span>${monthCost.toFixed(2)} / ${monthly}</span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="월 예산 사용률">
          <div className={`h-1.5 rounded-full ${pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-300" : "bg-cyan-400"}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-slate-500">오늘 토큰 {tokensToday.toLocaleString()}</div>
      </div>
    </div>
  );
}
