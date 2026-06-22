import { Camera, Color, Group, Matrix4, QuadraticBezierCurve3, Vector3 } from 'three';
import type { Size } from '@react-three/fiber';
import type { Route } from '../mock-data';
import type { ActivePulse } from '../stage/ambientEngine';
import { AMBIENT } from '../stage/ambientConfig';
import type { WebGLGlobeConfig } from '../webglConfig';
import type { Phase as RrPhase } from './crisisRerouteTimeline';

export type RouteCurve = { route: Route; curve: QuadraticBezierCurve3; points: Vector3[]; color: Color; streak: { head: string; tail: string }; speed: number; primary: boolean };
export type RouteScratchVectors = { head: Vector3; tail: Vector3; hw: Vector3; tw: Vector3; camDir: Vector3; pDir: Vector3 };

type LineChild = { visible: boolean; material?: { opacity: number; depthWrite: boolean; transparent: boolean; color?: Color } };

export function routePhaseForRender(crisisResolving: boolean, crisisPhase: RrPhase): RrPhase {
  return crisisResolving && crisisPhase === 'rest' ? 'executing' : crisisPhase;
}

export function updateCanvasSize(canvas: HTMLCanvasElement, dpr: number, size: Size) {
  if (canvas.width !== size.width * dpr || canvas.height !== size.height * dpr) {
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
  }
}

function buildPulseByRoute(pulses: ActivePulse[]): Record<string, ActivePulse> {
  const pulseByRoute: Record<string, ActivePulse> = {};
  for (const p of pulses) pulseByRoute[p.routeId] = p;
  return pulseByRoute;
}

function pulseOpacity(pulse: ActivePulse | undefined, nowMs: number, config: WebGLGlobeConfig, routeAlphaValue: number): number {
  if (!pulse) return 0;
  const prog = (nowMs - pulse.startedAt) / (pulse.lifetime ?? AMBIENT.pulseLifetimeMs);
  const env = Math.max(0, Math.min(1, prog / 0.15) * Math.min(1, (1 - prog) / 0.3));
  return env * config.routeOpacity * 0.8 * routeAlphaValue;
}

function routeLineOpacity({
  curve,
  pulse,
  nowMs,
  config,
  routeAlphaValue,
  crisisRouteOpacity
}: {
  curve: RouteCurve;
  pulse: ActivePulse | undefined;
  nowMs: number;
  config: WebGLGlobeConfig;
  routeAlphaValue: number;
  crisisRouteOpacity: number;
}): number {
  if (curve.route.id === AMBIENT.crisisRouteId) {
    return config.routeOpacity * routeAlphaValue * crisisRouteOpacity;
  }
  return pulseOpacity(pulse, nowMs, config, routeAlphaValue);
}

export function updateRouteLines({
  group,
  curves,
  pulses,
  config,
  routeAlphaValue,
  crisisRouteOpacity,
  healFrom
}: {
  group: Group;
  curves: RouteCurve[];
  pulses: ActivePulse[];
  config: WebGLGlobeConfig;
  routeAlphaValue: number;
  crisisRouteOpacity: number;
  healFrom: Color;
}) {
  const nowMs = performance.now();
  const pulseByRoute = buildPulseByRoute(pulses);
  for (let ci = 0; ci < curves.length; ci++) {
    const child = group.children[ci] as unknown as LineChild;
    const mat = child.material;
    if (!mat) continue;
    const curve = curves[ci];
    const opacity = routeLineOpacity({ curve, pulse: pulseByRoute[curve.route.id], nowMs, config, routeAlphaValue, crisisRouteOpacity });
    if (curve.route.id === AMBIENT.crisisRouteId && mat.color) mat.color.copy(healFrom);
    mat.depthWrite = false;
    mat.transparent = true;
    mat.opacity = opacity;
    child.visible = opacity > 0.012;
  }
}

function projectWorldPoint({
  point,
  camera,
  width,
  height,
  centerX,
  centerY,
  scratch
}: {
  point: Vector3;
  camera: Camera;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  scratch: RouteScratchVectors;
}): { x: number; y: number; vis: boolean } {
  scratch.pDir.set(point.x - centerX, point.y - centerY, point.z).normalize();
  const facing = scratch.pDir.dot(scratch.camDir) > -0.1;
  const p = point.project(camera);
  return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height, vis: facing && p.z < 1 };
}

export function drawPulseStreaks({
  ctx,
  camera,
  width,
  height,
  matrixWorld,
  curves,
  curveIndex,
  pulses,
  config,
  routeAlphaValue,
  crisisRouteOpacity,
  scratch
}: {
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  width: number;
  height: number;
  matrixWorld: Matrix4;
  curves: RouteCurve[];
  curveIndex: Record<string, number>;
  pulses: ActivePulse[];
  config: WebGLGlobeConfig;
  routeAlphaValue: number;
  crisisRouteOpacity: number;
  scratch: RouteScratchVectors;
}) {
  scratch.camDir.set(camera.position.x - config.positionX, camera.position.y - config.positionY, camera.position.z).normalize();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const now = performance.now();
  for (const pulse of pulses) {
    const ci = curveIndex[pulse.routeId];
    if (ci === undefined) continue;
    const cur = curves[ci];
    const age = now - pulse.startedAt;
    const lifetime = pulse.lifetime ?? AMBIENT.pulseLifetimeMs;
    const u = pulse.crisis ? (age / lifetime) % 1 : Math.min(1, age / lifetime);
    const uTail = Math.max(0, u - 0.06);
    cur.curve.getPoint(u, scratch.head);
    cur.curve.getPoint(uTail, scratch.tail);
    scratch.hw.copy(scratch.head).applyMatrix4(matrixWorld);
    scratch.tw.copy(scratch.tail).applyMatrix4(matrixWorld);
    const ph = projectWorldPoint({ point: scratch.hw, camera, width, height, centerX: config.positionX, centerY: config.positionY, scratch });
    const pt = projectWorldPoint({ point: scratch.tw, camera, width, height, centerX: config.positionX, centerY: config.positionY, scratch });
    if (!ph.vis && !pt.vis) continue;
    const edge = Math.min(1, u / 0.08) * Math.min(1, (1 - u) / 0.08);
    const alpha = edge * config.cometOpacity * routeAlphaValue * (pulse.crisis ? crisisRouteOpacity : 1);
    if (alpha <= 0.01) continue;
    const gradient = ctx.createLinearGradient(pt.x, pt.y, ph.x, ph.y);
    gradient.addColorStop(0, cur.streak.tail);
    gradient.addColorStop(1, cur.streak.head);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(ph.x, ph.y);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = cur.primary ? 2.8 : 2.2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
