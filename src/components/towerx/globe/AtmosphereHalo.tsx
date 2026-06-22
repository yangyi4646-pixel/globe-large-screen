import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  type Mesh,
  type ShaderMaterial
} from 'three';
import type { WebGLGlobeConfig } from '../webglConfig';
import { haloFlare } from '../intro/introClock';

/**
 * AtmosphereHalo — the SOLE atmosphere/glow layer.
 *
 * Earlier rounds had two parallel implementations of "halo around
 * the planet": a back-side Fresnel sphere shell AND a flat radial-
 * gradient billboard. The Fresnel shell kept z-fighting the country
 * lines, kept flipping behaviour between FrontSide/BackSide, and
 * generally couldn't be tuned without breaking. The flat billboard
 * has no such failure modes — it's literally a textured quad behind
 * the planet — so this round we delete the shell and let the
 * billboard do everything.
 *
 * One billboard, one shader, three controls — size / intensity /
 * falloff — plus a two-stop colour gradient (inner near the rim,
 * outer fading out into space). Tune size for either:
 *   - "thin atmospheric line": size 2.4, falloff 5+   (rim hugs body)
 *   - "broad space halo":        size 5+,  falloff ~2 (large cloud)
 *
 * Plane is parented at the same offset group as StylizedEarth so
 * X/Y editor sliders move both together. renderOrder -1 + depthTest
 * off so it always paints first, behind everything else, never
 * fights any other geometry.
 */
type AtmosphereHaloProps = {
  config: WebGLGlobeConfig;
};

export function AtmosphereHalo({ config }: AtmosphereHaloProps) {
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);

  useFrame(() => {
    const c = cfgRef.current;
    if (meshRef.current) {
      meshRef.current.visible = c.haloEnabled;
      // haloSize is documented as "disc size relative to sphere radius"
      // — multiply by (c.radius / referenceRadius) so the halo plane
      // scales with the planet while the haloSize slider keeps the
      // same numeric meaning at the default radius. Without scaling,
      // enlarging the planet leaves the halo plane at its old size,
      // body silhouette grows past it, depthTest culls the plane,
      // halo vanishes. The reference radius is the project's default
      // (2.0) so haloSize at default radius reads as the literal plane
      // scale users saw before the fix.
      const REFERENCE_RADIUS = 2;
      meshRef.current.scale.setScalar(c.haloSize * (c.radius / REFERENCE_RADIUS));
      // Park the halo plane BEHIND the planet's back face every frame.
      // Planet sphere is centred at z=0 with radius = c.radius, so its
      // back face is at z=-c.radius. We push the halo a further 0.5
      // units behind that so the plane never intersects the sphere
      // regardless of how the editor stretches `radius`. Without this
      // the plane sat at z=-0.5 — inside the sphere for any radius
      // greater than 0.5 — and the bright additive pixels bled into
      // the silhouette via Bloom.
      meshRef.current.position.z = -(c.radius + 0.5);
    }
    if (matRef.current) {
      // Reveal — haloFlare() is the SOLE intro driver for the halo:
      // it honours introAtmoStartMs ("大气起") + introLayerFadeMs, and
      // applies introIgnite as an optional bloom peak. It is NOT also
      // gated by a separate atmoAlpha — doing both cancelled the curve
      // exactly while it should rise (proven via instrumentation), and
      // it also made "大气起" not affect the halo. uOpacity stays 1 so
      // brightness is governed purely by uIntensity here.
      matRef.current.uniforms.uIntensity.value =
        c.haloIntensity * haloFlare();
      matRef.current.uniforms.uFalloff.value = c.haloFalloff;
      matRef.current.uniforms.uInnerColor.value.set(c.haloInnerColor);
      matRef.current.uniforms.uOuterColor.value.set(c.haloOuterColor);
      matRef.current.uniforms.uOpacity.value = 1;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, -(config.radius + 0.5)]}
      renderOrder={-1}
      visible={config.haloEnabled}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        // depthTest kept ON so the opaque planet body occludes the
        // halo where they overlap on screen. The halo plane sits at
        // z = -(radius + 0.5), i.e. half a unit behind the body's
        // back face — depth-test naturally culls the plane's pixels
        // inside the body silhouette, leaving only the rim halo.
        // An earlier version disabled depthTest "so it always paints
        // first"; combined with AdditiveBlending + large haloSize this
        // made the bright violet centre of the billboard draw on top
        // of the planet's textured surface, which read as a
        // transparent globe.
        depthTest={true}
        blending={AdditiveBlending}
        uniforms={{
          uInnerColor: { value: new Color(config.haloInnerColor) },
          uOuterColor: { value: new Color(config.haloOuterColor) },
          uIntensity: { value: config.haloIntensity },
          uFalloff: { value: config.haloFalloff },
          uOpacity: { value: 0 }
        }}
        vertexShader={HALO_VERT}
        fragmentShader={HALO_FRAG}
      />
    </mesh>
  );
}

const HALO_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Two-stop gradient: alpha = pow(1 - dist, falloff) * intensity.
// Colour mixes from inner near the centre to outer at the perimeter.
const HALO_FRAG = /* glsl */ `
  uniform vec3 uInnerColor;
  uniform vec3 uOuterColor;
  uniform float uIntensity;
  uniform float uFalloff;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 d = vUv - 0.5;
    float dist = length(d) * 2.0;
    float t = pow(max(0.0, 1.0 - dist), uFalloff);
    float alpha = t * uIntensity * uOpacity;
    // Mix the two colours along the radial distance — inner colour
    // dominates near the centre (where the planet body sits), outer
    // colour shows up as the halo extends outward.
    vec3 col = mix(uOuterColor, uInnerColor, t);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;
