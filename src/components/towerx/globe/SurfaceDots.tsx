import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
    AdditiveBlending,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    type Points,
    type ShaderMaterial,
} from 'three';
import type { WebGLGlobeConfig } from '../webglConfig';
import { GLOBE_RADII, latLngToVector3 } from '../globeConfig';
import { dotsAlpha } from '../intro/introClock';
import { getLandMask } from './buildLandTexture';

/**
 * SurfaceDots — breathing point pattern scattered across either the
 * land OR the ocean (toggled by `surfaceDotsTargetLand`). The algorithm
 * is the same lat/lng-grid scan that 2050.earth uses — spherical area
 * compensation via 1/sin(lat) column spacing, 5-point cross-sample
 * against the land mask, random thinning — only the polarity of the
 * mask check flips between modes.
 *
 * Each surviving point gets:
 *   - a tiny radial jitter so the cloud has volumetric depth instead
 *     of sitting on a perfect shell;
 *   - an independent phase used by the fragment shader to modulate
 *     alpha sinusoidally — every dot breathes on its own clock so
 *     the surface reads as flickering bioluminescence rather than the
 *     whole planet pulsing in unison.
 *
 * Mounted INSIDE the tilt / spin / scale group in `GlobeWebGL.tsx` —
 * dots are ON the planet, they need to inherit the rotation that
 * positions East Asia at the camera.
 *
 * Naming note: this file lived as `OceanDots.tsx` for one round when
 * we copied 2050.earth's defaults literally (ocean-only). Renamed
 * because the user actually wants the LAND variant — continents that
 * glow like a circuit board — and the toggle makes it useful for both.
 */
type SurfaceDotsProps = {
    config: WebGLGlobeConfig;
};

type SurfaceDotsGeometryOptions = {
    density: number;
    coastBuffer: number;
    thinning: number;
    seed: number;
    targetLand: boolean;
};

type WrongSideSampler = (u: number, v: number) => boolean;

function makeRng(seed: number) {
    let s = seed | 0 || 1;
    return () => {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        return ((s >>> 0) % 0xffffffff) / 0xffffffff;
    };
}

function smoothstep(edge0: number, edge1: number, value: number) {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

function fract(value: number) {
    return value - Math.floor(value);
}

function hash31(x: number, y: number, z: number) {
    const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
    return fract(h);
}

function valueNoise3(x: number, y: number, z: number) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fx = smoothstep(0, 1, x - ix);
    const fy = smoothstep(0, 1, y - iy);
    const fz = smoothstep(0, 1, z - iz);

    const x00 = lerp(hash31(ix, iy, iz), hash31(ix + 1, iy, iz), fx);
    const x10 = lerp(hash31(ix, iy + 1, iz), hash31(ix + 1, iy + 1, iz), fx);
    const x01 = lerp(hash31(ix, iy, iz + 1), hash31(ix + 1, iy, iz + 1), fx);
    const x11 = lerp(hash31(ix, iy + 1, iz + 1), hash31(ix + 1, iy + 1, iz + 1), fx);
    const y0 = lerp(x00, x10, fy);
    const y1 = lerp(x01, x11, fy);
    return lerp(y0, y1, fz);
}

function countWrongCoastSamples(wrongSide: WrongSideSampler, u: number, v: number, coastBuffer: number) {
    const samples: Array<[number, number]> = [
        [u - coastBuffer, v],
        [u + coastBuffer, v],
        [u, v - coastBuffer],
        [u, v + coastBuffer],
    ];
    return samples.reduce((count, [sampleU, sampleV]) => count + (wrongSide(sampleU, sampleV) ? 1 : 0), 0);
}

function isSurfaceDotCandidate(wrongSide: WrongSideSampler, u: number, v: number, coastBuffer: number) {
    if (wrongSide(u, v)) return false;
    return countWrongCoastSamples(wrongSide, u, v, coastBuffer) < 3;
}

/**
 * Walk the lat/lng grid, classify each candidate against the land
 * mask + 4 neighbours (the 5-point cross), keep only points where all
 * 5 samples match the target side. Output is a `BufferGeometry` with
 * `position` + `aPhase` attributes.
 *
 * `density` linearly tightens the step on BOTH axes — doubling
 * density quadruples the candidate count before mask filtering, then
 * roughly doubles the final point count after random thinning.
 *
 * `coastBuffer` (UV units, ~0.005–0.04) controls the cross-sample
 * radius. Larger pushes dots further from the coastline (works in
 * both directions — bigger buffer = land dots stay further inland,
 * ocean dots stay further offshore).
 *
 * `targetLand` true → keep points where the 5-point cross is all on
 * LAND; false → all on OCEAN.
 */
