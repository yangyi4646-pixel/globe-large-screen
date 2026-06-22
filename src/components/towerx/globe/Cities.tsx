import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import {
  AdditiveBlending,
  CanvasTexture,
  Mesh,
  Quaternion,
  SphereGeometry,
  Vector3
} from 'three';
import type { City, CityStatus } from '../mock-data';
import { GLOBE_RADII, latLngToVector3 } from '../globeConfig';
import { cityAlpha } from '../intro/introClock';
import { PALETTE } from '../theme';
import type { WebGLGlobeConfig } from '../webglConfig';

/**
 * Cities — ported from New project's `GlobeCanvas.drawCities`. The
 * canvas-2D version draws each city's halo as `ctx.createRadialGradient`
 * filled into an arc; in R3F we replicate that as a billboarded plane
 * carrying a CanvasTexture of the same gradient (alpha 1 at center → 0
 * at edge). That is the "光点 / luminous point" the user asked for —
 * NOT the RingGeometry annulus, which has hard inner+outer edges and
 * reads as a target reticle.
 *
 * Three layers per city:
 *
 *   1. Soft halo  — billboarded plane × radial-gradient map, additive
 *                   blend, status-tinted via material.color. Pointer
 *                   events live HERE (dot is only ~4 px on screen, too
 *                   small to be a reliable click target).
 *   2. Core dot   — small filled sphere. Bright center punching
 *                   through the halo gradient.
 *   3. Label      — drei <Billboard> with EN-cap + zh stack. Shown
 *                   only for cities with a live connection (R4-4), so
 *                   the full node set never renders names at once.
 *
 * Back-of-globe culling: per-frame, cityNormalWorld · cameraToCenter
 * → if back-facing, set group.visible = false (kills render and R3F
 * pointer events for the whole city group, including the halo's
 * pointer area).
 */

type CitiesProps = {
  cities: City[];
  config: WebGLGlobeConfig;
  onCityClick?: (cityId: string) => void;
  hasAlertById?: Record<string, boolean>;
  /** 有活跃连线的城市 —— 仅这些显示标签(R4-4 去杂乱);
   *  危机脉冲常驻 → 香港/上海常亮。 */
  activeCityIds?: Set<string>;
};

// HALO color — saturated brand hue. The big colored glow.
const STATUS_COLOR: Record<CityStatus, string> = {
  primary: PALETTE.fg,
  normal: PALETTE.blue,
  critical: PALETTE.magenta,
  watch: '#ffb05c'
};

// CORE DOT color — near-white, tinted toward status hue. Picked
// brighter than the halo's center so the dot reads as a luminous
// pinpoint inside the colored glow (matches New project's
// `ctx.fillStyle = isCrit ? '#ffd4e3' : isPrim ? '#eef4ff' : '#cfd9ff'`).
const DOT_CORE_COLOR: Record<CityStatus, string> = {
  primary: '#eef4ff',
  normal: '#dde7ff',
  critical: '#ffd4e3',
  watch: '#fff1d6'
};

