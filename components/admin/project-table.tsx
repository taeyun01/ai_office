"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { ActionResult } from "@/lib/actions/admin";
import { deleteProject } from "@/lib/actions/projects";
import type { Department, Project } from "@/types";
import { ProjectForm } from "./project-form";

const STATUS_LABEL = { planning: "기획", active: "진행 중", done: "완료" } as const;

export type ProjectRow = Project & { taskTotal: number; taskDone: number };

export function ProjectTable({ projects, departments }: { projects: ProjectRow[]; departments: Department[] }) {
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [delState, delAction] = useActionState<ActionResult, FormData>(deleteProject, null);
  const dept = (id: string) => departments.find((d) => d.id === id);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">프로젝트 ({projects.length})</h2>
        <Button size="sm" onClick={() => setEditing("new")}>프로젝트 추가</Button>
      </div>
      {delState && !delState.ok && <p className="mb-2 text-sm text-red-400">{delState.error}</p>}
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1">이름</th><th>부서</th><th>상태</th>
            <th className="text-right">작업 (완료/전체)</th><th className="text-right">매출</th><th></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const d = dept(p.department_id);
            return (
              <tr key={p.id} className={`border-t ${p.status === "done" ? "text-muted-foreground" : ""}`}>
                <td className="py-1.5">
                  <div className="font-medium">{p.name}</div>
                  {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                </td>
                <td><span style={{ color: d?.color }}>{d?.name}</span></td>
                <td>{STATUS_LABEL[p.status]}</td>
                <td className="text-right">{p.taskDone} / {p.taskTotal}</td>
                <td className="text-right">${Number(p.revenue).toLocaleString()}</td>
                <td className="flex justify-end gap-1 py-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>수정</Button>
                  <form
                    action={delAction}
                    onSubmit={(e) => { if (!confirm(`'${p.name}' 프로젝트를 삭제할까요?`)) e.preventDefault(); }}
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <Button size="sm" variant="outline" type="submit" disabled={p.taskTotal > 0} title={p.taskTotal > 0 ? "작업이 있는 프로젝트는 삭제할 수 없습니다" : undefined}>
                      삭제
                    </Button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Modal open={editing !== null} title={editing === "new" ? "프로젝트 추가" : "프로젝트 수정"} onClose={() => setEditing(null)}>
        <ProjectForm
          key={editing === "new" || editing === null ? "new" : editing.id}
          project={editing === "new" || editing === null ? undefined : editing}
          departments={departments}
          onDone={() => setEditing(null)}
        />
      </Modal>
    </section>
  );
}
