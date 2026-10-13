"use client";

import { useState } from "react";
import { fieldClass, labelClass } from "@/components/ui/modal";
import { NEW_PROJECT } from "@/lib/constants";
import { useOfficeStore } from "@/stores/office-store";
import type { Project } from "@/types";

// 업무 선택 + "새 업무 만들기" (작업 지시·브리프 공용). 서버는 lib/form-resolvers 가 처리.
export function ProjectSelect({ projects }: { projects: Project[] }) {
  const departments = useOfficeStore((s) => s.departments);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? NEW_PROJECT);
  return (
    <>
      <div>
        <label className={labelClass}>업무</label>
        <select name="project_id" value={projectId} onChange={(e) => setProjectId(e.target.value)} required className={fieldClass}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option value={NEW_PROJECT}>+ 새 업무 만들기</option>
        </select>
      </div>
      {projectId === NEW_PROJECT && (
        <div className="grid grid-cols-2 gap-3 rounded-md border border-cyan-500/30 p-3">
          <div>
            <label className={labelClass}>새 업무 이름</label>
            <input name="new_project_name" required className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>부서</label>
            <select name="new_project_department_id" required className={fieldClass}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
}