function buildSurfaceDotsGeometry(options: SurfaceDotsGeometryOptions) {
    const { density, coastBuffer, thinning, seed, targetLand } = options;
    const mask = getLandMask();
    const rng = makeRng(seed);

    const positions: number[] = [];
    const phases: number[] = [];
    const flow: number[] = [];

    // `wrongSide(u, v)` reports whether the sample falls on the OPPOSITE
    // side from the target. The placement loop bails as soon as any of
    // the 5 cross samples is on the wrong side.
    const wrongSide = targetLand
        ? (u: number, v: number) => !mask.sample(u, v) // targeting land, ocean is wrong
        : (u: number, v: number) => mask.sample(u, v); // targeting ocean, land is wrong

    // Step constants chosen so vertical (lat) arc = horizontal (lng) arc
    // on the unit sphere at EVERY latitude:
    //   - vertical arc per row    = latStep                              (linear v parametrisation)
    //   - horizontal arc per col  = lonStep × 2π × cos(lat) = 2π × lonStep_base   (the 1/sin
    //                              compensation cancels cos(lat))
    // Setting lonStep_base = latStep / (2π) ≈ latStep × 0.159 makes both
    // equal, so cells are SQUARE in arc space. With the half-step row
    // parity offset below, any three neighbouring dots form an isosceles
    // triangle (two equal long sides to the adjacent rows + one shorter
    // same-row side) — the 2050.earth grid pattern.
    const latStep = 0.04 / Math.max(0.1, density);
    const lonBase = latStep / (2 * Math.PI);
    for (let P = 0.001; P < Math.PI - 0.001; P += latStep) {
        const v = P / Math.PI; // 0 = north, 1 = south
        const lonStep = lonBase / Math.max(0.05, Math.sin(P));
        const ncols = Math.max(1, Math.floor(1 / lonStep));
        // Alternate odd/even rows by half a step so the grid reads as
        // hexagonal rather than rectangular — feels more organic.
        const rowParity = Math.floor(P / latStep) % 2 === 0 ? 0 : 0.5;

        for (let s = 0; s < ncols; s++) {
            let u = ((s + rowParity) / ncols) % 1;
            if (u < 0) u += 1;

            if (rng() > thinning) continue;
            // Coastline buffer: the old rule rejected the point if ANY of
            // the 4 ring samples was on the wrong side. That erased every
            // landmass narrower than 2×coastBuffer — Taiwan, Japan, Hainan,
            // the Philippines all vanished while the wide mainland kept its
            // dots. Relaxed to a MAJORITY rule: drop the point only when 3+
            // of the 4 ring samples are wrong-side. A thin island's spine
            // has 2 ocean neighbours (across the narrow axis) but 2 land
            // neighbours (along it) → kept; a wide coastline's outermost
            // fringe has 3-4 ocean neighbours → still trimmed.
            if (!isSurfaceDotCandidate(wrongSide, u, v, coastBuffer)) continue;

            const lng = (u - 0.5) * 360;
            const lat = 90 - v * 180;
            // Tiny outward jitter so the cloud has depth — most dots sit at
            // BODY+ε but a few peek slightly above for sparkle. Range stays
            // below LINE shell at 1.002 so dots never poke through the
            // country outlines.
            const r = GLOBE_RADII.BODY + 0.0005 + rng() * 0.0008;
            const pos = latLngToVector3(lat, lng, r);
            positions.push(pos.x, pos.y, pos.z);
            phases.push(rng() * Math.PI * 2);
            flow.push(0.5);
        }
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(positions), 3));
    g.setAttribute('aPhase', new Float32BufferAttribute(new Float32Array(phases), 1));
    g.setAttribute('aFlow', new Float32BufferAttribute(new Float32Array(flow), 1));
    return g;
}

