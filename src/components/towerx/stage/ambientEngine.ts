import { useEffect, useRef, useState } from 'react';
import { alertPool, alerts, routes, type Alert } from '../mock-data';
import { AMBIENT } from './ambientConfig';

/**
 * 一条活跃脉冲:沿 routeId 的弧线,从 startedAt 起跑。
 * `lifetime` 可选:本条脉冲飞完一趟的毫秒数。不传则用全局 `AMBIENT.pulseLifetimeMs`
 * (样板/useAmbient 的行为);FlowLine 按弧长给每条线不同 lifetime 以实现匀速。
 */
export type ActivePulse = { routeId: string; startedAt: number; crisis: boolean; lifetime?: number };

export type AmbientState = {
  /** Routes 订阅:当前要画哪些脉冲。 */
  pulses: ActivePulse[];
  /** AlertFeed 订阅:危机卡之外的同步事件行(最新在前)。 */
  surfacedEvents: Alert[];
};

// 非危机、且有 routeId 的可调度路由 id(crisis 单独恒定)。
const SCHEDULABLE_ROUTE_IDS = routes
  .map((r) => r.id)
  .filter((id) => id !== AMBIENT.crisisRouteId);

// routeId → 无序城市对 key(R3#3:同一对城市同一时刻只允许一条
// 活跃脉冲,杜绝「来跟去的线叠在一起」)。
const ROUTE_PAIR: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const r of routes) {
    out[r.id] = [r.source, r.target].sort().join('::');
  }
  return out;
})();

// routeId → 两个端点城市(R11:同一时刻活跃的脉冲尽量端点互不相同,
// 避免全挤在 shanghai/shenzhen 等枢纽上"聚成一团")。
const ROUTE_ENDPOINTS: Record<string, [string, string]> = (() => {
  const out: Record<string, [string, string]> = {};
  for (const r of routes) out[r.id] = [r.source, r.target];
  return out;
})();

// routeId → 第一条匹配事件(从 alerts + alertPool 里找,排除危机线)。
const EVENT_BY_ROUTE: Record<string, Alert> = (() => {
  const out: Record<string, Alert> = {};
  for (const a of [...alerts, ...alertPool]) {
    if (!a.routeId || a.routeId === AMBIENT.crisisRouteId) continue;
    if (!out[a.routeId]) out[a.routeId] = a;
  }
  return out;
})();

// Seed rows so the feed reads full from first paint. R2#3: the feed
// and the map must be ONE consistent stream — every feed row maps to a
// real lane. So the seed is drawn from the SAME schedulable routes the
// pulse scheduler uses (via EVENT_BY_ROUTE), not from arbitrary alerts
// (some of which had no routeId → orphan rows that could never be a
// line). These read as "already fired" recent history (staggered past
// timestamps), so their lines having already faded is consistent.
const SEED_SURFACED: Alert[] = (() => {
  const out: Alert[] = [];
  let agoMin = 2;
  for (const rid of SCHEDULABLE_ROUTE_IDS) {
    const ev = EVENT_BY_ROUTE[rid];
    if (!ev) continue;
    out.push({
      ...ev,
      id: `${ev.id}-seed${out.length}`,
      timestamp: Date.now() - agoMin * 60_000
    });
    agoMin += 3 + Math.floor(Math.random() * 3);
    if (out.length >= AMBIENT.maxSurfacedRows) break;
  }
  return out;
})();

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function activeRoutePairs(pulses: ActivePulse[]): Set<string> {
  return new Set(pulses.map((p) => ROUTE_PAIR[p.routeId]).filter(Boolean));
}

function activeEndpointCities(pulses: ActivePulse[]): Set<string> {
  const busyCities = new Set<string>();
  for (const p of pulses) {
    if (p.crisis) continue;
    const e = ROUTE_ENDPOINTS[p.routeId];
    if (e) {
      busyCities.add(e[0]);
      busyCities.add(e[1]);
    }
  }
  return busyCities;
}

function schedulableCandidates(kept: ActivePulse[]): string[] {
  const busy = new Set(kept.map((p) => p.routeId));
  const busyPairs = activeRoutePairs(kept);
  return SCHEDULABLE_ROUTE_IDS.filter(
    (id) => !busy.has(id) && !busyPairs.has(ROUTE_PAIR[id])
  );
}

