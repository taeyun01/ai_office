"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, MathUtils, Mesh } from "three";
import { meetingSlot, REST_AREA, type SceneEmployee } from "./types";

const WALK_SPEED = 3.4; // units/s
const HAIR = ["#1f2937", "#78350f", "#b45309", "#fbbf24", "#e11d48", "#0f172a", "#6b21a8"];
const SHIRT_MIX = ["#f8fafc", "#fde68a", "#bfdbfe", "#fecaca", "#bbf7d0"];

// id로 고정된 외형 (머리색, 셔츠 톤)
function look(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { hair: HAIR[h % HAIR.length], shirt: SHIRT_MIX[(h >> 3) % SHIRT_MIX.length], glasses: h % 4 === 0 };
}

// 로우폴리 아바타. 목적지(좌석/라운지/회의실)까지 걸어가고, 도착하면 상태별 동작을 한다. 전부 클라이언트 연출.
export function Avatar({
  employee: e,
  color,
  restSlot,
  meetingIndex,
}: {
  employee: SceneEmployee;
  color: string;
  restSlot: number;
  meetingIndex: number;
}) {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = useRef<Mesh>(null);
  const armR = useRef<Mesh>(null);
  const legL = useRef<Mesh>(null);
  const legR = useRef<Mesh>(null);
  // 각 아바타의 애니메이션 위상을 어긋나게
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const { hair, shirt, glasses } = useMemo(() => look(e.id), [e.id]);
  const paused = e.status === "paused";

  useFrame((state, delta) => {
    const g = root.current;
    if (!g) return;
    const t = state.clock.elapsedTime + phase;

    // 목적지: 회의 소집 > 휴식(라운지) > 자기 좌석
    let target: { x: number; z: number; faceZ?: number };
    if (e.in_meeting) target = meetingSlot(meetingIndex);
    else if (e.status === "resting") target = { x: REST_AREA.x + (restSlot - 2) * REST_AREA.slotGap, z: REST_AREA.z };
    else target = { x: e.seat_x, z: e.seat_z };

    const dx = target.x - g.position.x;
    const dz = target.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    const walking = dist > 0.05;

    if (walking) {
      const step = Math.min(dist, WALK_SPEED * delta);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      g.rotation.y = Math.atan2(dx, dz);
      const swing = Math.sin(t * 11) * 0.7;
      if (legL.current) legL.current.rotation.x = swing;
      if (legR.current) legR.current.rotation.x = -swing;
      if (armL.current) armL.current.rotation.x = -swing * 0.6;
      if (armR.current) armR.current.rotation.x = swing * 0.6;
      g.position.y = Math.abs(Math.sin(t * 11)) * 0.04;
      return;
    }

    // 도착: 바라보는 방향 (회의실은 테이블 쪽, 좌석은 모니터(-z) 쪽)
    const faceZ = target.faceZ ?? target.z - 1;
    g.rotation.y = MathUtils.damp(g.rotation.y, Math.atan2(0, faceZ - target.z), 6, delta);
    if (legL.current) legL.current.rotation.x = MathUtils.damp(legL.current.rotation.x, 0, 8, delta);
    if (legR.current) legR.current.rotation.x = MathUtils.damp(legR.current.rotation.x, 0, 8, delta);
    g.position.y = 0;
    if (paused) return;

    if (head.current) {
      head.current.rotation.y =
        e.in_meeting ? Math.sin(t * 2) * 0.25
        : e.status === "idle" ? Math.sin(t * 1.2) * 0.6
        : e.status === "working" ? Math.sin(t * 0.5) * 0.1
        : 0;
      // 회의 중엔 끄덕끄덕
      head.current.rotation.x = e.in_meeting ? Math.sin(t * 3) * 0.08 : 0;
    }
    if (armL.current && armR.current) {
      const typing = e.status === "working" && !e.in_meeting;
      armL.current.rotation.x = typing ? -1.2 + Math.sin(t * 14) * 0.15 : MathUtils.damp(armL.current.rotation.x, 0, 8, delta);
      armR.current.rotation.x = typing ? -1.2 + Math.cos(t * 14) * 0.15 : MathUtils.damp(armR.current.rotation.x, 0, 8, delta);
    }
    // resting: 가볍게 숨쉬듯 위아래
    g.position.y = e.status === "resting" && !e.in_meeting ? Math.sin(t * 2) * 0.03 : 0;
  });

  const bodyColor = paused ? "#6b7280" : color;
  const skin = paused ? "#9ca3af" : "#f1c7a3";

  return (
    <group ref={root} position={[e.seat_x, 0, e.seat_z]}>
      {/* 몸통 (부서색 상의 + 안쪽 셔츠 느낌의 밝은 띠) */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[0.42, 0.55, 0.3]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh position={[0, 0.95, 0.16]}>
        <boxGeometry args={[0.16, 0.14, 0.02]} />
        <meshStandardMaterial color={paused ? "#d1d5db" : shirt} />
      </mesh>
      {/* 머리 + 머리카락 + 안경 */}
      <group ref={head} position={[0, 1.2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.32, 0.32]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, 0.14, -0.03]}>
          <boxGeometry args={[0.34, 0.1, 0.3]} />
          <meshStandardMaterial color={paused ? "#4b5563" : hair} />
        </mesh>
        {glasses && (
          <mesh position={[0, 0.02, 0.17]}>
            <boxGeometry args={[0.26, 0.06, 0.02]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        )}
      </group>
      {/* 팔 (어깨를 축으로 회전) */}
      <mesh ref={armL} position={[-0.28, 0.95, 0]} castShadow>
        <boxGeometry args={[0.1, 0.45, 0.1]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh ref={armR} position={[0.28, 0.95, 0]} castShadow>
        <boxGeometry args={[0.1, 0.45, 0.1]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      {/* 다리 (엉덩이를 축으로 회전) */}
      <group position={[-0.1, 0.5, 0]}>
        <mesh ref={legL} position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.14, 0.5, 0.14]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>
      <group position={[0.1, 0.5, 0]}>
        <mesh ref={legR} position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.14, 0.5, 0.14]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>
    </group>
  );
}
