"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/modal";
import { applyBrief, planBrief, type PlanResult } from "@/lib/actions/brief";
import { useOfficeStore } from "@/stores/office-store";
import type { Project } from "@/types";
import { ProjectSelect } from "./project-select";

// 팀에 맡기기: 브리프 → AI 팀장 계획(미리보기) → 고른 작업만 생성
export function BriefForm({ projects, onDone }: { projects: Project[]; onDone: () => void }) {
  const [state, plan, planning] = useActionState<PlanResult, FormData>(planBrief, null);
  const [applying, startApply] = useTransition();
  const [applyError, setApplyError] = useState<string | null>(null);
  const employees = useOfficeStore((s) => s.employees);
  const departments = useOfficeStore((s) => s.departments);
  const deptOf = (employeeId: string) => departments.find((d) => d.id === employees[employeeId]?.department_id);

  if (!state?.ok) {
    return (
      <form action={plan} className="flex flex-col gap-3">
        <ProjectSelect projects={projects} />
        <div>
          <label className={labelClass}>브리프 — 무엇을 원하는지 자유롭게</label>
          <textarea
            name="brief"
            rows={6}
            required
            minLength={5}
            placeholder="예) 동네 치킨집 '바삭치킨'의 랜딩페이지를 만들고 싶어. 대표 메뉴 3개, 배달 주문 버튼, 오픈 이벤트(첫 주문 20% 할인) 섹션이 필요해."
            className={fieldClass}
          />
        </div>
        <p className="text-xs text-slate-400">
          AI 팀장이 직원 목록을 보고 필요한 사람에게만 일을 나눕니다. 관련 없는 부서는 빠집니다. 계획 단계에도 LLM 비용이 조금 듭니다.
        </p>
        {state && !state.ok && <p className="text-sm text-red-400">{state.error}</p>}
        <Button type="submit" disabled={planning}>{planning ? "AI 팀장이 계획 중…" : "AI 팀장에게 계획 맡기기"}</Button>
      </form>
    );
  }

  const { briefId, plan: p, model, costUsd } = state;
  return (
    <form
      className="flex flex-col gap-3"
      action={(fd) =>
        startApply(async () => {
          setApplyError(null);
          try {
            await applyBrief(fd);
            onDone();
          } catch (e) {
            setApplyError(e instanceof Error ? e.message : "실패");
          }
        })
      }
    >
      <input type="hidden" name="brief_id" value={briefId} />
      <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm">
        <div className="mb-1 text-xs text-cyan-300">AI 팀장 계획 · {model} · ${costUsd.toFixed(4)}</div>
        {p.summary}
      </div>

      <ul className="flex max-h-[45svh] flex-col gap-2 overflow-y-auto pr-1">
        {p.assignments.map((a, i) => {
          const e = employees[a.employee_id];
          const d = deptOf(a.employee_id);
          return (
            <li key={i} className="rounded-md border border-slate-700 p-3">
              <label className="flex items-start gap-2">
                <input type="checkbox" name="pick" value={i} defaultChecked className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ background: d?.color }} />
                    <span className="font-medium text-slate-200">{e?.name}</span>
                    <span>· {d?.name} · {e?.role}</span>
                    <span className="ml-auto">{a.task_type} · 우선순위 {a.priority}</span>
                  </div>
                  <input name={`title_${i}`} defaultValue={a.title} className={`${fieldClass} mt-1.5 py-1 font-medium`} />
                  <textarea name={`instruction_${i}`} defaultValue={a.instruction} rows={3} className={`${fieldClass} mt-1.5 text-xs`} />
                  {a.reason && <p className="mt-1 text-xs text-slate-500">왜: {a.reason}</p>}
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {p.skipped.length > 0 && (
        <div className="text-xs text-slate-400">
          <div className="mb-0.5 font-semibold">이번엔 빠진 부서</div>
          <ul>
            {p.skipped.map((s, i) => (
              <li key={i}>· {s.department} — {s.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {applyError && <p className="text-sm text-red-400">{applyError}</p>}
      <Button type="submit" disabled={applying}>{applying ? "만드는 중…" : "선택한 작업 만들기"}</Button>
    </form>
  );
}
