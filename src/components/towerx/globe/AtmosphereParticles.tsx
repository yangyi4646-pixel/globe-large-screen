import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Points,
  type ShaderMaterial
} from 'three';
import type { WebGLGlobeConfig } from '../webglConfig';
import { atmoAlpha } from '../intro/introClock';

/**
 * AtmosphereParticles — slow-rotating shell of dust around the planet.
 *
 * Sits OUTSIDE the tilt/spin/scale group on purpose (see
 * `globeConfig.ts` contract). It's ambient — the planet rotates,
 * particles drift independently. Anchored to the outer offset group
 * so panning the planet horizontally drags the cloud with it.
 *
 * Implementation notes:
 *   - One `THREE.Points` mesh, one draw call regardless of count.
 *   - Positions baked once with a seeded RNG. Re-baked on
 *     `count` / `inner` / `outer` / `seed` changes via the `useMemo`
 *     deps. All other knobs (colour / opacity / size / speed) live
 *     as uniforms and update without rebuilding geometry.
 *   - Custom shader because vanilla `PointsMaterial` can't do silhouette
 *     fade. We sample distance from camera and bias alpha down for
 *     points crossing the planet's silhouette, otherwise the rim looks
 *     like a hard ring of dots.
 *
 * Each particle has an independent radius and angular phase, so the
 * cloud has volumetric depth instead of sitting on a perfect sphere
 * (which would read like a 2D ring).
 */
type AtmosphereParticlesProps = {
  config: WebGLGlobeConfig;
};

// xorshift32 — tiny deterministic PRNG. Stable across runs given the
// same seed, so editing other knobs doesn't re-shuffle the cloud.
function makeRng(seed: number) {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    // unsigned → [0, 1)
    return ((s >>> 0) % 0xffffffff) / 0xffffffff;
  };
}

type ShellGeometryOptions = {
  count: number;
  innerR: number;
  outerR: number;
  seed: number;
  falloff: number;
};

function buildShellGeometry({
  count,
  innerR,
  outerR,
  seed,
  falloff
}: ShellGeometryOptions): BufferGeometry {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Uniform point on unit sphere via the Marsaglia method —
    // rejection-sampled from a cube. Avoids the pole clustering you
    // get with naive lat/lng-uniform sampling.
    let x = 0;
    let y = 0;
    let z = 0;
    for (let attempts = 0; attempts < 8; attempts++) {
      x = rng() * 2 - 1;
      y = rng() * 2 - 1;
      z = rng() * 2 - 1;
      const l2 = x * x + y * y + z * z;
      if (l2 > 0 && l2 <= 1) {
        const l = Math.sqrt(l2);
        x /= l;
        y /= l;
        z /= l;
        break;
      }
    }
    // Radius bias: `pow(rng, falloff)` concentrates points near the
    // inner shell when falloff > 1, spreads them evenly at 1, biases
    // toward outer at < 1. Reads as atmospheric density vs altitude.
    const t = Math.pow(rng(), Math.max(0.1, falloff));
    const r = innerR + (outerR - innerR) * t;
    positions[i * 3] = x * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = z * r;
    // Per-particle size: power-law, not linear. Linear rng() clustered
    // everything mid-range so the cloud read as uniform "pellets".
    // pow(rng, 2.6) pushes most particles toward the small end with a
    // long thin tail of larger motes — i.e. lots of fine dust + a few
    // prominent specks, like real cosmic dust. Range ~0.3 → ~3.2.
    sizes[i] = 0.3 + Math.pow(rng(), 2.6) * 2.9;
    // Per-particle phase used by the twinkle modulation — without it
    // every particle would brighten/dim in lockstep, which reads as
    // the whole cloud pulsing instead of individual stars twinkling.
    phases[i] = rng() * Math.PI * 2;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  g.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  return g;
}

