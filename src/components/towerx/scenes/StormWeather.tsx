import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '../theme';
import { effectiveTurbulence } from './stormDirector';

// ─────────────────────────────────────────────────────────────────────
// Rain — many short vertical line segments falling continuously,
// recycled to top when they pass the bottom. Drops are positioned
// across the visible foreground volume so the plane reads as flying
// through a downpour. Slight horizontal wind for character.

// R3: rain missed the LOWER half of the screen. Reason: the near
// foreground floor that fills the bottom of the frame is at world
// z ≈ 4–8 (closer to the camera at z=camDist), but the rain box only
// reached zMax=3 → no streaks over the near floor → bottom half dry.
// Fix: extend the depth toward the camera (zMax 3 → 10, zMin → -2)
// so rain blankets the whole visible floor from horizon to the
// bottom-of-frame foreground; keep yBottom at the grid (-1.0) so it
// still lands; bump count to keep density over the deeper volume.
const RAIN_COUNT = 9000;
const RAIN_AREA = { xMin: -12, xMax: 12, yTop: 5, yBottom: -1.0, zMin: -2.0, zMax: 10.0 };
const RAIN_LENGTH = 0.32; // longer streaks → more visible per drop
const RAIN_BASE_SPEED = 16; // tuned for the ~6-unit fall height
// Peak horizontal wind. Modulated by pow(dyn, 1.8) per frame so the
// gap between peak (≈ -0.91) and calm (≈ -0.12) reads as "storm
// blowing the rain sideways → near vertical rain in lulls", not a
// flat constant tilt.
const RAIN_WIND_X = -1.0;