// Title-case English names (首字母大写). Multi-word / apostrophe
// cities whose romanization isn't just a capitalized id go here;
// single-word ids fall through to first-letter-cap (shanghai →
// Shanghai), never run-together ALL-CAPS.
const EN_NAME: Record<string, string> = {
  hongkong: 'Hong Kong',
  xian: "Xi'an",
  hochiminh: 'Ho Chi Minh',
  kualalumpur: 'Kuala Lumpur',
  phnompenh: 'Phnom Penh',
  danang: 'Da Nang'
};
function enName(id: string): string {
  return EN_NAME[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

// R4-4:取消「固定 LABEL_SET 才显示标签」。改为标签随活跃连线
// 动态显示(showLabel = activeCityIds.has(city.id)),避免一屏名字
// 杂乱;新增城市也无需登记白名单。

/**
 * Per-city label placement in the surface-tangent plane.
 *
 *   deg  — direction from the dot to the label anchor. 0 = +x
 *          ("east", screen-right at the locked camera), positive
 *          rotates toward +y ("up"). Default 0 keeps the legacy
 *          east-anchored behaviour for every city not listed here.
 *   dist — radial distance of the anchor from the dot, unit-globe
 *          space. Default = cityHaloSize + 0.012 (the old constant).
 *
 *   dist     — leader length along +x (the tangent axis that
 *              empirically maps to screen-right at the locked
 *              camera; the tangent frame's roll is otherwise
 *              uncontrolled, so we do NOT rotate within it).
 *   screenDX — horizontal offset applied *inside the Billboard*
 *              (true screen-right; negative = screen-left). Lets a
 *              label sit on the opposite side of its dot from a
 *              nearby cluster instead of being stacked far away.
 *   anchorX  — text anchor. 'left' grows the block rightward from
 *              the anchor (default); 'right' grows it leftward so a
 *              left-placed label's right edge ends just by the dot;
 *              'center' keeps the block's visual mass over the dot
 *              (use when a label must read as sitting *on* its city
 *              rather than offset to one side).
 *   screenDY — vertical separation applied *inside the Billboard*.
 *              Billboard children live in a camera-facing plane, so
 *              their X/Y are true screen axes regardless of the
 *              city's tangent roll — the reliable way to fan
 *              near-coincident labels apart.
 *
 * The default east anchor stacks every label at the same screen
 * height to the dot's right, so any two cities that are close on
 * the locked East-Asia view collide whenever both are active at
 * once. This is intermittent because labels only show for cities
 * with a live connection, and which cities are active rotates.
 *
 * Fix: for each geographic cluster that co-activates at this view,
 * separate its members in screen space. Prefer pushing a label to
 * the side its city sits on relative to the cluster (via screenDX
 * + anchorX) so it stays close to its own dot rather than stacked
 * far above/below. Where a stack is still needed, `screenDY` fans
 * them with the *minimum* gap that clears overlap — 0.032 (one
 * label block ≈ 0.024 tall at cityLabelSize 0.012). Guangzhou is
 * NW of the Shenzhen/Hong Kong pair, so its label is centred right
 * over its own dot and lifted just clear of it — as close to the
 * city as possible while the SZ/HK pair fans right-and-below. Hong
 * Kong keeps a slightly larger `dist` so its line doesn't sit
 * dead-centre on its magenta disruption pulse.
 *
 * Clusters handled (lat/lng from data.ts):
 *   PRD     广州 / 深圳 / 香港   (~100 km spread)
 *   长三角   上海 / 杭州 / 宁波
 *   韩国     首尔 / 仁川         (~50 km apart)
 *   日本     东京 / 名古屋 / 大阪
 * Cities not in a dense cluster keep the default east anchor.
 */
const LABEL_PLACEMENT: Record<
  string,
  {
    dist: number;
    screenDX?: number;
    screenDY: number;
    anchorX?: 'left' | 'right' | 'center';
  }
> = {
  // Pearl River Delta. The SZ/HK pair fans right-and-below 广州, so
  // its label is pushed screen-LEFT into the open dark pocket west
  // of the dot (user-picked spot) — far enough to fully clear the
  // pair, centred so the block sits inside that gap. 深圳/香港 split
  // right, HK's dist a touch larger to clear its magenta pulse.
  guangzhou: { dist: 0.01, screenDX: -0.06, screenDY: -0.018, anchorX: 'center' },
  shenzhen: { dist: 0.03, screenDY: 0.02 },
  hongkong: { dist: 0.03, screenDY: -0.02 },
  // Yangtze River Delta.
  ningbo: { dist: 0.022, screenDY: 0.032 },
  hangzhou: { dist: 0.022, screenDY: 0 },
  shanghai: { dist: 0.022, screenDY: -0.032 },
  // Korea.
  seoul: { dist: 0.022, screenDY: 0.016 },
  incheon: { dist: 0.022, screenDY: -0.016 },
  // Japan.
  osaka: { dist: 0.022, screenDY: 0.032 },
  nagoya: { dist: 0.022, screenDY: 0 },
  tokyo: { dist: 0.022, screenDY: -0.032 }
};

/**
 * Soft circular glow — a 128×128 white-alpha radial gradient baked
 * to a CanvasTexture at module load. Status color comes from the
 * material.color tint; one texture shared across every city so
 * we pay the alloc cost once. Gradient stops mirror New project's
 * `drawCities` halo: bright core, soft mid, transparent edge.
 */
const GLOW_TEXTURE: CanvasTexture | null = (() => {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.7)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.22)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
})();

