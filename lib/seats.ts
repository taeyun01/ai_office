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
