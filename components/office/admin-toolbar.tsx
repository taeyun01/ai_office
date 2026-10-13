"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { runEngineNow, setGlobalPaused } from "@/lib/actions/engine";
import { useOfficeStore } from "@/stores/office-store";
import type { LlmProvider } from "@/types";
import { EmployeeForm } from "./employee-form";
import { MeetingPanel } from "./meeting-panel";
import { TaskForm } from "./task-form";

// admin 전용 상단 버튼
export function AdminToolbar({
  providerHasKey,
}: {
  providerHasKey: Partial<Record<LlmProvider["provider"], boolean>>;
}) {
  const globalPaused = useOfficeStore((s) => s.budget?.global_paused ?? false);
  const [modal, setModal] = useState<"hire" | "task" | "meeting" | null>(null);
  const [running, startRun] = useTransition();
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const departments = useOfficeStore((s) => s.departments);
  const llmModels = useOfficeStore((s) => s.llmModels);
  const projects = useOfficeStore((s) => s.projects);
  const employees = useOfficeStore((s) => s.employees);

  const run = () =>
    startRun(async () => {
      try {
        await runEngineNow();
        setRunMsg("엔진 실행 요청됨");
      } catch (e) {
        setRunMsg(e instanceof Error ? e.message : "실패");
      }
      setTimeout(() => setRunMsg(null), 4000);
    });

  return (
    <div className="flex items-center gap-2">
      <Link href="/admin/users" className="text-xs text-slate-300 hover:underline">사용자</Link>
      <Link href="/admin/models" className="text-xs text-slate-300 hover:underline">모델 · 키</Link>
      <Link href="/admin/costs" className="text-xs text-slate-300 hover:underline">비용</Link>
      <Button size="sm" onClick={() => setModal("hire")}>직원 채용</Button>
      <Button size="sm" variant="outline" onClick={() => setModal("task")}>작업 지시</Button>
      <Button size="sm" variant="outline" onClick={() => setModal("meeting")}>회의 소집</Button>
      <Button size="sm" variant="outline" onClick={run} disabled={running || globalPaused} title={globalPaused ? "긴급 정지 중" : undefined}>
        {running ? "실행 중…" : "지금 실행"}
      </Button>
      <form action={setGlobalPaused}>
        <input type="hidden" name="paused" value={String(!globalPaused)} />
        <Button size="sm" variant={globalPaused ? "destructive" : "outline"} type="submit">
          {globalPaused ? "긴급 정지 해제" : "긴급 정지"}
        </Button>
      </form>
      {runMsg && <span className="text-xs text-cyan-300">{runMsg}</span>}
      <Modal open={modal === "hire"} title="신규 AI 직원 채용" onClose={() => setModal(null)}>
        <EmployeeForm departments={departments} llmModels={llmModels} providerHasKey={providerHasKey} onDone={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "meeting"} title="회의실로 호출" onClose={() => setModal(null)}>
        <MeetingPanel onDone={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "task"} title="작업 지시" onClose={() => setModal(null)}>
        <TaskForm projects={projects} employees={Object.values(employees)} onDone={() => setModal(null)} />
      </Modal>
    </div>
  );
}
