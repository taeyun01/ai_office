"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { fieldClass } from "@/components/ui/modal";
import type { Department, Employee, LlmModel, Project, Task } from "@/types";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

// 완료된 작업 결과물 모아보기: 왼쪽 목록(필터·검색), 오른쪽 본문
export function ResultsView({
  tasks,
  employees,
  projects,
  departments,
  models,
}: {
  tasks: Task[];
  employees: Employee[];
  projects: Project[];
  departments: Department[];
  models: LlmModel[];
}) {
  const [projectId, setProjectId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(tasks[0]?.id ?? null);
  const [copied, setCopied] = useState(false);

  const emp = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const proj = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const colorOf = (employeeId: string) => departments.find((d) => d.id === emp.get(employeeId)?.department_id)?.color;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (!projectId || t.project_id === projectId) &&
        (!employeeId || t.assigned_employee_id === employeeId) &&
        (!needle || `${t.title}\n${t.result ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [tasks, projectId, employeeId, q]);

  const selected = filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;
  const model = selected?.used_model_id ? models.find((m) => m.id === selected.used_model_id) : undefined;

  const copy = async () => {
    if (!selected?.result) return;
    await navigator.clipboard.writeText(selected.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[22rem_1fr]">
      <section className="flex min-h-0 flex-col gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목·내용 검색"
          aria-label="결과물 검색"
          className={fieldClass}
        />
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="프로젝트" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldClass}>
            <option value="">전체 프로젝트</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select aria-label="직원" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={fieldClass}>
            <option value="">전체 직원</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-400">{filtered.length}건</p>
        <ul className="flex max-h-[calc(100svh-15rem)] flex-col gap-1.5 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <li className="rounded-md border border-slate-700 p-4 text-sm text-slate-400">
              {tasks.length === 0 ? "아직 완료된 작업이 없습니다. 오피스에서 \"지금 실행\"으로 작업을 처리하세요." : "조건에 맞는 결과물이 없습니다."}
            </li>
          )}
          {filtered.map((t) => {
            const e = emp.get(t.assigned_employee_id);
            const active = t.id === selected?.id;
            return (
              <li key={t.id}>
                <button
                  onClick={() => setSelectedId(t.id)}
                  aria-current={active}
                  className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${active ? "border-cyan-400/70 bg-cyan-500/10" : "border-slate-700 hover:bg-white/5"}`}
                >
                  <div className="truncate text-sm font-medium text-slate-100">{t.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ background: colorOf(t.assigned_employee_id) }} />
                    <span>{e?.name ?? "(삭제됨)"}</span>
                    <span>·</span>
                    <span className="truncate">{proj.get(t.project_id)?.name}</span>
                    <span className="ml-auto shrink-0">{fmt(t.completed_at)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="min-w-0 rounded-xl border border-cyan-500/30 bg-[#0b1020]/80 p-5">
        {selected ? (
          <>
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-700 pb-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-50">{selected.title}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {emp.get(selected.assigned_employee_id)?.name} · {emp.get(selected.assigned_employee_id)?.role} ·{" "}
                  {proj.get(selected.project_id)?.name} · {fmt(selected.completed_at)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {model?.display_name ?? "모델 정보 없음"} · 토큰 {selected.token_input.toLocaleString()}+{selected.token_output.toLocaleString()} · $
                  {Number(selected.cost_usd).toFixed(4)}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={copy}>{copied ? "복사됨" : "본문 복사"}</Button>
            </header>
            <details className="mb-4 text-xs text-slate-400">
              <summary className="cursor-pointer">지시 내용 보기</summary>
              <p className="mt-2 whitespace-pre-wrap rounded-md bg-slate-900/70 p-3 text-slate-300">{selected.instruction}</p>
            </details>
            <Markdown>{selected.result ?? ""}</Markdown>
          </>
        ) : (
          <p className="text-sm text-slate-400">왼쪽에서 결과물을 고르세요.</p>
        )}
      </section>
    </div>
  );
}
