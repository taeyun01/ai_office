"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, MathUtils, Mesh } from "three";
import { REST_AREA, type SceneEmployee } from "./types";

// 로우폴리 아바타. 상태별 애니메이션은 전부 클라이언트에서만 돈다.
export function Avatar({
  employee: e,
  color,
  restSlot,
}: {
  employee: SceneEmployee;
  color: string;
  restSlot: number;
}) {
  const root = useRef<Group>(null);
  const head = useRef<Mesh>(null);
  const armL = useRef<Mesh>(null);
  const armR = useRef<Mesh>(null);
  // 각 아바타의 애니메이션 위상을 어긋나게
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const paused = e.status === "paused";

  useFrame((state, delta) => {
    const g = root.current;
    if (!g) return;
    const t = state.clock.elapsedTime + phase;

    // 목표 위치: resting이면 휴게 공간, 아니면 자기 좌석
    const target: [number, number] =
      e.status === "resting"
        ? [REST_AREA.x + (restSlot - 2) * REST_AREA.slotGap, REST_AREA.z]
        : [e.seat_x, e.seat_z];
    g.position.x = MathUtils.damp(g.position.x, target[0], 2, delta);
    g.position.z = MathUtils.damp(g.position.z, target[1], 2, delta);

    if (paused) return;
    if (head.current) {
      head.current.rotation.y =
        e.status === "idle" ? Math.sin(t * 1.2) * 0.6 : e.status === "working" ? Math.sin(t * 0.5) * 0.1 : 0;
    }
    if (armL.current && armR.current) {
      const typing = e.status === "working";
      armL.current.rotation.x = typing ? -1.2 + Math.sin(t * 14) * 0.15 : 0;
      armR.current.rotation.x = typing ? -1.2 + Math.cos(t * 14) * 0.15 : 0;
    }
    // resting: 가볍게 숨쉬듯 위아래
    g.position.y = e.status === "resting" ? Math.sin(t * 2) * 0.03 : 0;
  });

  const bodyColor = paused ? "#6b7280" : color;
  const skin = paused ? "#9ca3af" : "#f1c7a3";

  return (
    <group ref={root} position={[e.seat_x, 0, e.seat_z]}>
      {/* 몸통 */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[0.42, 0.55, 0.3]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      {/* 머리 */}
      <mesh ref={head} position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* 팔 (어깨를 축으로 회전) */}
      <mesh ref={armL} position={[-0.28, 0.95, 0]} castShadow>
        <boxGeometry args={[0.1, 0.45, 0.1]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh ref={armR} position={[0.28, 0.95, 0]} castShadow>
        <boxGeometry args={[0.1, 0.45, 0.1]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      {/* 다리 */}
      <mesh position={[-0.1, 0.25, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.1, 0.25, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}
