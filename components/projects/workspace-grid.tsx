"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass, Modal } from "@/components/ui/modal";
import type { ActionResult } from "@/lib/actions/admin";
import { deleteWorkspace } from "@/lib/actions/workspaces";
import type { Workspace } from "@/types";
import { WorkspaceForm } from "./workspace-form";

export type WorkspaceCard = Workspace & { employees: number; queued: number; done: number };

function DeleteForm({ workspace, onDone }: { workspace: Workspace; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(deleteWorkspace, null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={workspace.id} />
      <p className="text-sm text-slate-300">
        직원·업무·작업·결과물이 <b className="text-red-300">모두 영구 삭제</b>됩니다. 계속하려면 프로젝트 이름 <b>{workspace.name}</b>을 입력하세요.
      </p>
      <input name="confirm_name" autoComplete="off" className={fieldClass} />
      {state && !state.ok && <p className="text-sm text-red-400">{state.error}</p>}
      <Button type="submit" variant="destructive" disabled={pending}>{pending ? "삭제 중…" : "영구 삭제"}</Button>
    </form>
  );
}

// 프로젝트 목록 + 만들기. 카드를 누르면 그 프로젝트의 오피스로 들어간다.
export function WorkspaceGrid({ workspaces, isAdmin }: { workspaces: WorkspaceCard[]; isAdmin: boolean }) {
  const [modal, setModal] = useState<{ kind: "new" } | { kind: "edit" | "delete"; ws: Workspace } | null>(
    // 프로젝트가 하나도 없으면 바로 만들기부터
    workspaces.length === 0 && isAdmin ? { kind: "new" } : null,
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((w) => (
          <div key={w.id} className="group relative flex flex-col rounded-xl border border-cyan-500/30 bg-[#0b1020]/80 p-5 transition-colors hover:border-cyan-400/70">
            <Link href={`/p/${w.id}`} className="absolute inset-0 rounded-xl" aria-label={`${w.name} 오피스로 이동`} />
            <h2 className="text-lg font-semibold text-slate-50">{w.name}</h2>
            {w.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{w.description}</p>}
            <p className="mt-2 truncate text-xs">
              {w.github_repo ? (
                <span className="text-cyan-300">github.com/{w.github_repo}</span>
              ) : (
                <span className="text-slate-500">GitHub 저장소 미연결</span>
              )}
            </p>
            <div className="mt-4 flex gap-4 text-xs text-slate-400">
              <span>직원 {w.employees}</span>
              <span>대기 작업 {w.queued}</span>
              <span>완료 {w.done}</span>
            </div>
            {isAdmin && (
              <div className="relative mt-4 flex gap-2 opacity-70 group-hover:opacity-100">
                <Button size="sm" variant="ghost" onClick={() => setModal({ kind: "edit", ws: w })}>수정</Button>
                <Button size="sm" variant="ghost" className="text-red-300" onClick={() => setModal({ kind: "delete", ws: w })}>삭제</Button>
              </div>
            )}
          </div>
        ))}

        {isAdmin && (
          <button
            onClick={() => setModal({ kind: "new" })}
            className="flex min-h-[10rem] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/5"
          >
            <span className="text-3xl leading-none">+</span>
            <span className="text-sm">새 프로젝트 만들기</span>
          </button>
        )}
        {workspaces.length === 0 && !isAdmin && (
          <p className="text-sm text-slate-400">아직 프로젝트가 없습니다. 관리자가 프로젝트를 만들면 여기에 나타납니다.</p>
        )}
      </div>

      <Modal open={modal?.kind === "new"} title="새 프로젝트" onClose={() => setModal(null)}>
        <WorkspaceForm />
      </Modal>
      <Modal open={modal?.kind === "edit"} title="프로젝트 수정" onClose={() => setModal(null)}>
        {modal?.kind === "edit" && <WorkspaceForm key={modal.ws.id} workspace={modal.ws} onDone={() => setModal(null)} />}
      </Modal>
      <Modal open={modal?.kind === "delete"} title="프로젝트 삭제" onClose={() => setModal(null)}>
        {modal?.kind === "delete" && <DeleteForm workspace={modal.ws} onDone={() => setModal(null)} />}
      </Modal>
    </>
  );
}
