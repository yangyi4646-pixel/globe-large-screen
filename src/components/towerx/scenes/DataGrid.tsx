import { useRef } from 'react';
import { Grid } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlaneMotion } from '../stage/focusPose';
import { GRID_SECTION, GRID_SPEED, landingProfile } from './landingProfile';

// Data-twin grid floor below the plane — drei <Grid> with cyan
// section lines, animated so the ground appears to flow PAST and
// behind the plane (toward the horizon), giving the plane its
// "moving forward through space" read. The shift wraps every
// sectionSize so the loop is seamless.
//
// R1 tuning: denser cells (cellSize 0.2→0.1) + extended fade for
// horizon depth (fadeDistance 20, fadeStrength 0.9, args 40×40).
// GRID_SECTION / sectionSize deliberately unchanged — coupled to
// wrapMod seamless-loop math.
//
// Plane is rotated Math.PI * 0.25 (45°) around Y. The model's local
// nose direction projects onto the world heading vector
//   H = (sin 45°, 0, cos 45°) ≈ (+0.707, 0, +0.707).
// For "ground flowing past" we translate the grid OPPOSITE to that
// vector — so ground moves into negative X + negative Z over time,
// reading as "we're flying toward +X + +Z while the ground stays
// still relative to the world".
const HEADING_X = Math.sin(Math.PI * 0.25);
const HEADING_Z = Math.cos(Math.PI * 0.25);

function wrapMod(v: number, m: number) {
  return ((v % m) + m) % m;
}

export function DataGrid({
  mode,
  motion
}: {
  mode: 'storm' | 'cruise' | 'landing';
  motion: PlaneMotion;
}) {
  const ref = useRef<THREE.Group>(null);
  // A1:地面位置是**时钟的纯函数**,不再按 delta 积分 —— 这样它和
  // plane.z 共用同一个 clock,不可能漂移。landing 用 landingProfile
  // 的 groundScroll(绝对累计、单调不减、stopped 段斜率 0);非 landing
  // 用线性 GRID_SPEED*t。两者经 wrapMod 取模 → 无缝平铺、无跳变。
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const drift =
      mode === 'landing'
        // 此处只取 .groundScroll;y/z/pitch 驱动 AnimatedPlaneGroup。
        // 平面与地面共用同一纯函数 → 两者不可能漂移 (A1)。
        ? -landingProfile(t, motion).groundScroll
        : -GRID_SPEED * t;
    // Negative drift along the heading vector → ground translates
    // opposite to the plane's heading, i.e. flows past the plane
    // toward the horizon.
    ref.current.position.x = wrapMod(drift * HEADING_X, GRID_SECTION);
    ref.current.position.z = wrapMod(drift * HEADING_Z, GRID_SECTION);
  });
  return (
    <group ref={ref} position={[0, -1.0, 0]}>
      <Grid
        args={[40, 40]}
        cellSize={0.1}
        cellThickness={0.4}
        cellColor="#2a3e62"
        sectionSize={GRID_SECTION}
        sectionThickness={1.4}
        sectionColor="#7fd5ff"
        fadeDistance={20}
        fadeStrength={0.9}
        followCamera={false}
        infiniteGrid
      />
    </group>
  );
}