export function SurfaceDots({ config }: SurfaceDotsProps) {
    const cfgRef = useRef(config);
    cfgRef.current = config;

    const pointsRef = useRef<Points>(null);
    const matRef = useRef<ShaderMaterial>(null);

    // Heavy work (lat/lng grid scan + mask sampling) only re-runs when
    // the inputs that change the point set change. Colour / opacity /
    // breathing speed live as uniforms and update without rebuilding.
    const geometry = useMemo(
        () =>
            buildSurfaceDotsGeometry({
                density: config.surfaceDotsDensity,
                coastBuffer: config.surfaceDotsCoastBuffer,
                thinning: config.surfaceDotsThinning,
                seed: config.surfaceDotsSeed,
                targetLand: config.surfaceDotsTargetLand,
            }),
        [
            config.surfaceDotsDensity,
            config.surfaceDotsCoastBuffer,
            config.surfaceDotsThinning,
            config.surfaceDotsSeed,
            config.surfaceDotsTargetLand,
        ],
    );
    const materialKey = [
        config.surfaceDotsColor,
        config.surfaceDotsOpacity,
        config.surfaceDotsSize,
        config.surfaceDotsBreathe,
        config.surfaceDotsFacingPow,
    ].join(':');

    useFrame((state) => {
        const c = cfgRef.current;
        if (pointsRef.current) {
            pointsRef.current.visible = c.surfaceDotsEnabled;
        }

        const positionAttr = geometry.getAttribute('position') as Float32BufferAttribute;
        const phaseAttr = geometry.getAttribute('aPhase') as Float32BufferAttribute;
        const flowAttr = geometry.getAttribute('aFlow') as Float32BufferAttribute;
        const positions = positionAttr.array as Float32Array;
        const phases = phaseAttr.array as Float32Array;
        const flow = flowAttr.array as Float32Array;
        const freq = 5.2 / Math.max(c.surfaceDotsClusterScale, 0.25);
        const flowT = state.clock.elapsedTime * c.surfaceDotsBreathSpeed;
        const sharp = Math.min(1, Math.max(0, c.surfaceDotsClusterSharp));
        const softWidth = 0.42 + (0.1 - 0.42) * sharp;
        const contrastMix = 0.18 + sharp * 0.76;

        for (let i = 0; i < flow.length; i += 1) {
            const p = i * 3;
            const x = positions[p];
            const y = positions[p + 1];
            const z = positions[p + 2];
            const phase = phases[i];

            // TowerX-like surface motion: a coherent noise field is sampled
            // with two slow circular offsets. The lit regions morph and drift
            // locally; no single global band sweeps across the planet.
            const t1 = flowT * 0.42 + phase * 0.08;
            const t2 = flowT * 0.29 - phase * 0.05;
            const ox1 = Math.cos(t1) * 0.48;
            const oy1 = Math.sin(t1 * 0.83) * 0.42;
            const oz1 = Math.sin(t1 * 0.67) * 0.46;
            const ox2 = Math.sin(t2 * 0.71) * 0.36;
            const oy2 = Math.cos(t2) * 0.4;
            const oz2 = Math.cos(t2 * 0.59) * 0.34;

            const broad = valueNoise3(x * freq + ox1 + 17.1, y * freq + oy1 + 8.3, z * freq + oz1 + 23.7);
            const detail = valueNoise3(
                x * freq * 1.85 + ox2 + 51.4,
                y * freq * 1.85 + oy2 + 13.9,
                z * freq * 1.85 + oz2 + 37.2,
            );
            const jitter = Math.sin(phase + flowT * 1.37) * 0.035;
            const field = Math.min(1, Math.max(0, broad * 0.72 + detail * 0.24 + 0.02 + jitter));
            const shaped = smoothstep(0.5 - softWidth, 0.5 + softWidth, field);
            const contrasted = Math.min(1, Math.max(0, (shaped - 0.5) * (1.2 + sharp * 1.9) + 0.5));
            flow[i] = Math.min(1, Math.max(0, lerp(field, contrasted, contrastMix)));
        }
        flowAttr.needsUpdate = true;

        if (matRef.current) {
            const u = matRef.current.uniforms;
            u.uColor.value.set(c.surfaceDotsColor);
            // Intro Phase B — dots are the first layer to dress in.
            u.uOpacity.value = c.surfaceDotsOpacity * dotsAlpha();
            u.uSize.value = c.surfaceDotsSize;
            u.uBreathe.value = c.surfaceDotsBreathe;
            u.uBreathSpeed.value = c.surfaceDotsBreathSpeed;
            u.uClusterScale.value = c.surfaceDotsClusterScale;
            u.uClusterSharp.value = c.surfaceDotsClusterSharp;
            u.uFacingPow.value = c.surfaceDotsFacingPow;
            u.uTime.value = state.clock.elapsedTime;
            matRef.current.uniformsNeedUpdate = true;
        }
    });

    return (
        <points ref={pointsRef} geometry={geometry} renderOrder={0.5}>
            <shaderMaterial
                key={materialKey}
                ref={matRef}
                transparent
                depthWrite={false}
                // depthTest OFF on purpose. A Points sprite has a single
                // (centre) depth; near the limb the sphere surface within the
                // sprite's screen footprint spans a big depth range, so the
                // depth test clips half the sprite → "dot punched into the
                // globe". With no depth test there's no per-fragment fight at
                // all; back-hemisphere dots are instead hidden by the
                // facing-based vFade discard in the shader, which is exact.
                depthTest={false}
                blending={AdditiveBlending}
                uniforms={{
                    uColor: { value: new Color(config.surfaceDotsColor) },
                    uOpacity: { value: config.surfaceDotsOpacity },
                    uSize: { value: config.surfaceDotsSize },
                    uBreathe: { value: config.surfaceDotsBreathe },
                    uBreathSpeed: { value: config.surfaceDotsBreathSpeed },
                    uClusterScale: { value: config.surfaceDotsClusterScale },
                    uClusterSharp: { value: config.surfaceDotsClusterSharp },
                    uFacingPow: { value: config.surfaceDotsFacingPow },
                    uTime: { value: 0 },
                }}
                vertexShader={DOT_VERT}
                fragmentShader={DOT_FRAG}
            />
        </points>
    );
}

