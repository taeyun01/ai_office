"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/modal";
import type { ActionResult } from "@/lib/actions/admin";
import { saveProject } from "@/lib/actions/projects";
import type { Department, Project } from "@/types";

// 업무 추가·수정 공용 폼
export function ProjectForm({
  project,
  departments,
  onDone,
}: {
  project?: Project;
  departments: Department[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveProject, null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-3">
      {project && <input type="hidden" name="id" value={project.id} />}
      <div>
        <label className={labelClass}>이름</label>
        <input name="name" defaultValue={project?.name} required className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>설명</label>
        <textarea name="description" defaultValue={project?.description ?? ""} rows={3} className={fieldClass} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>부서</label>
          <select name="department_id" defaultValue={project?.department_id} className={fieldClass}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>상태</label>
          <select name="status" defaultValue={project?.status ?? "planning"} className={fieldClass}>
            <option value="planning">기획</option>
            <option value="active">진행 중</option>
            <option value="done">완료</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>매출 (USD)</label>
          <input name="revenue" type="number" min={0} step="1" defaultValue={project?.revenue ?? 0} className={fieldClass} />
        </div>
      </div>
      {state && !state.ok && <p className="text-sm text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "저장 중…" : "저장"}</Button>
    </form>
  );
}
