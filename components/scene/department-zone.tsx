"use client";

import { useMemo } from "react";
import { PlaneGeometry } from "three";
import type { SceneDepartment } from "./types";

// 부서 구역: 색 구분 바닥 + 테두리 + 뒤쪽 화이트보드. dimmed면 흐리게(선택 부서 하이라이트용).
export function DepartmentZone({ department: d, dimmed }: { department: SceneDepartment; dimmed?: boolean }) {
  // 바닥에 눕힌 사각형 (테두리용)
  const rect = useMemo(
    () => new PlaneGeometry(d.width, d.depth).rotateX(-Math.PI / 2),
    [d.width, d.depth],
  );
  return (
    <group position={[d.position_x, 0, d.position_z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[d.width, d.depth]} />
        <meshStandardMaterial color={d.color} transparent opacity={dimmed ? 0.05 : 0.18} />
      </mesh>
      <lineSegments position={[0, 0.02, 0]}>
        <edgesGeometry args={[rect]} />
        <lineBasicMaterial color={d.color} transparent opacity={dimmed ? 0.25 : 1} />
      </lineSegments>
      {/* 화이트보드 (구역 뒤쪽 가장자리) */}
      <group position={[0, 1.2, -d.depth / 2 + 0.3]}>
        <mesh castShadow>
          <boxGeometry args={[3, 1.6, 0.08]} />
          <meshStandardMaterial color="#f4f4f5" />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[2.7, 1.3]} />
          <meshStandardMaterial color="#ffffff" emissive={d.color} emissiveIntensity={0.08} />
        </mesh>
      </group>
    </group>
  );
}
