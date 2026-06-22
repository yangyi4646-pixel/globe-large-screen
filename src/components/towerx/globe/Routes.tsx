import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Color, Group, QuadraticBezierCurve3, Vector3 } from 'three';
import type { Route, RouteStatus } from '../mock-data';
import { GLOBE_RADII, latLngToVector3 } from '../globeConfig';
import { routeAlpha } from '../intro/introClock';
import { PALETTE } from '../theme';
import type { WebGLGlobeConfig } from '../webglConfig';
import type { ActivePulse } from '../stage/ambientEngine';
import { AMBIENT } from '../stage/ambientConfig';
import {
  getCrisisRerouteFrame,
  type Phase as RrPhase
} from './crisisRerouteTimeline';
import {
  drawPulseStreaks,
  routePhaseForRender,
  updateCanvasSize,
  updateRouteLines,
  type RouteCurve
} from './routeFrame';

/**
 * Routes — 19 quadratic-bezier arcs (3D drei <Line>, depth-correct) +
 * comet streaks drawn the EXACT way New project's GlobeCanvas does:
 * canvas-2D `ctx.lineTo` + linear gradient + round cap + 'lighter'.
 *
 * Eight WebGL-ribbon attempts (point cloud, tapered quad, edge
 * feather, UV-analytic) all collapsed into a hard "paper arrowhead"
 * triangle — a 4-vertex billboarded quad simply can't carry a smooth
 * round-capped gradient streak. So we stop fighting WebGL for this
 * one element: each frame we project every comet's 3D head/tail point
 * to screen pixels and stroke a gradient line on a 2D overlay canvas
 * (`cometCanvasRef`, sized to the GL canvas, sitting on top of it).
 * This is literally New project's `drawRoutes` sprite code with a
 * 3D→screen projection in front.
 *
 * The arcs stay 3D (drei Line occludes against the globe correctly).
 * Comets are screen-space; a hemisphere dot-test against the globe
 * centre culls comets on the far side so they don't show "through"
 * the planet.
 */

type RoutesProps = {
  routes: Route[];
  cityById: Record<string, { latDeg: number; lngDeg: number }>;
  config: WebGLGlobeConfig;
  cometCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** 环境引擎当前活跃脉冲;Routes 只画这些。 */
  pulses: ActivePulse[];
  /** P-B Slice2:人按核按钮后 true → 原危机红线淡出,
   *  危机彗流淡出。缺省 false = 原恒定品红,零回归。 */
  crisisResolving?: boolean;
  /** 危机详情拍,用于让旧红线跟 AI 方案时间轴同步退出。 */
  crisisPhase?: RrPhase;
};

const HEAL_FROM = new Color(PALETTE.magenta);

// R3#4:取消黄色(watch)航线 —— 没有 watch 事件语义了,球上一条孤立
// 琥珀线违反「球体只蓝 + 危机品红」配色纪律。watch 防御性地并入
// blue/normal:即便未来再出现 watch route 也不会在球上画出黄线。
const STATUS_COLOR: Record<RouteStatus, Color> = {
  normal: new Color(PALETTE.blue),
  critical: new Color(PALETTE.magenta),
  watch: new Color(PALETTE.blue)
};

const STATUS_SPEED: Record<RouteStatus, number> = {
  normal: 1.0,
  critical: 2.0,
  watch: 1.0
};

// Comet head→tail colours, mirrored from New project's drawRoutes.
const STATUS_STREAK: Record<RouteStatus, { head: string; tail: string }> = {
  normal: { head: 'rgba(238,244,255,1)', tail: 'rgba(174,197,255,0)' },
  critical: { head: 'rgba(255,232,240,1)', tail: 'rgba(255,77,143,0)' },
  watch: { head: 'rgba(238,244,255,1)', tail: 'rgba(174,197,255,0)' }
};

const SEGMENTS = 64;
function buildCurve(a: Vector3, b: Vector3): QuadraticBezierCurve3 {
  const chord = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const lift = chord * 0.55 + 0.18;
  const ctrl = mid.normalize().multiplyScalar(GLOBE_RADII.CITY + lift);
  return new QuadraticBezierCurve3(a.clone(), ctrl, b.clone());
}

