/**
 * Globe geometry contract — the single source of truth for every
 * component that wants to put something on the planet.
 *
 * Anything that renders on the sphere (StylizedEarth, Cities, Routes,
 * DisruptionRing, future R3+ scenes) MUST:
 *   1. Get its radius from `GLOBE_RADII` — never hard-code 1.005 etc.
 *   2. Convert lat/lng with `latLngToVector3` — never re-implement the
 *      projection, the sign convention is load-bearing.
 *   3. Render as a child of the `tilt → spin → scale` group inside
 *      `GlobeWebGL.tsx`. That group owns camera-lat tilt, longitude
 *      spin (with drift), and the config-driven `radius` scale. Any
 *      component that re-implements those transforms internally will
 *      desync the moment the editor sliders move.
 *
 * AtmosphereHalo is the deliberate exception — it lives OUTSIDE the
 * tilt/spin/scale group because it's a back-facing billboard that
 * must not rotate with the planet. It only inherits position-X/Y
 * from the outer scene group.
 *
 * Tunable per-render config (radii overrides, colours, drift speed,
 * bloom, halo) lives in `webglConfig.ts`. This file is the geometric
 * contract — constants and pure math, no React, no Three.js scene
 * state, no per-frame writes.
 */

import { Vector3 } from 'three';

/**
 * Layer radii — concentric shells just above the ocean body.
 *
 * Each successive layer is offset outward enough to avoid z-fighting
 * with the one below (≥ 0.002 units at our 96-segment sphere). Don't
 * collapse two layers to the same radius — country lines and city
 * dots co-planar will shimmer.
 */
export const GLOBE_RADII = {
  /** Ocean + land textured sphere body. The base unit — every other
   *  radius is this with a small outward offset. Land used to live on
   *  its own shell (1.005) when it was an earcut mesh; once we moved
   *  to a texture mask sampled inside the body shader, the land
   *  shell collapsed back into BODY.
   *
   *  Offset budget: every shell sits 0.002 world-units (after the
   *  config.radius scale) above the previous. Once the land mesh
   *  layer was deleted, the country lines that used to sit at 1.01
   *  (0.5% above the old land shell) suddenly read as "floating" at
   *  1% above the body — visible as a depth gap at the planet rim.
   *  Tight 0.002 increments here put the country lines / city dots /
   *  disruption ring all visually flush with the surface; the offsets
   *  exist only to prevent z-fighting, not to model elevation. */
  BODY: 1.0,
  /** Country outline line segments — hair above body to avoid
   *  z-fighting on a 24-bit depth buffer. */
  LINE: 1.002,
  /** City dots — fractionally above LINE so the line never paints
   *  over the dot. */
  CITY: 1.004,
  /** DisruptionRing pulse plane — fractionally above CITY so the
   *  ring visually wraps around the dot. */
  RING: 1.006
} as const;

/**
 * Lat/lng (in degrees) → Vector3 on a sphere of radius `r`.
 *
 * Sign convention (load-bearing — DO NOT change without auditing
 * every consumer):
 *   +x  →  prime meridian, equator
 *   +y  →  north pole
 *   -z  →  90°E, equator  (note the negative — east is into the screen
 *                          when the camera looks down +z from positive z)
 *
 * The `spinRef.current.rotation.y` formula in GlobeWebGL relies on
 * this exact convention to map `cameraLngDeg` to a y-rotation.
 */
export function latLngToVector3(latDeg: number, lngDeg: number, r: number): Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lng = (lngDeg * Math.PI) / 180;
  return new Vector3(
    r * Math.cos(lat) * Math.cos(lng),
    r * Math.sin(lat),
    -r * Math.cos(lat) * Math.sin(lng)
  );
}
