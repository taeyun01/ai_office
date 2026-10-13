"use client";

import { Instance, Instances } from "@react-three/drei";
import type { SceneEmployee } from "./types";

// 모든 책상·의자·모니터를 부품별 InstancedMesh 하나씩으로 그린다 (§8 인스턴싱).
// 각 부품은 좌석 기준 상대 위치(desk.tsx 와 동일 수치). 모니터 화면은 켜짐/꺼짐 두 그룹.
type Part = { geo: [number, number, number] | ["cyl", number, number, number]; pos: [number, number, number]; color: string };
const PARTS: Part[] = [
  { geo: [1.6, 0.06, 0.8], pos: [0, 0.72, -0.9], color: "#c8a97e" },   // 상판
  { geo: [0.06, 0.7, 0.7], pos: [-0.7, 0.35, -0.9], color: "#6b5b45" }, // 다리
  { geo: [0.06, 0.7, 0.7], pos: [0.7, 0.35, -0.9], color: "#6b5b45" },
  { geo: [0.7, 0.45, 0.04], pos: [0, 1.05, -1.15], color: "#1f2937" },  // 모니터 본체
  { geo: [0.1, 0.12, 0.1], pos: [0, 0.8, -1.15], color: "#374151" },    // 모니터 받침
  { geo: [0.55, 0.08, 0.55], pos: [0, 0.42, 0], color: "#334155" },     // 의자 좌판
  { geo: [0.55, 0.55, 0.08], pos: [0, 0.7, 0.25], color: "#334155" },   // 등받이
  { geo: ["cyl", 0.04, 0.04, 0.4], pos: [0, 0.2, 0], color: "#6b7280" }, // 의자 기둥
];
const SCREEN_POS: [number, number, number] = [0, 1.05, -1.125];

function PartInstances({ part, employees, onSelect }: { part: Part; employees: SceneEmployee[]; onSelect: (id: string) => void }) {
  return (
    <Instances limit={200} castShadow receiveShadow>
      {part.geo[0] === "cyl" ? (
        <cylinderGeometry args={[part.geo[1], part.geo[2], part.geo[3]]} />
      ) : (
        <boxGeometry args={part.geo as [number, number, number]} />
      )}
      <meshStandardMaterial color={part.color} />
      {employees.map((e) => (
        <Instance
          key={e.id}
          position={[e.seat_x + part.pos[0], part.pos[1], e.seat_z + part.pos[2]]}
          onClick={(ev) => { ev.stopPropagation(); onSelect(e.id); }}
        />
      ))}
    </Instances>
  );
}

export function Desks({ employees, onSelect }: { employees: SceneEmployee[]; onSelect: (id: string) => void }) {
  const on = employees.filter((e) => e.status === "working");
  const off = employees.filter((e) => e.status !== "working");
  return (
    <>
      {PARTS.map((p, i) => (
        <PartInstances key={i} part={p} employees={employees} onSelect={onSelect} />
      ))}
      {/* 화면: working이면 시안 발광 */}
      {[{ list: on, color: "#22d3ee", glow: 0.9 }, { list: off, color: "#111827", glow: 0 }].map((g) => (
        <Instances key={g.color} limit={200}>
          <planeGeometry args={[0.62, 0.37]} />
          <meshStandardMaterial color={g.color} emissive={g.color} emissiveIntensity={g.glow} />
          {g.list.map((e) => (
            <Instance key={e.id} position={[e.seat_x + SCREEN_POS[0], SCREEN_POS[1], e.seat_z + SCREEN_POS[2]]} />
          ))}
        </Instances>
      ))}
    </>
  );
}