type MeshMapRef = MutableRefObject<Map<string, Mesh>>;
type NullableSetRef = MutableRefObject<Set<string> | undefined>;

function clearHiddenHover(
  id: string,
  isFront: boolean,
  hoveredId: MutableRefObject<string | null>
) {
  if (hoveredId.current === id && !isFront) {
    hoveredId.current = null;
    document.body.style.cursor = '';
  }
}

function updateDot(dot: Mesh | undefined, isHovered: boolean, cityOpacity: number, dt: number) {
  if (!dot) return;
  const want = isHovered ? 1.7 : 1.0;
  const cur = dot.scale.x;
  const next = cur + (want - cur) * Math.min(1, dt * 12);
  dot.scale.setScalar(next);
  (dot.material as { opacity: number }).opacity = cityOpacity;
}

function labelTargetOpacity(id: string, cityOpacity: number, activeRef: NullableSetRef): number {
  return cityOpacity > 0.35 && (activeRef.current?.has(id) ?? false) ? 1 : 0;
}

type UpdateLabelOptions = { id: string; label: Mesh | undefined; cityOpacity: number; dt: number; activeRef: NullableSetRef; labelFade: MutableRefObject<Map<string, number>> };

function updateLabel({ id, label, cityOpacity, dt, activeRef, labelFade }: UpdateLabelOptions) {
  if (!label) return;
  const target = labelTargetOpacity(id, cityOpacity, activeRef);
  const cur = labelFade.current.get(id) ?? 0;
  const next = cur + (target - cur) * Math.min(1, dt * 6);
  labelFade.current.set(id, next);
  label.visible = next > 0.01;
  if (next <= 0.01) return;
  label.traverse((o) => {
    const mm = (o as unknown as { material?: { opacity: number; transparent: boolean } }).material;
    if (mm) {
      mm.transparent = true;
      mm.opacity = next;
    }
  });
}

type UpdateHaloOptions = { halo: Mesh | undefined; isHovered: boolean; config: WebGLGlobeConfig; cityOpacity: number; dt: number };

function updateHalo({ halo, isHovered, config, cityOpacity, dt }: UpdateHaloOptions) {
  if (!halo) return;
  const mat = halo.material as { opacity: number };
  const baseline = config.cityHaloOpacity;
  const want = (isHovered ? Math.min(1, baseline + 0.2) : baseline) * cityOpacity;
  mat.opacity = mat.opacity + (want - mat.opacity) * Math.min(1, dt * 10);
  const wantScale = isHovered ? 1.18 : 1.0;
  const curS = halo.scale.x;
  const nextS = curS + (wantScale - curS) * Math.min(1, dt * 10);
  halo.scale.setScalar(nextS);
}