export function RainDrops({
  playing,
  intensity,
  calmRef
}: {
  playing: boolean;
  intensity: number;
  calmRef?: { current: number };
}) {
  const ref = useRef<THREE.LineSegments>(null);
  // Per-drop speed multipliers (0.55-1.45×) — without per-drop
  // variance, all drops fall at identical rate and recycle in
  // synchronized waves, which reads as "阵雨" (sheet bursts).
  // Random speeds spread the recycle moments across time, giving
  // continuous flow.
  const speedMul = useMemo(() => {
    const a = new Float32Array(RAIN_COUNT);
    for (let i = 0; i < RAIN_COUNT; i++) {
      a[i] = 0.55 + Math.random() * 0.9;
    }
    return a;
  }, []);
  // Per-drop streak length (0.7-1.3× base) — far drops appear longer,
  // near drops shorter, mimicking depth.
  const lenMul = useMemo(() => {
    const a = new Float32Array(RAIN_COUNT);
    for (let i = 0; i < RAIN_COUNT; i++) {
      a[i] = 0.7 + Math.random() * 0.6;
    }
    return a;
  }, []);

  // Each drop = 2 vertices (top + bottom of streak), 3 coords each.
  const positions = useMemo(() => {
    const p = new Float32Array(RAIN_COUNT * 6);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x =
        RAIN_AREA.xMin + Math.random() * (RAIN_AREA.xMax - RAIN_AREA.xMin);
      // Initial Y spread uniformly across full vertical range —
      // critical for breaking the "all drops start at top" wave.
      const y =
        RAIN_AREA.yBottom +
        Math.random() * (RAIN_AREA.yTop - RAIN_AREA.yBottom);
      const z =
        RAIN_AREA.zMin + Math.random() * (RAIN_AREA.zMax - RAIN_AREA.zMin);
      const o = i * 6;
      const len = RAIN_LENGTH * lenMul[i];
      p[o] = x;
      p[o + 1] = y;
      p[o + 2] = z;
      p[o + 3] = x + RAIN_WIND_X * 0.05;
      p[o + 4] = y - len;
      p[o + 5] = z;
    }
    return p;
  }, [lenMul]);

  const matRef = useRef<THREE.LineBasicMaterial>(null);
  useFrame((state, delta) => {
    if (!ref.current || !playing) return;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    // P-B:风暴平息 → 雨变慢并淡出(calm 0→1;无 calmRef 时 k=1 原样)。
    const k = 1 - (calmRef?.current ?? 0);
    if (matRef.current) matRef.current.opacity = 0.55 * k;
    const dyn =
      effectiveTurbulence(state.clock.elapsedTime, intensity) * k;
    const baseFall = RAIN_BASE_SPEED * dyn * delta;
    // Wind scaled by pow(dyn, 1.8) so peak (dyn≈0.95) is near full
    // sideways blow but calm (dyn≈0.30) is almost vertical — the
    // linear scaling we had before kept some wind even during lulls,
    // flattening the cycle.
    const baseWind = RAIN_WIND_X * Math.pow(dyn, 1.8) * delta;
    for (let i = 0; i < RAIN_COUNT; i++) {
      const o = i * 6;
      const fall = baseFall * speedMul[i];
      // Wind also varies per drop slightly (couples to speed)
      const wind = baseWind * speedMul[i];
      arr[o + 1] -= fall;
      arr[o + 4] -= fall;
      arr[o] += wind;
      arr[o + 3] += wind;
      if (arr[o + 4] < RAIN_AREA.yBottom) {
        const newX =
          RAIN_AREA.xMin + Math.random() * (RAIN_AREA.xMax - RAIN_AREA.xMin);
        // Recycle Y spread across the entire top 30% of the vertical
        // range (yTop to yTop - 30% of range), not the previous tight
        // 0.5 unit band — keeps incoming drops desynchronized.
        const yRange = RAIN_AREA.yTop - RAIN_AREA.yBottom;
        const newY = RAIN_AREA.yTop + Math.random() * yRange * 0.3;
        const len = RAIN_LENGTH * lenMul[i];
        arr[o] = newX;
        arr[o + 1] = newY;
        arr[o + 3] = newX + RAIN_WIND_X * 0.05;
        arr[o + 4] = newY - len;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        color="#7ab8ff"
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </lineSegments>
  );
}

// ─────────────────────────────────────────────────────────────────────
// DistantRainCurtain — vertical streaks at depth (z ≈ -5 to -6),
// reading as "wall of rain/cloud bands far behind the plane". Picked
// over sprite puffs and shader volumetric because:
//   - Lines fit the project's wireframe aesthetic without introducing
//     new texture assets or render pipelines.
//   - A previous flat horizon line (StormHorizon at z=-8.5) was tried
//     and removed — fog killed it and a single horizontal line read
//     as a jagged scribble, not weather. Vertical strands of varying
//     length + brightness placed CLOSER to the plane give actual
//     atmospheric depth without that flatness.
//
// Static geometry — no per-frame mutation. Variation comes from
// per-streak randomization at mount (jittered x, length, brightness,
// wind tilt). Combined with the moving foreground rain + storm
// director's lightning cadence, the static curtain reads as
// "background mass" rather than "foreground rain doubled up".
const CURTAIN_STREAKS = 28;

export function DistantRainCurtain() {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    const colors: number[] = [];
    const base = new THREE.Color(PALETTE.blue);
    for (let i = 0; i < CURTAIN_STREAKS; i++) {
      // Spread horizontally across the visible field at the curtain
      // depth. xRange = ±9 leaves slight overhang outside the frame
      // so the curtain feels continuous instead of "starting at the
      // viewport edge".
      const xTop = -9 + Math.random() * 18;
      const z = -5.2 - Math.random() * 1.2; // -5.2 to -6.4
      const yTop = 1.4 + Math.random() * 1.0;
      // Length varies 1.5 – 2.8 units so the curtain has both short
      // wispy streaks and longer rain shafts.
      const length = 1.5 + Math.random() * 1.3;
      const yBot = yTop - length;
      // Slight wind tilt — bottom drifts to the same side as
      // foreground rain wind (-X direction).
      const tilt = -0.15 - Math.random() * 0.15;
      const xBot = xTop + tilt;
      pts.push(xTop, yTop, z, xBot, yBot, z);
      // Brightness: top bright (cloud base) → bot dim (dissipating
      // shaft). Per-streak brightness factor 0.5-1.0 adds atmospheric
      // variety; AdditiveBlending sums multiple overlapping streaks.
      const peak = 0.5 + Math.random() * 0.5;
      const brightTop = peak;
      const brightBot = peak * 0.15;
      colors.push(base.r * brightTop, base.g * brightTop, base.b * brightTop);
      colors.push(base.r * brightBot, base.g * brightBot, base.b * brightBot);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geometry} renderOrder={-1}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Lightning — random ambient-light spikes with a fast envelope.
//
// Strikes 4-10s apart (modulated by intensity), 200ms total duration:
// 40ms ramp-up to peak, 160ms decay back to 0. The hidden ambient
// light's intensity baseline is 0 — only spikes during a strike, so it
// stacks on top of the existing scene lighting without changing the
// resting brightness. Driven by useFrame with elapsed-time math (no
// setTimeout — the roadmap flagged it as a leak risk if the panel
// closes mid-flash, useFrame stops cleanly when the component unmounts).

/** Visible zigzag bolt for the wireframe scene — geometry-based,
 *  not light-based (since wireframe materials are unlit). On each
 *  strike, regenerates a jagged path top-to-bottom and shows it for
 *  ~140ms, then hides. Reads as a "lightning detected" data event
 *  rather than a real lit-up flash. */
export function LightningBolt({
  playing,
  intensity,
  calmRef
}: {
  playing: boolean;
  intensity: number;
  calmRef?: { current: number };
}) {
  const ref = useRef<THREE.LineSegments>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  // Flash overlay: a screen-filling quad placed right in front of the
  // camera with additive blending + depthTest off. During a strike
  // its opacity ramps up briefly so the WHOLE scene gets a fleeting
  // brightening — mimicking the way a real lightning strike lights
  // up the surrounding sky/clouds even when the bolt itself is thin.
  // Wireframe materials are unlit, so we can't use ambientLight to do
  // this; an additive quad is the cheapest equivalent.
  const flashMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const next = useRef(2 + Math.random() * 4);
  const start = useRef(-1);

  // Regenerate bolt path on strike: a jagged main bolt top→bottom,
  // plus 1-2 forks branching diagonally from random junctions on
  // the main path. Forks bias outward (left or right) while still
  // descending, mimicking real lightning's tree shape — without
  // forks the single-line bolt reads as "a stick", not "a bolt".
  const regenerate = () => {
    if (!ref.current) return;
    const pts: number[] = [];
    const segCount = 9;
    let x = (Math.random() - 0.5) * 4;
    let y = 5;
    const z = -0.5 + Math.random() * 1.0;
    // Track main-bolt junction points so forks can branch from them.
    const junctions: Array<{ x: number; y: number }> = [{ x, y }];
    for (let i = 0; i < segCount; i++) {
      pts.push(x, y, z);
      x += (Math.random() - 0.5) * 0.6;
      y -= 0.7 + Math.random() * 0.3;
      pts.push(x, y, z);
      junctions.push({ x, y });
    }
    // Forks: 1-2 per strike, each 2-4 segments long, branching from
    // an upper-middle junction (avoid the very top and very bottom
    // so the fork looks integrated, not free-floating).
    const forkCount = 1 + Math.floor(Math.random() * 2);
    for (let f = 0; f < forkCount; f++) {
      const j = 1 + Math.floor(Math.random() * (junctions.length - 3));
      let fx = junctions[j].x;
      let fy = junctions[j].y;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const subSegs = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < subSegs; i++) {
        pts.push(fx, fy, z);
        fx += dir * (0.25 + Math.random() * 0.35) + (Math.random() - 0.5) * 0.15;
        fy -= 0.35 + Math.random() * 0.25;
        pts.push(fx, fy, z);
      }
    }
    const arr = new Float32Array(pts);
    ref.current.geometry.dispose();
    ref.current.geometry = new THREE.BufferGeometry();
    ref.current.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(arr, 3)
    );
  };

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return;
    // P-B:风暴平息 → 闪电随之停(calm 0→1;无 calmRef 时 ×1 原样)。
    const dyn =
      effectiveTurbulence(clock.elapsedTime, intensity) *
      (1 - (calmRef?.current ?? 0));
    if (!playing || dyn <= 0.01) {
      setLightningOpacity(matRef.current, flashMatRef.current, 0, 0);
      return;
    }
    const t = clock.elapsedTime;

    maybeStartStrike({ t, dyn, start, next, regenerate });
    updateStrikeFrame({ t, dyn, start, material: matRef.current, flash: flashMatRef.current });
  });

  return (
    <>
      <lineSegments ref={ref}>
        <bufferGeometry />
        <lineBasicMaterial
          ref={matRef}
          color="#e6f3ff"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>
      {/* Sky flash plane — sits just in front of the camera (z = 3.1
          with camera at z=4.5), depthTest off + additive blend, so a
          single quad covers the visible frame and brightens whatever's
          behind it during a strike. fog=false because the brightening
          is conceptually "the sky lighting up", not part of the
          fogged scene depth. */}
      <mesh position={[0, 0, 3.1]} renderOrder={5}>
        <planeGeometry args={[20, 12]} />
        <meshBasicMaterial
          ref={flashMatRef}
          color="#d0e4ff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          fog={false}
        />
      </mesh>
    </>
  );
}

