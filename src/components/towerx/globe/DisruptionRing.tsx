import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  Vector3
} from 'three';
import type { City } from '../mock-data';
import { GLOBE_RADII, latLngToVector3 } from '../globeConfig';
import { cityAlpha } from '../intro/introClock';
import { PALETTE } from '../theme';
import type { WebGLGlobeConfig } from '../webglConfig';

/**
 * DisruptionRing — soft magenta ripples expanding outward from each
 * `critical`-status city, tangent to the planet surface.
 *
 * Earlier iteration shipped a 3× concentric "target" of bright pink
 * annuli that read as a kill-confirmed indicator rather than a
 * supply-chain hot spot. Three changes brought it back into the New
 * project "aura" vocabulary:
 *
 *   - 4 rings per city (was 3) so the ripple reads as continuous
 *   - Geometry stroke shrunk to 0.003–0.004 in unit-globe space
 *     (line-thin), down from 0.01
 *   - Peak opacity & max scale moved to config knobs so the user can
 *     dial the loudness without editing source. Defaults: peak 0.55,
 *     scale 7.5 — that's ring outer-radius reaching ~0.03 → ~0.225 in
 *     unit space, ≈ 22% of globe radius. Loud enough to be unmissable
 *     on the critical city, quiet enough to read as ambient
 *     atmosphere not a HUD overlay.
 *
 * Ring orientation: built flat (XY plane, +z normal) then rotated so
 * the +z aligns with `cityLocalPos.normalize()` (city's outward
 * surface normal). Quaternions precomputed in useMemo — they're
 * static relative to the spinning group's local frame.
 */

type DisruptionRingProps = {
  cities: City[];
  config: WebGLGlobeConfig;
  /** P-B Slice2:人按核按钮后 true → HK 危机环按帧平息(opacity→0)。
   *  缺省 false = 原恒定脉动,零回归。 */
  crisisResolving?: boolean;
};

// 危机环平息缓动:heal 0→1 越大越平息(≈1.6s 收掉)。
const RING_HEAL_RATE = 0.65;

const RING_COUNT_PER_CITY = 4;

// Constant line-thin stroke (outer = inner + STROKE). The inner
// radius is config-driven so the editor can dial where the ripple
// starts; the pulse then scales this out by disruptionRingMaxScale.
const RING_STROKE = 0.004;

export function DisruptionRing({
  cities,
  config,
  crisisResolving = false
}: DisruptionRingProps) {
  const healRef = useRef(0);
  const critical = useMemo(
    () => cities.filter((c) => c.status === 'critical'),
    [cities]
  );

  const meshes = useRef<Array<Mesh>>([]);

  // Rebuild the annulus when the inner-radius knob changes.
  const baseGeom = useMemo(() => {
    const inner = config.disruptionRingBaseRadius;
    return new RingGeometry(inner, inner + RING_STROKE, 64, 1);
  }, [config.disruptionRingBaseRadius]);

  const items = useMemo(() => {
    const out: Array<{
      cityId: string;
      ringIdx: number;
      position: [number, number, number];
      quat: [number, number, number, number];
    }> = [];
    const up = new Vector3(0, 0, 1);
    const q = new Quaternion();
    for (const c of critical) {
      const local = latLngToVector3(c.latDeg, c.lngDeg, GLOBE_RADII.RING);
      const normal = local.clone().normalize();
      q.setFromUnitVectors(up, normal);
      for (let r = 0; r < RING_COUNT_PER_CITY; r++) {
        out.push({
          cityId: c.id,
          ringIdx: r,
          position: [local.x, local.y, local.z],
          quat: [q.x, q.y, q.z, q.w]
        });
      }
    }
    return out;
  }, [critical]);

  useFrame((state, delta) => {
    if (!config.disruptionRingEnabled) return;
    const t = state.clock.elapsedTime;
    // P-B:人按核按钮后,危机环按帧平息(heal 0→1;无则恒为 0,原样)。
    healRef.current +=
      ((crisisResolving ? 1 : 0) - healRef.current) *
      Math.min(1, delta * RING_HEAL_RATE);
    const ringK = 1 - healRef.current;
    const period = config.disruptionRingPulseSec;
    const peak = config.disruptionRingPeakOpacity;
    const maxScale = config.disruptionRingMaxScale;
    // Intro Phase C — the disruption pulse belongs to the city network,
    // so it must not be visible while the planet is still emerging.
    // ca===1 after the window → steady-state pulse unchanged.
    const ca = cityAlpha();
    for (let i = 0; i < meshes.current.length; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      const item = items[i];
      const phase = item.ringIdx / RING_COUNT_PER_CITY;
      const u = (((t / period) + phase) % 1 + 1) % 1; // 0..1
      // Scale grows from 1 → maxScale; opacity fades 1 → 0 along a
      // soft curve so the head of the wave feels luminous and the
      // tail dissolves rather than line-jumping to zero.
      const scale = 1 + (maxScale - 1) * u;
      const fade = 1 - u;
      const opacity = peak * fade * fade * ca * ringK;
      mesh.scale.setScalar(scale);
      const mat = mesh.material as MeshBasicMaterial;
      mat.opacity = opacity;
    }
  });

  if (!config.disruptionRingEnabled) return null;

  return (
    <group>
      {items.map((item, i) => (
        <mesh
          key={`${item.cityId}-${item.ringIdx}`}
          ref={(m) => {
            if (m) meshes.current[i] = m;
          }}
          position={item.position}
          quaternion={item.quat}
          geometry={baseGeom}
          renderOrder={3}
        >
          <meshBasicMaterial
            color={new Color(PALETTE.magenta)}
            transparent
            opacity={config.disruptionRingPeakOpacity}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
            side={2}
          />
        </mesh>
      ))}
    </group>
  );
}
