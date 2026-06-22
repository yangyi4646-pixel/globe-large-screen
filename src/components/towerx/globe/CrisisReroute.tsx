import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Color, QuadraticBezierCurve3, Vector3 } from 'three';
import { cities } from '../mock-data';
import { GLOBE_RADII, latLngToVector3 } from '../globeConfig';
import { PALETTE } from '../theme';
import {
  CANDIDATE_ARCS,
  DOWNSTREAM_ARCS,
  WINNER_CANDIDATE_KEY,
  getCrisisRerouteFrame,
  type Phase
} from './crisisRerouteTimeline';

/**
 * CrisisReroute — 危机详情打开时地球上「与该事件相关」的编排层。
 * 只在危机详情期出现(phase!=='rest'),resting 态零回归。violet =
 * AI 专属(Design §2),magenta = 危机/下游(同 §2)。
 *
 * 两组线:
 *  ① 下游影响(红色**运动虚线**,SHA→北京/首尔/东京三个远端下游,
 *     扇开不重叠):只在问题拍显示,推理拍快速退场。
 *  ② AI 算改道(violet):推理拍按 TPE→SEL→WUH 逐条试探。失败线
 *     画出后回退,赢家留下;计划拍只剩赢家;执行拍赢家由紫转蓝,
 *     原危机线在 Routes 中淡出。
 *
 * 拍1 走廊「断电波·地表点阵」是更重的 Slice2c,另做。
 */

const SAMPLES = 40;
const byId: Record<string, { latDeg: number; lngDeg: number }> = (() => {
  const m: Record<string, { latDeg: number; lngDeg: number }> = {};
  for (const c of cities) m[c.id] = c;
  return m;
})();

// 一条经停弧:a→via→b,每段二次贝塞尔抬离球面;liftK 越大弧越拱
// (赢家用更大 liftK,跟贴地的危机品红线在视觉上拉开,不再重叠)。
function arcPoints(
  aId: string,
  viaId: string,
  bId: string,
  liftK: number
): [number, number, number][] {
  const pts: Vector3[] = [];
  const chain = [aId, viaId, bId];
  for (let s = 0; s < chain.length - 1; s++) {
    const A = byId[chain[s]];
    const B = byId[chain[s + 1]];
    if (!A || !B) continue;
    const a = latLngToVector3(A.latDeg, A.lngDeg, GLOBE_RADII.CITY);
    const b = latLngToVector3(B.latDeg, B.lngDeg, GLOBE_RADII.CITY);
    const chord = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const lift = chord * 0.55 * liftK + 0.16;
    const ctrl = mid.normalize().multiplyScalar(GLOBE_RADII.CITY + lift);
    const seg = new QuadraticBezierCurve3(a, ctrl, b).getPoints(SAMPLES);
    if (s > 0) seg.shift();
    pts.push(...seg);
  }
  return pts.map((v) => [v.x, v.y, v.z]);
}

// 直达单段弧(下游影响:SHA→各下游,扇开不重叠)。
function directArc(
  aId: string,
  bId: string,
  liftK: number
): [number, number, number][] {
  const A = byId[aId];
  const B = byId[bId];
  if (!A || !B) return [];
  const a = latLngToVector3(A.latDeg, A.lngDeg, GLOBE_RADII.CITY);
  const b = latLngToVector3(B.latDeg, B.lngDeg, GLOBE_RADII.CITY);
  const chord = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const lift = chord * 0.55 * liftK + 0.14;
  const ctrl = mid.normalize().multiplyScalar(GLOBE_RADII.CITY + lift);
  return new QuadraticBezierCurve3(a, ctrl, b)
    .getPoints(SAMPLES)
    .map((v) => [v.x, v.y, v.z]);
}

type LineMat = {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  dashOffset?: number;
  color?: Color;
};
type Line2 = {
  visible: boolean;
  material: LineMat;
  geometry?: {
    setDrawRange?: (start: number, count: number) => void;
  };
};