function setLightningOpacity(
  material: THREE.LineBasicMaterial,
  flash: THREE.MeshBasicMaterial | null,
  lineOpacity: number,
  flashOpacity: number
) {
  material.opacity = lineOpacity;
  if (flash) flash.opacity = flashOpacity;
}

function strikeEnvelope(elapsed: number): number | null {
  const total = 0.18;
  const ramp = 0.025;
  if (elapsed >= total) return null;
  return elapsed < ramp
    ? elapsed / ramp
    : Math.max(0, 1 - (elapsed - ramp) / (total - ramp));
}

function maybeStartStrike({
  t,
  dyn,
  start,
  next,
  regenerate
}: {
  t: number;
  dyn: number;
  start: MutableRefObject<number>;
  next: MutableRefObject<number>;
  regenerate: () => void;
}) {
  if (start.current >= 0 || t < next.current) return;
  start.current = t;
  regenerate();
  const minGap = 0.5 + (1 - dyn) * 6;
  const maxGap = 2.0 + (1 - dyn) * 10;
  next.current = t + minGap + Math.random() * (maxGap - minGap);
}

function updateStrikeFrame({
  t,
  dyn,
  start,
  material,
  flash
}: {
  t: number;
  dyn: number;
  start: MutableRefObject<number>;
  material: THREE.LineBasicMaterial;
  flash: THREE.MeshBasicMaterial | null;
}) {
  if (start.current < 0) {
    setLightningOpacity(material, flash, 0, 0);
    return;
  }
  const env = strikeEnvelope(t - start.current);
  if (env === null) {
    start.current = -1;
    setLightningOpacity(material, flash, 0, 0);
    return;
  }
  setLightningOpacity(material, flash, env, env * 0.28 * dyn);
}