const DOT_VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aFlow;
  uniform float uSize;
  uniform float uBreathe;
  uniform float uFacingPow;
  varying float vFade;
  varying float vFlow;

  void main() {
    vFlow = aFlow;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    // Silhouette fade: a Points sprite is a flat screen quad with ONE
    // depth (its centre). A big dot near the globe's rim straddles
    // the silhouette — half its quad lands on the closer-to-camera
    // bulge and gets depth-clipped, reading as the dot punching INTO
    // the sphere. Fix: fade + shrink dots as their surface normal
    // turns away from the camera so a large sprite never sits across
    // the rim. centreView = the dots' local origin in view space
    // (= globe centre, since dots are placed around origin).
    // Use an explicit origin transform instead of modelViewMatrix[3].
    // Some WebGL/driver stacks return a bad facing band with direct
    // matrix-column indexing, which fades every land dot to zero.
    vec3 centreView = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 nrm = normalize(mv.xyz - centreView);
    vec3 vdir = normalize(-mv.xyz);
    float facing = dot(nrm, vdir);
    // Hemisphere-wide curvature dimming. The old smoothstep(0.12,0.42)
    // only faded the last ~25° rim band and left the whole front
    // hemisphere at one brightness (the "flat disc" tell). pow(facing,
    // k) instead dims continuously from the sub-camera point outward;
    // facing<=0 (back hemisphere) → 0 so the silhouette discard below
    // still hides far-side dots exactly.
    vFade = pow(clamp(facing, 0.0, 1.0), uFacingPow);
    float sizePulse = mix(1.0 - uBreathe * 0.1, 1.0 + uBreathe * 0.24, aFlow);
    // Same calibration as AtmosphereParticles: uSize ~ 0.05 yields
    // ~3px points at the default camera distance. Hard cap raised to
    // 18px so the editor surfaceDotsSize slider can push dots to a
    // chunky circuit-board-node look (uSize 0.3 -> ~15px at default
    // camera). × vFade so rim dots shrink out instead of straddling.
    gl_PointSize = clamp(uSize * sizePulse * (250.0 / max(dist, 0.001)), 1.0, 18.0) * vFade;
  }
`;

const DOT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uBreathe;
  varying float vFade;
  varying float vFlow;
  void main() {
    if (vFade <= 0.001) discard;
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;
    // Crisp disc + thin AA rim (same fix as AtmosphereParticles).
    // The old pow(1-2r,1.2) falloff turned enlarged dots into hazy
    // blobs; a defined disc stays sharp at any surfaceDotsSize.
    float disc = 1.0 - smoothstep(0.36, 0.48, r);
    float halo = pow(1.0 - r * 2.0, 3.0) * 0.3;
    float a = clamp(disc + halo, 0.0, 1.0);
    float darkFloor = clamp(1.0 - uBreathe, 0.0, 1.0);
    float breathe = mix(darkFloor, 1.0, vFlow);
    vec3 flowColor = uColor * mix(0.18, 1.65, vFlow);
    gl_FragColor = vec4(flowColor, a * uOpacity * breathe * vFade);
  }
`;
