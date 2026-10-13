"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/modal";
import { createEmployee, updateEmployee, type ActionResult } from "@/lib/actions/admin";
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
      <div>
        <label className={labelClass}>부서</label>
        <select name="department_id" defaultValue={employee?.department_id} required className={fieldClass}>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
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
