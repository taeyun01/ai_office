"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/modal";
import type { ActionResult } from "@/lib/actions/admin";
import { createWorkspace, updateWorkspace } from "@/lib/actions/workspaces";
import type { Workspace } from "@/types";

// 프로젝트(= 오피스) 만들기·수정 공용 폼
export function WorkspaceForm({ workspace, onDone }: { workspace?: Workspace; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    workspace ? updateWorkspace : createWorkspace,
    null,
  );
  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-3">
      {workspace && <input type="hidden" name="id" value={workspace.id} />}
      <div>
        <label className={labelClass}>프로젝트 이름</label>
        <input name="name" defaultValue={workspace?.name} required placeholder="예: 바삭치킨 웹사이트" className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>설명 (선택)</label>
        <textarea name="description" defaultValue={workspace?.description ?? ""} rows={2} className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>GitHub 저장소 (선택)</label>
        <input
          name="github_repo"
          defaultValue={workspace?.github_repo ?? ""}
          placeholder="https://github.com/owner/repo"
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-slate-500">AI 직원들이 이 저장소에서 작업하고 PR을 올리게 됩니다(연동 설정은 다음 단계).</p>
      </div>
      {!workspace && (
        <p className="text-xs text-slate-400">기본 팀(개발·디자인·콘텐츠·데이터·재무, 직원 15명)으로 시작합니다. 만든 뒤 채용·해고로 바꿀 수 있어요.</p>
      )}
      {state && !state.ok && <p className="text-sm text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? (workspace ? "저장 중…" : "오피스 만드는 중…") : workspace ? "저장" : "프로젝트 만들고 오피스로 이동"}
      </Button>
    </form>
  );
}
