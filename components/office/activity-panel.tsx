"use client";

import { useEffect, useState } from "react";
import { useOfficeStore } from "@/stores/office-store";

const elapsed = (from: string, now: number) => {
  const s = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  return s < 60 ? `${s}초` : `${Math.floor(s / 60)}분 ${s % 60}초`;
};
const LEVEL_COLOR = { info: "text-slate-500", warn: "text-amber-300", error: "text-red-400" } as const;

// 오른쪽 작업 현황: 지금 누가 무슨 작업 중인지 + 최근 활동 로그. Realtime 스토어 기반.
export function ActivityPanel() {
  const tasks = useOfficeStore((s) => s.tasks);
  const employees = useOfficeStore((s) => s.employees);
  const departments = useOfficeStore((s) => s.departments);
  const taskLogs = useOfficeStore((s) => s.taskLogs);
  const select = useOfficeStore((s) => s.select);
  const [open, setOpen] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const running = Object.values(tasks)
    .filter((t) => t.status === "running")
    .sort((a, b) => (a.started_at ?? "").localeCompare(b.started_at ?? ""));
  const queued = Object.values(tasks).filter((t) => t.status === "queued").length;
  const logs = Object.values(taskLogs)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 12);

  // 진행 중인 작업이 있을 때만 경과 시간을 1초마다 갱신
  useEffect(() => {
    if (running.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running.length]);

  const colorOf = (employeeId: string) =>
    departments.find((d) => d.id === employees[employeeId]?.department_id)?.color;

  return (
    <aside className="absolute right-4 top-16 flex max-h-[calc(100svh-6rem)] w-80 flex-col overflow-hidden rounded-xl border border-cyan-500/40 bg-[#0b1020]/85 text-slate-100 backdrop-blur">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold">
          작업 현황
          {running.length > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-cyan-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              {running.length}명 작업 중
            </span>
          )}
        </span>
        <span className="text-xs text-slate-400">대기 {queued} · {open ? "접기" : "펼치기"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
          <section>
            <h3 className="mb-1 text-xs font-semibold text-slate-400">진행 중</h3>
            {running.length === 0 ? (
              <p className="text-xs text-slate-500">지금 진행 중인 작업이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {running.map((t) => {
                  const e = employees[t.assigned_employee_id];
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => select(t.assigned_employee_id)}
                        className="w-full rounded-md border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1.5 text-left hover:bg-cyan-500/10"
                      >
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="h-2 w-2 rounded-full" style={{ background: colorOf(t.assigned_employee_id) }} />
                            {e?.name ?? "(알 수 없음)"}
                          </span>
                          <span className="text-xs tabular-nums text-cyan-300">
                            {t.started_at ? elapsed(t.started_at, now) : ""}
                          </span>
                        </div>
                        <div className="truncate text-xs text-slate-300">{t.title}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold text-slate-400">최근 활동</h3>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500">아직 활동이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-xs">
                {logs.map((l) => (
                  <li key={l.id} className="flex gap-1.5">
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {new Date(l.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button onClick={() => select(l.employee_id)} className="shrink-0 font-medium hover:underline">
                      {employees[l.employee_id]?.name ?? "?"}
                    </button>
                    <span className={`truncate ${LEVEL_COLOR[l.level]}`} title={l.message}>
                      {l.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}
