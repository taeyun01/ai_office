"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/modal";
import { createEmployee, updateEmployee, type ActionResult } from "@/lib/actions/admin";
import { DEPARTMENT_COLORS, NEW_DEPARTMENT } from "@/lib/constants";
import { useOfficeStore } from "@/stores/office-store";
import type { Department, Employee, LlmModel, LlmProvider } from "@/types";

const PROVIDER_LABEL: Record<LlmModel["provider"], string> = {
  anthropic: "Claude",
  openai: "GPT",
  google: "Gemini",
};

// 신규 채용·수정 공용 폼. employee가 있으면 수정 모드.
export function EmployeeForm({
  employee,
  departments,
  llmModels,
  providerHasKey,
  onDone,
}: {
  employee?: Employee;
  departments: Department[];
  llmModels: LlmModel[];
  providerHasKey: Partial<Record<LlmProvider["provider"], boolean>>;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    employee ? updateEmployee : createEmployee,
    null,
  );
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const workspaceId = useOfficeStore((s) => s.workspaceId);
  const [departmentId, setDepartmentId] = useState(employee?.department_id ?? departments[0]?.id ?? NEW_DEPARTMENT);
  const nextColor = DEPARTMENT_COLORS.find((c) => !departments.some((d) => d.color.toLowerCase() === c)) ?? DEPARTMENT_COLORS[0];
  const enabled = llmModels.filter((m) => m.is_enabled);
  // §11: 기본 모델은 balanced 중 API 키가 있는 첫 모델
  const defaultModel =
    employee?.model_id ??
    (enabled.find((m) => m.tier === "balanced" && providerHasKey[m.provider]) ??
      enabled.find((m) => providerHasKey[m.provider]) ??
      enabled[0])?.id;
  const providers = [...new Set(enabled.map((m) => m.provider))];

  return (
    <form action={action} className="flex flex-col gap-3">
      {employee && <input type="hidden" name="id" value={employee.id} />}
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <div>
        <label className={labelClass}>부서</label>
        <select name="department_id" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required className={fieldClass}>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
          <option value={NEW_DEPARTMENT}>+ 새 부서 만들기</option>
        </select>
      </div>
      {departmentId === NEW_DEPARTMENT && (
        <div className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-cyan-500/30 p-3">
          <div>
            <label className={labelClass}>새 부서 이름</label>
            <input name="new_department_name" required placeholder="예: 마케팅" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>구역 색</label>
            <input name="new_department_color" type="color" defaultValue={nextColor} className="h-[38px] w-14 cursor-pointer rounded-md border border-slate-600 bg-transparent" />
          </div>
          <p className="col-span-2 text-xs text-slate-400">오피스의 빈 자리에 새 구역이 생기고, 이 직원이 첫 좌석에 앉습니다.</p>
        </div>
      )}
      <div>
        <label className={labelClass}>이름</label>
        <input name="name" defaultValue={employee?.name} required className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>역할</label>
        <input name="role" defaultValue={employee?.role} placeholder="예: 프론트엔드 개발자" required className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>시스템 프롬프트</label>
        <textarea name="system_prompt" defaultValue={employee?.system_prompt} rows={4} required className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>LLM 모델</label>
        <select name="model_id" defaultValue={defaultModel} required className={fieldClass}>
          {providers.map((p) => (
            <optgroup key={p} label={PROVIDER_LABEL[p]}>
              {enabled
                .filter((m) => m.provider === p)
                .map((m) => (
                  <option key={m.id} value={m.id} disabled={!providerHasKey[p]}>
                    {m.display_name} · {m.tier} · ${m.input_price_per_mtok}/${m.output_price_per_mtok} per 1M
                    {!providerHasKey[p] && " (API 키 없음)"}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>일일 토큰 한도</label>
        <input name="daily_token_limit" type="number" min={0} defaultValue={employee?.daily_token_limit ?? 50000} className={fieldClass} />
      </div>
      {!enabled.some((m) => providerHasKey[m.provider]) && (
        <p className="text-sm text-amber-300">
          API 키가 등록된 제공사가 없어 모델을 고를 수 없습니다. 관리자 페이지(/admin/models)에서 키를 먼저 등록하세요.
        </p>
      )}
      {state && !state.ok && <p className="text-sm text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : employee ? "저장" : "채용"}
      </Button>
    </form>
  );
}
