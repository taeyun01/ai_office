"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteEmployee, setEmployeePaused } from "@/lib/actions/admin";
import { useOfficeStore } from "@/stores/office-store";
import type { LlmProvider, Task } from "@/types";
import { EmployeeForm } from "./employee-form";
import { TaskForm } from "./task-form";

const STATUS_LABEL = { idle: "대기", working: "작업 중", resting: "휴식", paused: "일시정지" } as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

// 선택한 직원의 오른쪽 사이드 패널. admin이면 수정/일시정지/삭제/작업 지시 버튼이 붙는다.
export function EmployeePanel({
  isAdmin,
  providerHasKey,
}: {
  isAdmin: boolean;
  providerHasKey: Partial<Record<LlmProvider["provider"], boolean>>;
}) {
  const id = useOfficeStore((s) => s.selectedEmployeeId);
  const employee = useOfficeStore((s) => (id ? s.employees[id] : undefined));
  const departments = useOfficeStore((s) => s.departments);
  const llmModels = useOfficeStore((s) => s.llmModels);
  const projects = useOfficeStore((s) => s.projects);
  const employees = useOfficeStore((s) => s.employees);
  const tasks = useOfficeStore((s) => s.tasks);
  const taskLogs = useOfficeStore((s) => s.taskLogs);
  const select = useOfficeStore((s) => s.select);
  const [modal, setModal] = useState<"edit" | "task" | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  if (!employee) return null;

  const dept = departments.find((d) => d.id === employee.department_id);
  const model = llmModels.find((m) => m.id === employee.model_id);
  const myTasks = Object.values(tasks).filter((t) => t.assigned_employee_id === employee.id);
  const current = employee.current_task_id ? tasks[employee.current_task_id] : undefined;
  const done = myTasks.filter((t) => t.status === "done" && t.result);
  const logs = Object.values(taskLogs)
    .filter((l) => l.employee_id === employee.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);
  const paused = employee.status === "paused";

  return (
    <aside className="absolute bottom-4 right-4 top-16 flex w-80 flex-col gap-4 overflow-y-auto rounded-xl border border-cyan-500/40 bg-[#0b1020]/85 p-4 text-slate-100 backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">{employee.name}</h2>
          <p className="text-sm text-slate-400">{employee.role}</p>
        </div>
        <button onClick={() => select(null)} className="text-slate-400 hover:text-white" aria-label="닫기">✕</button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Row label="부서"><span style={{ color: dept?.color }}>{dept?.name}</span></Row>
        <Row label="상태">{STATUS_LABEL[employee.status]}</Row>
        <Row label="모델">{model?.display_name ?? "-"}</Row>
        <Row label="현재 작업">{current?.title ?? "없음"}</Row>
        <Row label="에너지">{employee.energy}%</Row>
        <Row label="오늘 토큰">
          {employee.tokens_used_today.toLocaleString()} / {employee.daily_token_limit.toLocaleString()}
        </Row>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setModal("task")}>작업 지시</Button>
          <Button size="sm" variant="outline" onClick={() => setModal("edit")}>수정</Button>
          <form action={setEmployeePaused}>
            <input type="hidden" name="id" value={employee.id} />
            <input type="hidden" name="paused" value={String(!paused)} />
            <Button size="sm" variant="outline" type="submit">{paused ? "재개" : "일시정지"}</Button>
          </form>
          <form
            action={deleteEmployee}
            onSubmit={(e) => {
              if (!confirm(`${employee.name} 직원을 삭제할까요? 이 직원의 작업 ${myTasks.length}개도 함께 삭제됩니다.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={employee.id} />
            <Button size="sm" variant="destructive" type="submit">삭제</Button>
          </form>
        </div>
      )}

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase text-slate-400">작업 ({myTasks.length})</h3>
        <ul className="flex flex-col gap-1 text-sm">
          {myTasks.map((t) => (
            <li key={t.id} className="flex justify-between gap-2">
              <span className="truncate">{t.title}</span>
              <span className="shrink-0 text-xs text-slate-400">{t.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase text-slate-400">완료 결과물 ({done.length})</h3>
        <ul className="flex flex-col gap-1 text-sm">
          {done.map((t) => (
            <li key={t.id}>
              <button onClick={() => setOpenTask(t)} className="text-left text-cyan-300 hover:underline">{t.title}</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase text-slate-400">최근 로그</h3>
        <ul className="flex flex-col gap-1 text-xs text-slate-300">
          {logs.length === 0 && <li className="text-slate-500">아직 로그가 없습니다.</li>}
          {logs.map((l) => (
            <li key={l.id}>
              <span className={l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-amber-300" : "text-slate-500"}>
                [{l.level}]
              </span>{" "}
              {l.message}
            </li>
          ))}
        </ul>
      </section>

      <Modal open={modal === "edit"} title="직원 수정" onClose={() => setModal(null)}>
        <EmployeeForm
          employee={employee}
          departments={departments}
          llmModels={llmModels}
          providerHasKey={providerHasKey}
          onDone={() => setModal(null)}
        />
      </Modal>
      <Modal open={modal === "task"} title="작업 지시" onClose={() => setModal(null)}>
        <TaskForm
          projects={projects}
          employees={Object.values(employees)}
          defaultEmployeeId={employee.id}
          onDone={() => setModal(null)}
        />
      </Modal>
      <Modal open={!!openTask} title={openTask?.title ?? ""} onClose={() => setOpenTask(null)} wide>
        <pre className="whitespace-pre-wrap text-sm text-slate-200">{openTask?.result}</pre>
      </Modal>
    </aside>
  );
}