function dispersedCandidates(candidates: string[], kept: ActivePulse[]): string[] {
  const busyCities = activeEndpointCities(kept);
  return candidates.filter((id) => {
    const e = ROUTE_ENDPOINTS[id];
    return e && !busyCities.has(e[0]) && !busyCities.has(e[1]);
  });
}

function pickRouteId(kept: ActivePulse[]): string | null {
  const candidates = schedulableCandidates(kept);
  const dispersed = dispersedCandidates(candidates, kept);
  const pool = dispersed.length > 0 ? dispersed : candidates;
  return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function freshAmbientEvent(event: Alert, seq: number): Alert {
  return {
    ...event,
    id: `${event.id}-amb${seq}`,
    // 新行即"此刻"发生 → now(渲染「刚刚」),旧行随时间
    // 自然变「N 分钟前」。严格时间倒序,不再随机忽前忽后。
    timestamp: Date.now()
  };
}

/**
 * useAmbient — 不管 stage 一直跑的底噪。取代 useAlertStream 的 7s 盲
 * 计时器 + Routes 的全线连续彗流。危机线恒定脉动;非危机线随机生成、
 * 跑一趟即灭;每次生成把对应事件同步浮入列表。
 */
export function useAmbient(): AmbientState {
  const [pulses, setPulses] = useState<ActivePulse[]>(() => [
    { routeId: AMBIENT.crisisRouteId, startedAt: performance.now(), crisis: true }
  ]);
  const [surfacedEvents, setSurfacedEvents] = useState<Alert[]>(SEED_SURFACED);
  const seq = useRef(0);
  // R11:feed 上新节流的时间戳(与地图脉冲解耦)。
  const lastSurfaceRef = useRef(0);
  // Mirror so `tick` reads the latest pulses without an impure
  // setState updater (and without re-arming the effect each render).
  const pulsesRef = useRef(pulses);
  pulsesRef.current = pulses;

  useEffect(() => {
    let timer = 0;
    let alive = true;

    const tick = () => {
      if (!alive) return;
      const now = performance.now();

      // Pure computation off the mirrored latest pulses — no setState
      // updater does side effects.
      // 1. 清掉到寿命的非危机脉冲;危机线永远保留。
      const kept = pulsesRef.current.filter(
        (p) => p.crisis || now - p.startedAt < AMBIENT.pulseLifetimeMs
      );
      let spawned: Alert | null = null;
      // 2. 还能并发就生成一条新非危机脉冲。
      const activeNonCrisis = kept.filter((p) => !p.crisis);
      if (activeNonCrisis.length < AMBIENT.maxConcurrentPulses) {
        const routeId = pickRouteId(kept);
        if (routeId) {
          kept.push({ routeId, startedAt: now, crisis: false });

          // feed 上新节流:脉冲在地图上密集闪现,但两条新行之间至少
          // 隔 feedMinIntervalMs —— 地图热闹 / feed 可读 解耦(R11)。
          const ev = EVENT_BY_ROUTE[routeId];
          if (
            ev &&
            Date.now() - lastSurfaceRef.current >= AMBIENT.feedMinIntervalMs
          ) {
            seq.current += 1;
            lastSurfaceRef.current = Date.now();
            spawned = freshAmbientEvent(ev, seq.current);
          }
        }
      }

      setPulses(kept);
      if (spawned) {
        const s = spawned;
        // The line still pulses, but don't stack an identical row when
        // the same lane is already the top entry (adjacent-duplicate
        // polish — keeps feed↔map consistent without visual repeats).
        setSurfacedEvents((list) =>
          list[0]?.routeId === s.routeId
            ? list
            : [s, ...list].slice(0, AMBIENT.maxSurfacedRows)
        );
      }

      timer = window.setTimeout(
        tick,
        rand(AMBIENT.spawnIntervalMinMs, AMBIENT.spawnIntervalMaxMs)
      );
    };

    timer = window.setTimeout(
      tick,
      rand(AMBIENT.spawnIntervalMinMs, AMBIENT.spawnIntervalMaxMs)
    );
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  return { pulses, surfacedEvents };
}
