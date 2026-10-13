"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/modal";
import { createTask, type ActionResult } from "@/lib/actions/admin";
import type { Employee, Project } from "@/types";
import { ProjectSelect } from "./project-select";

export function TaskForm({
  projects,
  employees,
  defaultEmployeeId,
  onDone,
}: {
  projects: Project[];
  employees: Employee[];
  defaultEmployeeId?: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createTask, null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <ProjectSelect projects={projects} />
      <div>
        <label className={labelClass}>담당 직원</label>
        <select name="assigned_employee_id" defaultValue={defaultEmployeeId} required className={fieldClass}>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name} · {e.role}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>제목</label>
        <input name="title" required className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>지시 내용</label>
        <textarea name="instruction" rows={5} required className={fieldClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>작업 유형</label>
          <select name="task_type" className={fieldClass}>
            <option value="simple">simple (분류·요약)</option>
            <option value="complex">complex (기획·코드)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>우선순위 (높을수록 먼저)</label>
          <input name="priority" type="number" defaultValue={0} className={fieldClass} />
        </div>
      </div>
      {state && !state.ok && <p className="text-sm text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "추가 중…" : "작업 추가"}
      </Button>
    </form>
  );
}
