import type { Department, Employee } from "@/types";

// 씬 컴포넌트는 이 두 타입만 props로 받는다. DB 호출 금지.
export type SceneDepartment = Pick<
  Department,
  "id" | "name" | "slug" | "color" | "position_x" | "position_z" | "width" | "depth"
>;

export type SceneEmployee = Pick<
  Employee,
  "id" | "name" | "role" | "status" | "seat_x" | "seat_z" | "department_id"
>;

// 맵 경계와 휴게 공간 위치 (부서 구역 시드 기준)
export const MAP_BOUNDS = { minX: -14, maxX: 14, minZ: -8, maxZ: 14 } as const;
export const REST_AREA = { x: 0, z: 15, slotGap: 1.6 } as const;
