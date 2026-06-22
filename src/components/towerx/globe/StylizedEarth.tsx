import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
    AdditiveBlending,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    type ShaderMaterial,
} from 'three';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import countries50m from 'world-atlas/countries-50m.json';
import type { WebGLGlobeConfig } from '../webglConfig';
import { GLOBE_RADII, latLngToVector3 } from '../globeConfig';
import { buildLandTexture } from './buildLandTexture';

/**
 * StylizedEarth — slim variant.
 *
 * 与原 TowerX 版本相比，去掉了 introClock 的 bodyAlpha / linesAlpha /
 * rimFlare 三个时序函数，body 和国家线一开始就完全不透明，没有"渐入"
 * 仪式。其它一切（land mask 烘焙、country line geometry、双 ShaderMaterial）
 * 保持原样。
 */

const COUNTRIES = feature(
    countries50m as unknown as Parameters<typeof feature>[0],
    (countries50m as unknown as { objects: { countries: unknown } }).objects.countries as Parameters<typeof feature>[1],
) as unknown as FeatureCollection<Polygon | MultiPolygon>;

function buildCountryLines(r: number): BufferGeometry {
    const positions: number[] = [];
    for (const feat of COUNTRIES.features) {
        const geom = feat.geometry as Geometry;
        const rings: Array<Array<[number, number]>> = [];
        if (geom.type === 'Polygon') {
            for (const ring of geom.coordinates) rings.push(ring as Array<[number, number]>);
        } else if (geom.type === 'MultiPolygon') {
            for (const poly of geom.coordinates) {
                for (const ring of poly) rings.push(ring as Array<[number, number]>);
            }
        }
        for (const ring of rings) {
            for (let i = 0; i < ring.length - 1; i++) {
                const a = latLngToVector3(ring[i][1], ring[i][0], r);
                const b = latLngToVector3(ring[i + 1][1], ring[i + 1][0], r);
                positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
            }
        }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return g;
}

type StylizedEarthProps = {
    config: WebGLGlobeConfig;
};

export function StylizedEarth({ config }: StylizedEarthProps) {
    const cfgRef = useRef(config);
    cfgRef.current = config;

    const bodyMatRef = useRef<ShaderMaterial>(null);
    const lineMatRef = useRef<ShaderMaterial>(null);

    const landTexture = useMemo(() => buildLandTexture(2048, 1024), []);
    const countryGeo = useMemo(() => buildCountryLines(GLOBE_RADII.LINE), []);

    useFrame(() => {
        const c = cfgRef.current;

        if (bodyMatRef.current) {
            const u = bodyMatRef.current.uniforms;
            u.uOcean.value.set(c.oceanColor);
            u.uLand.value.set(c.landColor);
            u.uLandMix.value = (c.landEnabled ? 1 : 0) * c.landAlpha;
            u.uLimbStrength.value = c.limbDarkenStrength;
            u.uLimbPow.value = c.limbDarkenPow;
            u.uRimStrength.value = c.bodyRimStrength;
            u.uRimWidth.value = c.bodyRimWidth;
            u.uRimColor.value.set(c.bodyRimColor);
            u.uOpacity.value = 1.0;
        }

        if (lineMatRef.current) {
            const lu = lineMatRef.current.uniforms;
            lu.uColor.value.set(c.countryColor);
            lu.uOpacity.value = c.countryAlpha;
            lu.uFacingPow.value = c.countryFacingPow;
            lineMatRef.current.visible = c.countriesEnabled;
        }
    });

    return (
        <>
            <mesh>
                <sphereGeometry args={[GLOBE_RADII.BODY, 96, 96]} />
                <shaderMaterial
                    ref={bodyMatRef}
                    transparent
                    uniforms={{
                        uOpacity: { value: 1.0 },
                        uLandMask: { value: landTexture },
                        uOcean: { value: new Color(config.oceanColor) },
                        uLand: { value: new Color(config.landColor) },
                        uLandMix: {
                            value: (config.landEnabled ? 1 : 0) * config.landAlpha,
                        },
                        uLimbStrength: { value: config.limbDarkenStrength },
                        uLimbPow: { value: config.limbDarkenPow },
                        uRimStrength: { value: config.bodyRimStrength },
                        uRimWidth: { value: config.bodyRimWidth },
                        uRimColor: { value: new Color(config.bodyRimColor) },
                    }}
                    vertexShader={BODY_VERT}
                    fragmentShader={BODY_FRAG}
                />
            </mesh>

            <lineSegments geometry={countryGeo} renderOrder={1}>
                <shaderMaterial
                    ref={lineMatRef}
                    transparent
                    blending={AdditiveBlending}
                    depthWrite={false}
                    uniforms={{
                        uColor: { value: new Color(config.countryColor) },
                        uOpacity: { value: config.countryAlpha },
                        uFacingPow: { value: config.countryFacingPow },
                    }}
                    vertexShader={LINE_VERT}
                    fragmentShader={LINE_FRAG}
                />
            </lineSegments>
        </>
    );
}

const BODY_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 centreView = modelViewMatrix[3].xyz;
    vec3 nrm = normalize(mv.xyz - centreView);
    vec3 vdir = normalize(-mv.xyz);
    vFacing = dot(nrm, vdir);
    gl_Position = projectionMatrix * mv;
  }
`;

const BODY_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform sampler2D uLandMask;
  uniform vec3 uOcean;
  uniform vec3 uLand;
  uniform float uLandMix;
  uniform float uLimbStrength;
  uniform float uLimbPow;
  uniform float uRimStrength;
  uniform float uRimWidth;
  uniform vec3 uRimColor;
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    float mask = texture2D(uLandMask, vUv).r;
    vec3 col = mix(uOcean, uLand, mask * uLandMix);

    float f = clamp(vFacing, 0.0, 1.0);

    float lim = pow(f, uLimbPow);
    col *= mix(1.0 - uLimbStrength, 1.0, lim);

    float rim = pow(1.0 - f, uRimWidth) * uRimStrength;
    col += uRimColor * rim;

    gl_FragColor = vec4(col, uOpacity);
  }
`;

const LINE_VERT = /* glsl */ `
  varying float vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 centreView = modelViewMatrix[3].xyz;
    vec3 nrm = normalize(mv.xyz - centreView);
    vec3 vdir = normalize(-mv.xyz);
    vFacing = dot(nrm, vdir);
    gl_Position = projectionMatrix * mv;
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uFacingPow;
  varying float vFacing;
  void main() {
    float f = pow(clamp(vFacing, 0.0, 1.0), uFacingPow);
    if (f <= 0.001) discard;
    gl_FragColor = vec4(uColor, uOpacity * f);
  }
`;
