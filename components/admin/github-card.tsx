"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/admin";
import { deleteGithubToken, setGithubToken, verifyGithub } from "@/lib/actions/github";
import type { Workspace } from "@/types";

// 프로젝트의 GitHub 연동: 저장소 + 토큰(Vault) + 점검. 토큰 값은 다시 보여주지 않는다.
export function GithubCard({ workspace }: { workspace: Workspace }) {
  const [setState, setAction, saving] = useActionState<ActionResult, FormData>(setGithubToken, null);
  const [checkState, checkAction, checking] = useActionState<ActionResult, FormData>(verifyGithub, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (setState) formRef.current?.reset();
  }, [setState]);
  const state = checkState ?? setState;
  const hasToken = workspace.github_secret_id !== null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">GitHub 연동</h2>
        <span className="text-xs text-muted-foreground">
          {workspace.github_repo ? (
            <a className="text-cyan-300 hover:underline" href={`https://github.com/${workspace.github_repo}`} target="_blank" rel="noreferrer">
              {workspace.github_repo}
            </a>
          ) : (
            "저장소 미설정 (프로젝트 목록 → 수정에서 입력)"
          )}
          {" · "}
          {hasToken ? `토큰 ${workspace.github_token_hint}` : "토큰 없음"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        &lsquo;코드 작업 담당&rsquo; 직원의 작업은 이 저장소에 이슈로 올라가고, 저장소의 Claude Code가 PR을 만듭니다. PR이 올라오면 5분 안에 작업이 완료로 바뀌고 결과물에 PR 링크가 남습니다.
      </p>
      <form ref={formRef} action={setAction} className="flex gap-2">
        <input type="hidden" name="workspace_id" value={workspace.id} />
        <input
          name="token"
          type="password"
          autoComplete="off"
          required
          minLength={20}
          placeholder={hasToken ? "새 토큰으로 교체" : "GitHub fine-grained 토큰 (github_pat_…)"}
          className="flex-1 rounded-md border px-2 py-1 text-sm"
        />
        <Button size="sm" type="submit" disabled={saving}>{saving ? "저장 중…" : hasToken ? "교체" : "등록"}</Button>
      </form>
      <div className="flex gap-2">
        <form action={checkAction}>
          <input type="hidden" name="workspace_id" value={workspace.id} />
          <Button size="sm" variant="outline" type="submit" disabled={checking || !hasToken}>{checking ? "점검 중…" : "연결 점검"}</Button>
        </form>
        {hasToken && (
          <form action={deleteGithubToken} onSubmit={(e) => { if (!confirm("GitHub 토큰을 삭제할까요? 코드 작업은 실패 처리됩니다.")) e.preventDefault(); }}>
            <input type="hidden" name="workspace_id" value={workspace.id} />
            <Button size="sm" variant="destructive" type="submit">토큰 삭제</Button>
          </form>
        )}
      </div>
      {state && (
        <p className={`text-sm ${state.ok ? "text-green-500" : "text-amber-300"}`}>
          {state.ok ? "연결 정상: 저장소 접근·ai-office 라벨·워크플로 확인됨" : state.error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        설정 방법은 저장소의 <code>docs/github-setup.md</code>를 보세요.
      </p>
    </section>
  );
}
