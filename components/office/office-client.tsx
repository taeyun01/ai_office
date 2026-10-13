"use client";

import { useEffect, useMemo, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { OfficeScene } from "@/components/scene/office-scene";
import { subscribeOffice } from "@/lib/realtime";
import { useOfficeStore, type OfficeState } from "@/stores/office-store";
import type { LlmProvider } from "@/types";
import { ActivityPanel } from "./activity-panel";
import { AdminToolbar } from "./admin-toolbar";
import { EmployeePanel } from "./employee-panel";
import { KpiBar } from "./kpi-bar";
import { TopBar, type OfficeFilters } from "./top-bar";

type Initial = Parameters<OfficeState["hydrate"]>[0];

export function OfficeClient({
  initial,
  isAdmin,
  providerHasKey,
}: {
  initial: Initial;
  isAdmin: boolean;
  providerHasKey: Partial<Record<LlmProvider["provider"], boolean>>;
}) {
  // 첫 렌더 전에 스토어를 채워 빈 화면이 깜빡이지 않게
  useState(() => useOfficeStore.getState().hydrate(initial));
  useEffect(() => subscribeOffice(), []);

  const departments = useOfficeStore((s) => s.departments);
  const employees = useOfficeStore((s) => s.employees);
  const selectedId = useOfficeStore((s) => s.selectedEmployeeId);
  const select = useOfficeStore((s) => s.select);
  const [filters, setFilters] = useState<OfficeFilters>({
    departmentId: null,
    workingOnly: false,
    showPausedResting: true,
  });

  const visible = useMemo(
    () =>
      Object.values(employees).filter(
        (e) =>
          (!filters.workingOnly || e.status === "working") &&
          (filters.showPausedResting || (e.status !== "paused" && e.status !== "resting")),
      ),
    [employees, filters],
  );
  const focus = useMemo(() => {
    const d = departments.find((x) => x.id === filters.departmentId);
    return d ? { x: d.position_x, z: d.position_z } : null;
  }, [departments, filters.departmentId]);

  return (
    <>
      <OfficeScene
        departments={departments}
        employees={visible}
        selectedId={selectedId}
        onSelect={select}
        focus={focus}
        highlightDepartmentId={filters.departmentId}
      />
      <div className="absolute left-4 top-4">
        <TopBar departments={departments} filters={filters} onChange={setFilters} />
      </div>
      <div className="absolute right-4 top-4 flex items-center gap-2">
        {isAdmin && <AdminToolbar providerHasKey={providerHasKey} />}
        <LogoutButton />
      </div>
      <div className="absolute bottom-4 left-4">
        <KpiBar />
      </div>
      {selectedId ? <EmployeePanel isAdmin={isAdmin} providerHasKey={providerHasKey} /> : <ActivityPanel />}
    </>
  );
}
