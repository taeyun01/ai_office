import { create } from "zustand";
import type { BudgetSettings, Department, Employee, LlmModel, Project, Task, TaskLog } from "@/types";

type RowMap<T extends { id: string }> = Record<string, T>;

export type OfficeState = {
  departments: Department[];
  projects: Project[];
  llmModels: LlmModel[];
  budget: BudgetSettings | null;
  employees: RowMap<Employee>;
  tasks: RowMap<Task>;
  taskLogs: RowMap<TaskLog>;
  selectedEmployeeId: string | null;
  hydrate: (data: {
    departments: Department[];
    projects: Project[];
    llmModels: LlmModel[];
    budget: BudgetSettings;
    employees: Employee[];
    tasks: Task[];
    taskLogs: TaskLog[];
  }) => void;
  select: (id: string | null) => void;
  setBudget: (b: BudgetSettings) => void;
  upsertProject: (p: Project) => void;
  removeProject: (id: string) => void;
  // Realtime 변경을 그대로 반영. 바뀐 row만 교체하므로 다른 직원 객체는 참조가 유지된다.
  upsert: (table: "employees" | "tasks" | "taskLogs", row: Employee | Task | TaskLog) => void;
  remove: (table: "employees" | "tasks" | "taskLogs", id: string) => void;
};

const byId = <T extends { id: string }>(rows: T[]): RowMap<T> =>
  Object.fromEntries(rows.map((r) => [r.id, r]));

export const useOfficeStore = create<OfficeState>((set) => ({
  departments: [],
  projects: [],
  llmModels: [],
  budget: null,
  employees: {},
  tasks: {},
  taskLogs: {},
  selectedEmployeeId: null,
  hydrate: (d) =>
    set({
      departments: d.departments,
      projects: d.projects,
      llmModels: d.llmModels,
      budget: d.budget,
      employees: byId(d.employees),
      tasks: byId(d.tasks),
      taskLogs: byId(d.taskLogs),
    }),
  select: (id) => set({ selectedEmployeeId: id }),
  setBudget: (budget) => set({ budget }),
  upsertProject: (p) =>
    set((s) => ({
      projects: s.projects.some((x) => x.id === p.id)
        ? s.projects.map((x) => (x.id === p.id ? p : x))
        : [...s.projects, p],
    })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter((x) => x.id !== id) })),
  upsert: (table, row) => set((s) => ({ [table]: { ...s[table], [row.id]: row } })),
  remove: (table, id) =>
    set((s) => {
      const next = { ...s[table] };
      delete next[id];
      return {
        [table]: next,
        selectedEmployeeId:
          table === "employees" && s.selectedEmployeeId === id ? null : s.selectedEmployeeId,
      };
    }),
}));
