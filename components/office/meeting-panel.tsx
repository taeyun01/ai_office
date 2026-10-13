"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setMeeting } from "@/lib/actions/admin";
import { useOfficeStore } from "@/stores/office-store";

// 직원을 골라(또는 모두 선택) 회의실로 호출하거나 자리로 돌려보낸다.
export function MeetingPanel({ onDone }: { onDone: () => void }) {
  const employees = useOfficeStore((s) => s.employees);
  const departments = useOfficeStore((s) => s.departments);
  const list = Object.values(employees).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const inMeeting = list.filter((e) => e.in_meeting);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(inMeeting.map((e) => e.id)));
  const [pending, start] = useTransition();
  const allChecked = checked.size === list.length && list.length > 0;

  const submit = (ids: string[], call: boolean) =>
    start(async () => {
      const fd = new FormData();
      ids.forEach((id) => fd.append("ids", id));
      fd.set("in_meeting", String(call));
      await setMeeting(fd);
      onDone();
    });

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => setChecked(e.target.checked ? new Set(list.map((x) => x.id)) : new Set())}
        />
        모두 선택 ({checked.size}/{list.length})
      </label>
      <ul className="max-h-72 overflow-y-auto rounded-md border border-slate-700">
        {list.map((e) => {
          const dept = departments.find((d) => d.id === e.department_id);
          return (
            <li key={e.id}>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/5">
                <input type="checkbox" checked={checked.has(e.id)} onChange={() => toggle(e.id)} />
                <span className="h-2 w-2 rounded-full" style={{ background: dept?.color }} />
                <span className="flex-1">{e.name} <span className="text-slate-400">· {e.role}</span></span>
                {e.in_meeting && <span className="text-xs text-cyan-300">회의 중</span>}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <Button type="button" disabled={pending || checked.size === 0} onClick={() => submit([...checked], true)}>
          {pending ? "처리 중…" : `회의실로 호출 (${checked.size})`}
        </Button>
        <Button type="button" variant="outline" disabled={pending || inMeeting.length === 0} onClick={() => submit(inMeeting.map((e) => e.id), false)}>
          회의 종료 · 자리로 복귀
        </Button>
      </div>
    </div>
  );
}
