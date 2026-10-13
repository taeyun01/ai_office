"use client";

import { fieldClass } from "@/components/ui/modal";
import type { Department } from "@/types";

export type OfficeFilters = {
  departmentId: string | null;
  workingOnly: boolean;
  showPausedResting: boolean;
};

// 상단 바: 부서 선택기 + 필터 (§7.6)
export function TopBar({
  departments,
  filters,
  onChange,
}: {
  departments: Department[];
  filters: OfficeFilters;
  onChange: (f: OfficeFilters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-cyan-500/30 bg-[#0b1020]/80 px-3 py-2 text-xs text-slate-200 backdrop-blur">
      <select
        aria-label="부서 선택"
        value={filters.departmentId ?? ""}
        onChange={(e) => onChange({ ...filters, departmentId: e.target.value || null })}
        className={`${fieldClass} w-auto py-1`}
      >
        <option value="">전체 부서</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={filters.workingOnly} onChange={(e) => onChange({ ...filters, workingOnly: e.target.checked })} />
        작업 중만
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={filters.showPausedResting} onChange={(e) => onChange({ ...filters, showPausedResting: e.target.checked })} />
        일시정지·휴식 보기
      </label>
    </div>
  );
}
