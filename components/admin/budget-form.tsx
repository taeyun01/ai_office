"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/modal";
import type { ActionResult } from "@/lib/actions/admin";
import { updateBudgetSettings } from "@/lib/actions/budget";
import type { BudgetSettings, LlmModel } from "@/types";

export function BudgetForm({ budget, models }: { budget: BudgetSettings; models: LlmModel[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateBudgetSettings, null);
  const hours = Array.isArray(budget.work_hours) ? (budget.work_hours as string[]).join(", ") : "";
  const enabled = models.filter((m) => m.is_enabled);
  const ModelSelect = ({ name, value }: { name: string; value: string | null }) => (
    <select name={name} defaultValue={value ?? ""} className={fieldClass}>
      <option value="">(없음)</option>
      {enabled.map((m) => (
        <option key={m.id} value={m.id}>{m.display_name} · {m.tier}</option>
      ))}
    </select>
  );

  return (
    <form action={action} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
      <input type="hidden" name="workspace_id" value={budget.workspace_id} />
      <div>
        <label className={labelClass}>월 예산 (USD)</label>
        <input name="monthly_budget_usd" type="number" min={0} step="0.01" defaultValue={budget.monthly_budget_usd} className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>실행당 최대 작업 수</label>
        <input name="max_tasks_per_run" type="number" min={1} max={50} defaultValue={budget.max_tasks_per_run} className={fieldClass} />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>근무시간 (KST, 쉼표 구분) — 이 시각마다 작업 엔진이 실행됨</label>
        <input name="work_hours" defaultValue={hours} placeholder="10:00, 16:00" className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>simple 작업 기본 모델 (직원 모델 비활성화 시 대체)</label>
        <ModelSelect name="default_model_simple_id" value={budget.default_model_simple_id} />
      </div>
      <div>
        <label className={labelClass}>complex 작업 기본 모델</label>
        <ModelSelect name="default_model_complex_id" value={budget.default_model_complex_id} />
      </div>
      <div className="flex items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "저장 중…" : "설정 저장"}</Button>
        {state && <span className={`text-sm ${state.ok ? "text-green-500" : "text-red-500"}`}>{state.ok ? "저장됨" : state.error}</span>}
      </div>
    </form>
  );
}
