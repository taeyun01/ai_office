import type { Department } from "@/types";

// 부서 구역 안의 좌석 슬롯. 시드 좌석(-3, 0, 3 / dz 0)과 같은 격자.
const COLS = [-3, 0, 3];
const ROWS = [0, 2.5];

export function pickSeat(
  dept: Pick<Department, "position_x" | "position_z">,
  taken: { seat_x: number; seat_z: number }[],
): { seat_x: number; seat_z: number } {
  const used = new Set(taken.map((t) => `${t.seat_x},${t.seat_z}`));
  for (const dz of ROWS) {
    for (const dx of COLS) {
      const seat = { seat_x: dept.position_x + dx, seat_z: dept.position_z + dz };
      if (!used.has(`${seat.seat_x},${seat.seat_z}`)) return seat;
    }
  }
  // shortcut: 6자리가 다 차면 구역 앞쪽에 한 줄 더 (구역 밖으로 삐져나감), 부서당 7명 넘으면 격자 확장 필요
  return { seat_x: dept.position_x - 3 + (taken.length - 6) * 1.5, seat_z: dept.position_z + 5 };
}

// 새 부서 구역 자리 (10×8). 기존 5개 구역·라운지·회의실과 겹치지 않는 순서.
const DEPARTMENT_SLOTS: [number, number][] = [
  [0, 15],
  [-18, 6],
  [18, 6],
  [-24, -6],
  [24, -6],
];

export function pickDepartmentSlot(taken: Pick<Department, "position_x" | "position_z">[]) {
  const used = new Set(taken.map((d) => `${d.position_x},${d.position_z}`));
  const slot = DEPARTMENT_SLOTS.find(([x, z]) => !used.has(`${x},${z}`));
  if (!slot) throw new Error("오피스에 새 부서를 놓을 자리가 없습니다. (최대 10개 부서)");
  return { position_x: slot[0], position_z: slot[1], width: 10, depth: 8 };
}
