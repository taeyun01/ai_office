"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toggleModel } from "@/lib/actions/models";
import type { LlmModel } from "@/types";
import { ModelForm } from "./model-form";

const LABEL = { anthropic: "Claude", openai: "GPT", google: "Gemini" } as const;

export function ModelTable({ models }: { models: LlmModel[] }) {
  const [editing, setEditing] = useState<LlmModel | "new" | null>(null);
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">모델 ({models.length})</h2>
        <Button size="sm" onClick={() => setEditing("new")}>모델 추가</Button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1">제공사</th><th>표시 이름</th><th>모델 ID</th><th>등급</th>
            <th className="text-right">입력 $/1M</th><th className="text-right">출력 $/1M</th><th></th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id} className={`border-t ${m.is_enabled ? "" : "text-muted-foreground"}`}>
              <td className="py-1.5">{LABEL[m.provider]}</td>
              <td>{m.display_name}</td>
              <td className="font-mono text-xs">{m.model_name}</td>
              <td>{m.tier}</td>
              <td className="text-right">{m.input_price_per_mtok}</td>
              <td className="text-right">{m.output_price_per_mtok}</td>
              <td className="flex justify-end gap-1 py-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>수정</Button>
                <form action={toggleModel}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="enabled" value={String(!m.is_enabled)} />
                  <Button size="sm" variant="outline" type="submit">{m.is_enabled ? "비활성화" : "활성화"}</Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={editing !== null} title={editing === "new" ? "모델 추가" : "모델 수정"} onClose={() => setEditing(null)}>
        <ModelForm model={editing === "new" || editing === null ? undefined : editing} onDone={() => setEditing(null)} />
      </Modal>
    </section>
  );
}
