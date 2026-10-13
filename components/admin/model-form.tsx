"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/modal";
import type { ActionResult } from "@/lib/actions/admin";
import { saveModel } from "@/lib/actions/models";
import type { LlmModel } from "@/types";

// 모델 추가·수정 공용 폼
export function ModelForm({ model, onDone }: { model?: LlmModel; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveModel, null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-3">
      {model && <input type="hidden" name="id" value={model.id} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>제공사</label>
          <select name="provider" defaultValue={model?.provider ?? "anthropic"} className={fieldClass}>
            <option value="anthropic">Claude</option>
            <option value="openai">GPT</option>
            <option value="google">Gemini</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>등급</label>
          <select name="tier" defaultValue={model?.tier ?? "balanced"} className={fieldClass}>
            <option value="fast">fast</option>
            <option value="balanced">balanced</option>
            <option value="premium">premium</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>모델 ID (API에 보내는 값)</label>
        <input name="model_name" defaultValue={model?.model_name} required className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>표시 이름</label>
        <input name="display_name" defaultValue={model?.display_name} required className={fieldClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>입력 $/1M 토큰</label>
          <input name="input_price_per_mtok" type="number" step="0.001" min={0} defaultValue={model?.input_price_per_mtok ?? 0} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>출력 $/1M 토큰</label>
          <input name="output_price_per_mtok" type="number" step="0.001" min={0} defaultValue={model?.output_price_per_mtok ?? 0} className={fieldClass} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_enabled" defaultChecked={model?.is_enabled ?? true} /> 활성화
      </label>
      {state && !state.ok && <p className="text-sm text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "저장 중…" : "저장"}</Button>
    </form>
  );
}
