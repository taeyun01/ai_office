"use client";

import { MapControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils } from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { MAP_BOUNDS } from "./types";

// 아이소메트릭 카메라: 드래그 이동, 휠 확대/축소, 회전 없음, 맵 경계 밖으로 못 나감.
// focus가 바뀌면 그 지점으로 부드럽게 이동하고, 사용자가 드래그하면 이동을 멈춘다.
export function CameraRig({ focus }: { focus: { x: number; z: number } | null }) {
  const ref = useRef<MapControlsImpl>(null);
  const goal = useRef<{ x: number; z: number } | null>(null);

  useEffect(() => {
    goal.current = focus;
  }, [focus]);

  useFrame((_, delta) => {
    const c = ref.current;
    if (!c) return;
    const t = c.target;

    if (goal.current) {
      const gx = MathUtils.damp(t.x, goal.current.x, 4, delta);
      const gz = MathUtils.damp(t.z, goal.current.z, 4, delta);
      c.object.position.x += gx - t.x;
      c.object.position.z += gz - t.z;
      t.set(gx, 0, gz);
      if (Math.abs(gx - goal.current.x) < 0.02 && Math.abs(gz - goal.current.z) < 0.02) goal.current = null;
    }

    const x = Math.min(MAP_BOUNDS.maxX, Math.max(MAP_BOUNDS.minX, t.x));
    const z = Math.min(MAP_BOUNDS.maxZ, Math.max(MAP_BOUNDS.minZ, t.z));
    if (x !== t.x || z !== t.z) {
      // 카메라와 타깃을 같은 양만큼 되돌려 시점 각도를 유지
      c.object.position.x += x - t.x;
      c.object.position.z += z - t.z;
      t.set(x, 0, z);
    }
  });

  return (
    <MapControls
      ref={ref}
      enableRotate={false}
      screenSpacePanning={false}
      minZoom={14}
      maxZoom={70}
      dampingFactor={0.12}
      onStart={() => (goal.current = null)}
    />
  );
}
