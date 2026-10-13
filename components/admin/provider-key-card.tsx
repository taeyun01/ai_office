"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/admin";
import { deleteProviderKey, setProviderKey, verifyProviderKey } from "@/lib/actions/models";
import type { LlmProvider } from "@/types";

const LABEL: Record<LlmProvider["provider"], string> = { anthropic: "Claude", openai: "GPT", google: "Gemini" };

// 제공사별 API 키 카드 (§7.8). 키 전체 값은 저장 후 다시 보여주지 않는다.
export function ProviderKeyCard({ row, updatedByName }: { row: LlmProvider; updatedByName?: string | null }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(setProviderKey, null);
  const formRef = useRef<HTMLFormElement>(null);
  // 저장 결과와 관계없이 입력창은 비운다 (키를 화면에 남기지 않음)
  useEffect(() => {
    if (state) formRef.current?.reset();
  }, [state]);

  const has = row.vault_secret_id !== null;
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{LABEL[row.provider]}</h3>
        <span className={`text-xs ${has ? "text-green-600" : "text-muted-foreground"}`}>
          {has ? `등록됨 ${row.key_hint}` : "미등록"}
        </span>
      </div>
      <dl className="text-xs text-muted-foreground">
        <div className="flex justify-between">
          <dt>연결 테스트</dt>
          <dd>
            {row.last_verified_at
              ? `${row.last_verified_ok ? "성공" : "실패"} · ${new Date(row.last_verified_at).toLocaleString("ko-KR")}`
              : "-"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>마지막 변경</dt>
          <dd>{updatedByName ?? "-"}</dd>
        </div>
      </dl>
      <form ref={formRef} action={action} className="flex gap-2">
        <input type="hidden" name="provider" value={row.provider} />
        <input
          name="key"
          type="password"
          autoComplete="off"
          required
          minLength={8}
          placeholder={has ? "새 키로 교체" : "API 키 입력"}
          className="flex-1 rounded-md border px-2 py-1 text-sm"
        />
        <Button size="sm" type="submit" disabled={pending}>{pending ? "저장 중…" : has ? "교체" : "등록"}</Button>
      </form>
      {state && (
        <p className={`text-xs ${state.ok ? "text-green-600" : "text-red-500"}`}>
          {state.ok ? "저장 및 연결 테스트 성공" : state.error}
        </p>
      )}
      {has && (
        <div className="flex gap-2">
          <form action={verifyProviderKey}>
            <input type="hidden" name="provider" value={row.provider} />
            <Button size="sm" variant="outline" type="submit">연결 테스트</Button>
          </form>
          <form
            action={deleteProviderKey}
            onSubmit={(e) => { if (!confirm(`${LABEL[row.provider]} 키를 삭제할까요? 이 제공사 모델의 작업은 실패 처리됩니다.`)) e.preventDefault(); }}
          >
            <input type="hidden" name="provider" value={row.provider} />
            <Button size="sm" variant="destructive" type="submit">키 삭제</Button>
          </form>
        </div>
      )}
    </div>
  );
}
