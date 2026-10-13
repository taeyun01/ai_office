"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Outline, Select, Selection } from "@react-three/postprocessing";
import { memo } from "react";
import { Avatar } from "./avatar";
import { CameraRig } from "./camera-rig";
import { DepartmentZone } from "./department-zone";
import { Desks } from "./desks";
import { BackWall, Bookshelf, FloorLamp, Lounge, MeetingRoom, Plant } from "./props";
import { type SceneDepartment, type SceneEmployee } from "./types";

// 아바타 하나. memo라 해당 직원 row가 바뀔 때만 다시 그린다. (책상은 Desks에서 인스턴싱)
const EmployeeUnit = memo(function EmployeeUnit({
  employee: e,
  color,
  restSlot,
  meetingIndex,
  selected,
  onSelect,
}: {
  employee: SceneEmployee;
  color: string;
  restSlot: number;
  meetingIndex: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Select enabled={selected}>
      <group
        onClick={(ev) => {
          ev.stopPropagation();
          onSelect(e.id);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <Avatar employee={e} color={color} restSlot={restSlot} meetingIndex={meetingIndex} />
        {/* 책상+의자 영역 투명 히트박스: 책상(인스턴스)을 클릭해도 이 직원이 선택되게 */}
        <mesh visible={false} position={[e.seat_x, 0.7, e.seat_z - 0.5]}>
          <boxGeometry args={[1.8, 1.4, 2]} />
        </mesh>
      </group>
    </Select>
  );
});

export function OfficeScene({
  departments,
  employees,
  selectedId,
  onSelect,
  focus,
  highlightDepartmentId,
}: {
  departments: SceneDepartment[];
  employees: SceneEmployee[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  focus: { x: number; z: number } | null;
  highlightDepartmentId: string | null;
}) {
  const colorOf = new Map(departments.map((d) => [d.id, d.color]));
  // 휴게 공간 자리: resting 직원 순서대로 배정
  const restSlots = new Map(
    employees.filter((e) => e.status === "resting").map((e, i) => [e.id, i]),
  );
  // 회의실 자리: 소집된 직원 순서대로
  const meetingSlots = new Map(
    employees.filter((e) => e.in_meeting).map((e, i) => [e.id, i]),
  );

  return (
    <Canvas
      shadows="percentage"
      orthographic
      camera={{ position: [24, 24, 24], zoom: 26, near: -200, far: 400 }}
      className="h-full w-full"
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#0b1020"]} />
      <ambientLight intensity={0.7} color="#ffe9d2" />
      <directionalLight
        position={[12, 24, 8]}
        intensity={1.4}
        color="#fff3e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <CameraRig focus={focus} />

      <Selection>
        <EffectComposer autoClear={false} multisampling={4}>
          <Outline blur edgeStrength={8} visibleEdgeColor={0x22d3ee} hiddenEdgeColor={0x22d3ee} />
        </EffectComposer>

        {/* 바닥 + 그리드 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#182038" />
        </mesh>
        <gridHelper args={[60, 60, "#263047", "#1b2238"]} position={[0, 0.003, 0]} />

        {/* 소품: 뒷벽·창문, 라운지(탕비실), 회의실, 화분·책장·조명 */}
        <BackWall />
        <Lounge />
        <MeetingRoom occupied={meetingSlots.size} />
        {departments.map((d) => (
          <group key={`props-${d.id}`}>
            <Plant position={[d.position_x - d.width / 2 + 0.6, 0, d.position_z + d.depth / 2 - 0.6]} />
            <Bookshelf position={[d.position_x + d.width / 2 - 0.5, 0, d.position_z - d.depth / 2 + 1.2]} rotation={-Math.PI / 2} />
          </group>
        ))}
        <FloorLamp position={[-18, 0, 2]} />
        <FloorLamp position={[18, 0, 2]} />
        <Plant position={[0, 0, 10.5]} />

        {departments.map((d) => (
          <DepartmentZone
            key={d.id}
            department={d}
            dimmed={highlightDepartmentId !== null && d.id !== highlightDepartmentId}
          />
        ))}
        <Desks employees={employees} onSelect={onSelect} />
        {employees.map((e) => (
          <EmployeeUnit
            key={e.id}
            employee={e}
            color={colorOf.get(e.department_id) ?? "#94a3b8"}
            restSlot={restSlots.get(e.id) ?? 0}
            meetingIndex={meetingSlots.get(e.id) ?? 0}
            selected={e.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </Selection>
    </Canvas>
  );
}
