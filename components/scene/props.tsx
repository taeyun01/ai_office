"use client";

// 오피스 소품들. 전부 props만 받는 로우폴리 메쉬.
import { LOUNGE, MEETING_ROOM } from "./types";

type V3 = [number, number, number];

export function Plant({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.5, 8]} />
        <meshStandardMaterial color="#b45309" />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.6) * 0.18, 0.85 + (i % 2) * 0.15, Math.sin(i * 1.6) * 0.18]} castShadow>
          <sphereGeometry args={[0.28, 7, 6]} />
          <meshStandardMaterial color={i % 2 ? "#22c55e" : "#16a34a"} />
        </mesh>
      ))}
    </group>
  );
}

export function Bookshelf({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[1.6, 2, 0.4]} />
        <meshStandardMaterial color="#5b4636" />
      </mesh>
      {[0.45, 1.05, 1.65].map((y) =>
        [-0.5, -0.2, 0.1, 0.4].map((x, i) => (
          <mesh key={`${y}-${x}`} position={[x, y, 0.05]}>
            <boxGeometry args={[0.2, 0.42, 0.28]} />
            <meshStandardMaterial color={["#ef4444", "#3b82f6", "#eab308", "#a855f7"][i]} />
          </mesh>
        )),
      )}
    </group>
  );
}

export function FloorLamp({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.8]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <coneGeometry args={[0.3, 0.35, 10, 1, true]} />
        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.6} side={2} />
      </mesh>
      <pointLight position={[0, 1.7, 0]} intensity={2} distance={6} color="#ffd79a" />
    </group>
  );
}

// 뒷벽 + 창문: 구역 뒤쪽(z = -11)에 길게
export function BackWall() {
  return (
    <group position={[0, 0, -11]}>
      <mesh position={[0, 1.6, 0]} receiveShadow>
        <boxGeometry args={[40, 3.2, 0.3]} />
        <meshStandardMaterial color="#1e2742" />
      </mesh>
      {[-15, -9, -3, 3, 9, 15].map((x) => (
        <group key={x} position={[x, 1.8, 0.17]}>
          <mesh>
            <boxGeometry args={[3.2, 1.8, 0.06]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <planeGeometry args={[3, 1.6]} />
            <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Sofa({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[3, 0.5, 1]} />
        <meshStandardMaterial color="#7c3aed" />
      </mesh>
      <mesh position={[0, 0.75, -0.4]} castShadow>
        <boxGeometry args={[3, 0.5, 0.25]} />
        <meshStandardMaterial color="#6d28d9" />
      </mesh>
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, 0.65, 0]}>
          <boxGeometry args={[0.2, 0.3, 1]} />
          <meshStandardMaterial color="#6d28d9" />
        </mesh>
      ))}
    </group>
  );
}

// 라운지: 러그 + 소파 2 + 커피 테이블 + 탕비실 카운터
export function Lounge() {
  const { x, z, w, d } = LOUNGE;
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#2a2140" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.6]} receiveShadow>
        <circleGeometry args={[2.2, 24]} />
        <meshStandardMaterial color="#9f1239" />
      </mesh>
      <Sofa position={[0, 0, -1.2]} />
      <mesh position={[0, 0.3, 0.6]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.1, 16]} />
        <meshStandardMaterial color="#d6b98c" />
      </mesh>
      {/* 탕비실 카운터 + 커피머신 + 냉장고 */}
      <group position={[-3.6, 0, 1.6]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[2.2, 0.9, 0.7]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
        <mesh position={[-0.5, 1.15, 0]} castShadow>
          <boxGeometry args={[0.4, 0.5, 0.4]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[-0.5, 1.2, 0.21]}>
          <planeGeometry args={[0.15, 0.1]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1} />
        </mesh>
        <mesh position={[1.6, 0.9, 0]} castShadow>
          <boxGeometry args={[0.8, 1.8, 0.7]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
      </group>
      <Plant position={[4, 0, -2]} />
      <Plant position={[-4.3, 0, -2]} />
      <FloorLamp position={[3.8, 0, 1.8]} />
    </group>
  );
}

// 회의실: 유리벽 + 긴 테이블 + 의자 8 + 벽면 TV
export function MeetingRoom({ occupied }: { occupied: number }) {
  const { x, z, w, d } = MEETING_ROOM;
  const glass = <meshStandardMaterial color="#67e8f9" transparent opacity={0.14} />;
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#1f2a44" />
      </mesh>
      {/* 유리벽 (앞쪽은 출입구로 비움) */}
      <mesh position={[0, 1.2, -d / 2]}>
        <boxGeometry args={[w, 2.4, 0.06]} />{glass}
      </mesh>
      <mesh position={[-w / 2, 1.2, 0]}>
        <boxGeometry args={[0.06, 2.4, d]} />{glass}
      </mesh>
      <mesh position={[w / 2, 1.2, 0]}>
        <boxGeometry args={[0.06, 2.4, d]} />{glass}
      </mesh>
      {/* 테이블 */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 0.08, 1.6]} />
        <meshStandardMaterial color="#8b5e3c" />
      </mesh>
      {[-2, 2].map((dx) => (
        <mesh key={dx} position={[dx, 0.36, 0]}>
          <boxGeometry args={[0.12, 0.72, 1.2]} />
          <meshStandardMaterial color="#5b3a21" />
        </mesh>
      ))}
      {/* 의자 8 */}
      {[-1, 1].map((side) =>
        [0, 1, 2, 3].map((c) => (
          <group key={`${side}-${c}`} position={[-1.8 + c * 1.2, 0, side * 1.3]}>
            <mesh position={[0, 0.42, 0]} castShadow>
              <boxGeometry args={[0.5, 0.08, 0.5]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            <mesh position={[0, 0.7, side * 0.22]} castShadow>
              <boxGeometry args={[0.5, 0.5, 0.08]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          </group>
        )),
      )}
      {/* TV: 회의 중이면 켜짐 */}
      <mesh position={[0, 1.6, -d / 2 + 0.1]}>
        <boxGeometry args={[2.4, 1.3, 0.08]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0, 1.6, -d / 2 + 0.15]}>
        <planeGeometry args={[2.2, 1.1]} />
        <meshStandardMaterial
          color={occupied ? "#38bdf8" : "#111827"}
          emissive={occupied ? "#38bdf8" : "#000"}
          emissiveIntensity={occupied ? 0.8 : 0}
        />
      </mesh>
      <Plant position={[-w / 2 + 0.6, 0, d / 2 - 0.6]} />
    </group>
  );
}