export function AtmosphereParticles({ config }: AtmosphereParticlesProps) {
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const pointsRef = useRef<Points>(null);
  const matRef = useRef<ShaderMaterial>(null);

  const geometry = useMemo(
    () =>
      buildShellGeometry({
        count: config.particleCount,
        innerR: config.particleInnerRadius,
        outerR: config.particleOuterRadius,
        seed: config.particleSeed,
        falloff: config.particleFalloff
      }),
    [
      config.particleCount,
      config.particleInnerRadius,
      config.particleOuterRadius,
      config.particleSeed,
      config.particleFalloff
    ]
  );

  useFrame((state, delta) => {
    const c = cfgRef.current;
    if (pointsRef.current) {
      pointsRef.current.visible = c.particlesEnabled;
      // Scale the whole cloud with the planet so the inner/outer
      // multipliers stay relative to its on-screen size.
      pointsRef.current.scale.setScalar(c.radius);
      // Tilt the rotation axis. rotation.x sets the axis inclination
      // (constant); rotation.y is animated as the spin.
      pointsRef.current.rotation.x = (c.particleTiltDeg * Math.PI) / 180;
      pointsRef.current.rotation.y += c.particleSpeed * delta;
    }
    if (matRef.current) {
      const u = matRef.current.uniforms;
      u.uColor.value.set(c.particleColor);
      // Intro Phase B — atmosphere dresses in last of the body layers.
      u.uOpacity.value = c.particleOpacity * atmoAlpha();
      u.uSize.value = c.particleSize;
      u.uTwinkle.value = c.particleTwinkle;
      u.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} renderOrder={-2}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={{
          uColor: { value: new Color(config.particleColor) },
          uOpacity: { value: config.particleOpacity },
          uSize: { value: config.particleSize },
          uTwinkle: { value: config.particleTwinkle },
          uTime: { value: 0 }
        }}
        vertexShader={PARTICLE_VERT}
        fragmentShader={PARTICLE_FRAG}
      />
    </points>
  );
}

// Particles behind the planet body are naturally hidden by the body's
// depth write (the textured sphere is opaque). We rely on that and
// skip any "silhouette fade" of our own — a prior version of this
// shader tried to fade rim-grazing particles in vertex space and got
// the camera-space math inverted, ending up invisible everywhere.
const PARTICLE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uSize;
  uniform float uTwinkle;
  uniform float uTime;
  varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Size attenuation: closer particles get bigger. The 250 factor is
    // calibrated so that uSize ~ 0.05 yields ~3px points at the
    // default camera distance (z=5). Hard cap raised to 20px so the
    // editor particleSize slider can push dust toward snow-flake
    // territory; Bloom can still wash big bright points out, so users
    // should pair large sizes with lower opacity.
    float dist = -mv.z;
    gl_PointSize = clamp(uSize * aSize * (250.0 / max(dist, 0.001)), 0.75, 26.0);
    // Each particle's twinkle phase is independent (aPhase), so the
    // cloud reads as flickering individual dust motes rather than a
    // single coherent pulse. uTwinkle = 0 disables (1.0 multiplier).
    float t = sin(uTime * 1.5 + aPhase) * 0.5 + 0.5;
    vTwinkle = mix(1.0, t, uTwinkle);
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTwinkle;
  void main() {
    // Crisp round point: a near-solid disc with only a thin
    // anti-aliased rim, plus a faint outer halo for atmosphere.
    // The old pow(1-2r,1.5) falloff was so gradual that large
    // particleSize values turned each mote into a hazy gradient blob;
    // a defined disc stays sharp at any size.
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;
    float disc = 1.0 - smoothstep(0.34, 0.46, r); // solid core + AA rim
    float halo = pow(1.0 - r * 2.0, 3.0) * 0.35;  // subtle glow
    float a = clamp(disc + halo, 0.0, 1.0);
    gl_FragColor = vec4(uColor, a * uOpacity * vTwinkle);
  }
`;