export function Cities({
  cities,
  config,
  onCityClick,
  hasAlertById,
  activeCityIds
}: CitiesProps) {
  const groupRefs = useRef<Map<string, Mesh>>(new Map());
  const dotRefs = useRef<Map<string, Mesh>>(new Map());
  const haloRefs = useRef<Map<string, Mesh>>(new Map());
  const labelRefs = useRef<Map<string, Mesh>>(new Map());
  const hoveredId = useRef<string | null>(null);
  // R5-2:标签显隐改为每帧缓动(不再生硬 mount/unmount)。镜像最新
  // activeCityIds 供 useFrame 读;labelFade 存每个城市的渐变值。
  const activeRef = useRef(activeCityIds);
  activeRef.current = activeCityIds;
  const labelFade = useRef<Map<string, number>>(new Map());

  const dotGeom = useMemo(
    () => new SphereGeometry(config.cityDotSize, 16, 16),
    [config.cityDotSize]
  );

  const items = useMemo(() => {
    const up = new Vector3(0, 0, 1);
    const q = new Quaternion();
    return cities.map((c) => {
      const p = latLngToVector3(c.latDeg, c.lngDeg, GLOBE_RADII.CITY);
      const normal = p.clone().normalize();
      q.setFromUnitVectors(up, normal);
      return {
        city: c,
        position: [p.x, p.y, p.z] as [number, number, number],
        quat: [q.x, q.y, q.z, q.w] as [number, number, number, number],
        haloColor: STATUS_COLOR[c.status],
        coreColor: DOT_CORE_COLOR[c.status]
      };
    });
  }, [cities]);

  const tmpWorld = useMemo(() => new Vector3(), []);
  const tmpCam = useMemo(() => new Vector3(), []);
  const tmpNormal = useMemo(() => new Vector3(), []);

  useFrame(({ camera }, dt) => {
    if (!config.citiesEnabled) return;
    // Intro Phase C — the city network lights up. ca===1 after the
    // window so steady-state is unchanged.
    const ca = cityAlpha();
    const sphereCx = config.positionX;
    const sphereCy = config.positionY;
    tmpCam
      .set(camera.position.x - sphereCx, camera.position.y - sphereCy, camera.position.z)
      .normalize();

    for (const [id, group] of groupRefs.current) {
      group.getWorldPosition(tmpWorld);
      tmpNormal
        .set(tmpWorld.x - sphereCx, tmpWorld.y - sphereCy, tmpWorld.z)
        .normalize();
      const facing = tmpNormal.dot(tmpCam);
      const isFront = facing > -0.05;
      group.visible = isFront;

      const isHovered = hoveredId.current === id;
      clearHiddenHover(id, isFront, hoveredId);
      updateDot(dotRefs.current.get(id), isHovered, ca, dt);
      // Names fade in/out smoothly when the city gains/loses an active
      // connection (R5-2 — no abrupt pop; respects the DESIGN motion
      // standard). Also gated by intro `ca`.
      updateLabel({
        id,
        label: labelRefs.current.get(id),
        cityOpacity: ca,
        dt,
        activeRef,
        labelFade
      });
      updateHalo({
        halo: haloRefs.current.get(id),
        isHovered,
        config,
        cityOpacity: ca,
        dt
      });
    }
  });

  // Default label placement (legacy east anchor) — overridden
  // per-city by LABEL_PLACEMENT. The connector hairline runs in the
  // same tangent frame along the chosen direction so it always meets
  // the dot; the label text itself is billboarded to camera so it
  // stays readable regardless of latitude.
  const DEFAULT_LABEL_DIST = config.cityHaloSize + 0.012;

  const haloDiam = config.cityHaloSize * 2;

  return (
    <group>
      {items.map((item) => (
        <CityNode
          key={item.city.id}
          item={item}
          config={config}
          dotGeom={dotGeom}
          haloDiam={haloDiam}
          defaultLabelDist={DEFAULT_LABEL_DIST}
          groupRefs={groupRefs}
          dotRefs={dotRefs}
          haloRefs={haloRefs}
          labelRefs={labelRefs}
          hoveredId={hoveredId}
          onCityClick={onCityClick}
          hasAlertById={hasAlertById}
        />
      ))}
    </group>
  );
}

type CityItem = { city: City; position: [number, number, number]; quat: [number, number, number, number]; haloColor: string; coreColor: string };

function registerMesh(ref: MeshMapRef, id: string, mesh: Mesh | null) {
  if (mesh) ref.current.set(id, mesh);
  else ref.current.delete(id);
}

function cityIsInteractive(city: City, onCityClick: CitiesProps['onCityClick'], hasAlertById: CitiesProps['hasAlertById']) {
  return Boolean(onCityClick && (hasAlertById?.[city.id] ?? false));
}

function labelPlacement(cityId: string, defaultLabelDist: number) {
  const place = LABEL_PLACEMENT[cityId];
  return {
    labelAnchor: [(place ? place.dist : defaultLabelDist), 0, 0] as [number, number, number],
    labelScreenDX: place?.screenDX ?? 0,
    labelScreenDY: place?.screenDY ?? 0,
    labelAnchorX: place?.anchorX ?? 'left'
  };
}

