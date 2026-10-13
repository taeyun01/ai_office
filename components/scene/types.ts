import type { Department, Employee } from "@/types";

// 씬 컴포넌트는 이 두 타입만 props로 받는다. DB 호출 금지.
export type SceneDepartment = Pick<
  Department,
  "id" | "name" | "slug" | "color" | "position_x" | "position_z" | "width" | "depth"
>;

export type SceneEmployee = Pick<
  Employee,
  "id" | "name" | "role" | "status" | "seat_x" | "seat_z" | "department_id" | "in_meeting"
>;

// 맵 경계 (부서 구역 시드 + 라운지/회의실 기준)
export const MAP_BOUNDS = { minX: -16, maxX: 16, minZ: -8, maxZ: 16 } as const;

// 라운지(휴게 공간): 소파 앞에 resting 직원이 앉는다
export const LOUNGE = { x: -11, z: 15, w: 10, d: 6 } as const;
export const REST_AREA = { x: LOUNGE.x, z: LOUNGE.z + 0.9, slotGap: 1.1 } as const;

// 회의실: 큰 테이블 둘레로 호출된 직원이 앉는다
export const MEETING_ROOM = { x: 11, z: 15, w: 10, d: 6 } as const;
export function meetingSlot(i: number): { x: number; z: number; faceZ: number } {
  // 테이블 양 옆 4자리씩(8), 그 뒤로 한 줄 더
  const side = i % 2 === 0 ? -1 : 1;
  const col = Math.floor(i / 2) % 4;
  const row = Math.floor(i / 8);
  return {
    x: MEETING_ROOM.x - 1.8 + col * 1.2,
    z: MEETING_ROOM.z + side * (1.3 + row * 1.1),
    faceZ: MEETING_ROOM.z,
  };
}