export function Routes({
  routes,
  cityById,
  config,
  cometCanvasRef,
  pulses,
  crisisResolving = false,
  crisisPhase = 'rest'
}: RoutesProps) {
  const prevPhase = useRef<RrPhase>('rest');
  const phaseT0 = useRef(0);
  const curves = useMemo(
    () =>
      routes
        .map((r) => {
          const src = cityById[r.source];
          const dst = cityById[r.target];
          if (!src || !dst) return null;
          const a = latLngToVector3(src.latDeg, src.lngDeg, GLOBE_RADII.CITY);
          const b = latLngToVector3(dst.latDeg, dst.lngDeg, GLOBE_RADII.CITY);
          const curve = buildCurve(a, b);
          return {
            route: r,
            curve,
            points: curve.getPoints(SEGMENTS),
            color: STATUS_COLOR[r.status],
            streak: STATUS_STREAK[r.status],
            speed: STATUS_SPEED[r.status],
            primary: r.emphasis === 'primary'
          };
        })
        .filter(<T,>(x: T | null): x is T => x !== null),
    [routes, cityById]
  );

  const curveIndex = useMemo(() => {
    const out: Record<string, number> = {};
    curves.forEach((c, i) => {
      out[c.route.id] = i;
    });
    return out;
  }, [curves]);

  // Ref on Routes' own group → its matrixWorld maps the local curve
  // points (unit-globe space, inside tilt/spin/scale) into world
  // space for projection.
  const groupRef = useRef<Group>(null);
  const pulsesRef = useRef<ActivePulse[]>(pulses);
  pulsesRef.current = pulses;

  const sv = useMemo(
    () => ({
      head: new Vector3(),
      tail: new Vector3(),
      hw: new Vector3(),
      tw: new Vector3(),
      camDir: new Vector3(),
      pDir: new Vector3()
    }),
    []
  );

  useFrame((state) => {
    const { camera, size, gl } = state;
    const t = state.clock.elapsedTime;
    const routePhase = routePhaseForRender(crisisResolving, crisisPhase);
    if (routePhase !== prevPhase.current) {
      phaseT0.current = t;
      prevPhase.current = routePhase;
    }
    const crisisRouteOpacity = getCrisisRerouteFrame(
      routePhase,
      t - phaseT0.current
    ).crisisRouteOpacity;
    const canvas = cometCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const grp = groupRef.current;
    if (!ctx || !grp) return;

    const dpr = gl.getPixelRatio();
    const W = size.width;
    const H = size.height;
    updateCanvasSize(canvas, dpr, size);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (!config.routesEnabled) return;

    // Intro Phase C — routes are the last layer to light up. ra===1
    // after the window, so steady-state opacity is unchanged.
    const ra = routeAlpha();
    updateRouteLines({
      group: grp,
      curves: curves as RouteCurve[],
      pulses: pulsesRef.current,
      config,
      routeAlphaValue: ra,
      crisisRouteOpacity,
      healFrom: HEAL_FROM
    });

    grp.updateWorldMatrix(true, false);
    drawPulseStreaks({
      ctx,
      camera,
      width: W,
      height: H,
      matrixWorld: grp.matrixWorld,
      curves: curves as RouteCurve[],
      curveIndex,
      pulses: pulsesRef.current,
      config,
      routeAlphaValue: ra,
      crisisRouteOpacity,
      scratch: sv
    });
  });

  if (!config.routesEnabled) return null;

  return (
    <group ref={groupRef}>
      {/* Every lane is rendered; opacity is driven per-frame above.
          Crisis lane = constant magenta line. Non-crisis lanes sit at
          opacity 0 until their pulse is alive, then fade in/out with
          it. Order here MUST match `curves` (drei <Line> = one child
          each, in map order) — the useFrame opacity loop indexes by
          position. */}
      {curves.map(({ route, points, color }) => {
        const isCrisis = route.id === AMBIENT.crisisRouteId;
        return (
          <Line
            key={route.id}
            points={points}
            color={`#${color.getHexString()}`}
            lineWidth={isCrisis ? config.routeWidth * 1.4 : config.routeWidth}
            transparent
            opacity={isCrisis ? config.routeOpacity : 0}
            toneMapped={false}
          />
        );
      })}
    </group>
  );
}
