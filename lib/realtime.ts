"use client";

import { createClient } from "@/lib/supabase/client";
import { useOfficeStore } from "@/stores/office-store";
import type { BudgetSettings, Department, Employee, Project, Task, TaskLog } from "@/types";

const TABLES = {
  employees: "employees",
  tasks: "tasks",
  task_logs: "taskLogs",
} as const;

// 한 프로젝트(workspace)의 변경만 구독해 스토어에 반영. 해제 함수를 돌려준다.
export function subscribeOffice(workspaceId: string) {
  const supabase = createClient();
  const { upsert, remove, setBudget, upsertProject, removeProject, upsertDepartment } = useOfficeStore.getState();
  const channel = supabase.channel(`office-${workspaceId}`);
  const filter = `workspace_id=eq.${workspaceId}`;

  for (const [table, key] of Object.entries(TABLES) as [keyof typeof TABLES, (typeof TABLES)[keyof typeof TABLES]][]) {
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table, filter },
      (payload) => upsert(key, payload.new as Employee | Task | TaskLog),
    );
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table, filter },
      (payload) => upsert(key, payload.new as Employee | Task | TaskLog),
    );
    // 다른 프로젝트의 삭제 이벤트도 오지만, 스토어에 없는 id라 무시된다
    channel.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table },
      (payload) => remove(key, String(payload.old.id)),
    );
  }
  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "projects", filter },
    (payload) => upsertProject(payload.new as Project),
  );
  channel.on(
    "postgres_changes",
    { event: "DELETE", schema: "public", table: "projects" },
    (payload) => removeProject(String(payload.old.id)),
  );
  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "departments", filter },
    (payload) => upsertDepartment(payload.new as Department),
  );
  channel.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "budget_settings", filter },
    (payload) => setBudget(payload.new as BudgetSettings),
  );

  // RLS가 적용된 변경을 받으려면 사용자 JWT로 채널에 들어가야 한다 (anon 키로 들어가면 아무것도 안 옴)
  let cancelled = false;
  supabase.auth.getSession().then(({ data }) => {
    // StrictMode의 mount→unmount→mount 사이에 해제됐으면 구독하지 않는다 (같은 topic 중복 join 방지)
    if (cancelled) return;
    if (data.session) supabase.realtime.setAuth(data.session.access_token);
    channel.subscribe((status, err) => {
      if (status !== "SUBSCRIBED") console.warn("[realtime]", status, err?.message);
    });
  });

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}