const DOWN = DOWNSTREAM_ARCS.map((arc) => ({
  key: arc.key,
  pts: directArc(arc.source, arc.target, arc.liftK ?? 1.0)
}));

const CAND = CANDIDATE_ARCS.map((arc) => ({
  key: arc.key,
  pts: arcPoints(arc.source, arc.via, arc.target, arc.liftK ?? 1.0)
}));

type SetLineOptions = {
  line: Line2 | null | undefined;
  opacity: number;
  progress: number;
  pointCount: number;
  color?: string;
  dashOffset?: number;
};

function setLine({ line, opacity, progress, pointCount, color, dashOffset }: SetLineOptions) {
  if (!line) return;
  const m = line.material;
  m.transparent = true;
  m.depthWrite = false;
  m.opacity = opacity;
  if (m.color && color) m.color.set(color);
  if (typeof m.dashOffset === 'number' && dashOffset !== undefined) {
    m.dashOffset = dashOffset;
  }
  line.visible = opacity > 0.01 && progress > 0.01;
  line.geometry?.setDrawRange?.(
    0,
    Math.max(2, Math.round(pointCount * Math.max(0.02, progress)))
  );
}

export function CrisisReroute({ phase }: { phase: Phase }) {
  const down = useMemo(() => DOWN.filter((d) => d.pts.length > 1), []);
  const cand = useMemo(() => CAND.filter((c) => c.pts.length > 1), []);
  const downRefs = useRef<(Line2 | null)[]>([]);
  const violetRefs = useRef<(Line2 | null)[]>([]);
  const blueRefs = useRef<(Line2 | null)[]>([]);
  const prevPhase = useRef<Phase>('rest');
  const phaseT0 = useRef(0);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (phase !== prevPhase.current) {
      phaseT0.current = t;
      prevPhase.current = phase;
    }
    const elapsed = t - phaseT0.current;
    const frame = getCrisisRerouteFrame(phase, elapsed);

    for (let i = 0; i < down.length; i++) {
      setLine({
        line: downRefs.current[i],
        opacity: frame.downstreamOpacity,
        progress: 1,
        pointCount: down[i].pts.length,
        color: PALETTE.magenta,
        dashOffset: frame.downstreamDashOffset
      });
    }

    for (let i = 0; i < cand.length; i++) {
      const state = frame.candidates.find((c) => c.key === cand[i].key);
      if (!state) continue;
      setLine({
        line: violetRefs.current[i],
        opacity: state.violetOpacity,
        progress: state.progress,
        pointCount: cand[i].pts.length,
        color: PALETTE.violet
      });
      setLine({
        line: blueRefs.current[i],
        opacity: state.blueOpacity,
        progress: state.progress,
        pointCount: cand[i].pts.length,
        color: PALETTE.blue
      });
    }
  });

  return (
    <group>
      {down.map((d, i) => (
        <Line
          key={d.key}
          ref={(o: unknown) => {
            downRefs.current[i] = (o as Line2) ?? null;
          }}
          points={d.pts}
          color={PALETTE.magenta}
          lineWidth={1.4}
          dashed
          dashSize={0.012}
          gapSize={0.004}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      ))}
      {cand.map((c, i) => {
        const isWin = c.key === WINNER_CANDIDATE_KEY;
        return (
          <group key={c.key}>
            <Line
              ref={(o: unknown) => {
                violetRefs.current[i] = (o as Line2) ?? null;
              }}
              points={c.pts}
              color={PALETTE.violet}
              lineWidth={isWin ? 2.8 : 1.6}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
            <Line
              ref={(o: unknown) => {
                blueRefs.current[i] = (o as Line2) ?? null;
              }}
              points={c.pts}
              color={PALETTE.blue}
              lineWidth={isWin ? 2.35 : 1.4}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </group>
        );
      })}
    </group>
  );
}