function CityNode({
  item,
  config,
  dotGeom,
  haloDiam,
  defaultLabelDist,
  groupRefs,
  dotRefs,
  haloRefs,
  labelRefs,
  hoveredId,
  onCityClick,
  hasAlertById
}: {
  item: CityItem;
  config: WebGLGlobeConfig;
  dotGeom: SphereGeometry;
  haloDiam: number;
  defaultLabelDist: number;
  groupRefs: MeshMapRef;
  dotRefs: MeshMapRef;
  haloRefs: MeshMapRef;
  labelRefs: MeshMapRef;
  hoveredId: MutableRefObject<string | null>;
  onCityClick: CitiesProps['onCityClick'];
  hasAlertById: CitiesProps['hasAlertById'];
}) {
  const { city, position, quat, haloColor, coreColor } = item;
  const interactive = cityIsInteractive(city, onCityClick, hasAlertById);
  const isCritical = city.status === 'critical';
  const { labelAnchor, labelScreenDX, labelScreenDY, labelAnchorX } = labelPlacement(
    city.id,
    defaultLabelDist
  );
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hoveredId.current = city.id;
    if (interactive) document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    if (hoveredId.current === city.id) hoveredId.current = null;
    document.body.style.cursor = '';
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    onCityClick?.(city.id);
  };
  return (
    <group
      ref={(g) => registerMesh(groupRefs, city.id, g as unknown as Mesh | null)}
      position={position}
    >
            {/* Soft halo glow — TANGENT-to-sphere plane (quat aligns
                plane normal with city outward normal). Earlier
                iteration used drei <Billboard>, but a camera-locked
                plane intersects the spherical surface at any latitude
                where the plane's screen-space bottom edge dips below
                the city — sphere depth-test clips half the halo away
                (the "穿模" the user flagged). Tangent orientation sits
                flat on the surface and reads as a small disk of light
                glued to the planet; at high latitudes you get a
                foreshortening squish that ADDS depth instead of
                fighting it. Pointer events live here. */}
            <mesh
              ref={(m) => registerMesh(haloRefs, city.id, m)}
              quaternion={quat}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
              onClick={handleClick}
              renderOrder={3}
            >
              <planeGeometry args={[haloDiam, haloDiam]} />
              <meshBasicMaterial
                map={GLOW_TEXTURE ?? undefined}
                color={haloColor}
                transparent
                opacity={config.cityHaloOpacity}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
                side={2}
              />
            </mesh>

            {/* Core dot — near-white bright pinpoint that punches
                through the colored halo. Raycast disabled so the
                halo plane catches all clicks. */}
            <mesh
              ref={(m) => registerMesh(dotRefs, city.id, m)}
              geometry={dotGeom}
              raycast={() => null}
              renderOrder={4}
            >
              <meshBasicMaterial
                color={coreColor}
                toneMapped={false}
                transparent
                opacity={0}
              />
            </mesh>

            {/* Label + connector — only for curated cities.
                renderOrder + depthTest=false forces labels on top of
                the halo plane (which is transparent + depthWrite
                false, so default sort can put it OVER text depending
                on z, hiding city names — the user flagged this). */}
            {config.cityLabelsEnabled ? (
              <group
                quaternion={quat}
                ref={(g) => registerMesh(labelRefs, city.id, g as unknown as Mesh | null)}
              >
                {/* 切平面引导线已删除:切平面滚转不受控,这条「水平」
                    leader 在屏幕上呈随机角度,成了城市旁的乱竖刺
                    (用户 R3#1)。所有引导/系线一律删除 —— 香港那条
                    残留竖线就是这条 HK/SZ 的 screenDY 系线(用户 P3
                    反馈)。HK/SZ 标签仍用 screenDY 错开,但不画系线,
                    就近浮在 dot 旁。 */}
                <Billboard position={labelAnchor}>
                  <group position={[labelScreenDX, labelScreenDY, 0]}>
                    <Text
                      position={[0, config.cityLabelSize * 0.55, 0]}
                      fontSize={config.cityLabelSize}
                      color={isCritical ? '#ffd4e3' : '#eaf0ff'}
                      anchorX={labelAnchorX}
                      anchorY="middle"
                      letterSpacing={0.08}
                      renderOrder={7}
                      material-toneMapped={true}
                      material-transparent={true}
                      material-depthTest={false}
                      material-depthWrite={false}
                    >
                      {enName(city.id)}
                    </Text>
                    <Text
                      position={[0, -config.cityLabelSize * 0.5, 0]}
                      fontSize={config.cityLabelSize * 0.82}
                      color="#b6c2e2"
                      anchorX={labelAnchorX}
                      anchorY="middle"
                      letterSpacing={0.02}
                      renderOrder={7}
                      material-toneMapped={true}
                      material-transparent={true}
                      material-opacity={0.78}
                      material-depthTest={false}
                      material-depthWrite={false}
                    >
                      {city.name}
                    </Text>
                  </group>
                </Billboard>
              </group>
            ) : null}
    </group>
  );
}
