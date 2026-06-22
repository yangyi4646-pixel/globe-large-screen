export type Phase =
  | 'rest'
  | 'problem'
  | 'reasoning'
  | 'plan'
  | 'executing'
  | 'executed';

export type RerouteCandidateKey = string;

export type DownstreamArcSpec = {
  key: string;
  source: string;
  target: string;
  liftK?: number;
};

export type CandidateArcSpec = {
  key: string;
  source: string;
  via: string;
  target: string;
  liftK?: number;
  start: number;
  draw: number;
  retreat: number;
};

export type CrisisRerouteConfig = {
  downstreamArcs: readonly DownstreamArcSpec[];
  candidateArcs: readonly CandidateArcSpec[];
  winnerCandidateKey: RerouteCandidateKey;
  baseCities: readonly [string, string];
};

export type CandidateFrame = {
  key: RerouteCandidateKey;
  progress: number;
  violetOpacity: number;
  blueOpacity: number;
  lineWidthK: number;
};

export type CrisisRerouteFrame = {
  downstreamOpacity: number;
  downstreamDashOffset: number;
  crisisRouteOpacity: number;
  activeCandidateKey: RerouteCandidateKey | null;
  candidates: CandidateFrame[];
};

// 模板默认值 —— 当 useTowerXConfig 派生不出 crisis.* 配置时回落到此组。
// 这些值原是模块级 const，Phase 2 改为函数参数化以支持客户改写。
export const DEFAULT_DOWNSTREAM_ARCS: readonly DownstreamArcSpec[] = [
  { key: 'd-bj', source: 'shanghai', target: 'beijing', liftK: 0.86 },
  { key: 'd-sel', source: 'shanghai', target: 'seoul', liftK: 1.0 },
  { key: 'd-tyo', source: 'shanghai', target: 'tokyo', liftK: 1.16 }
] as const;

export const DEFAULT_CANDIDATE_ARCS: readonly CandidateArcSpec[] = [
  { key: 'tpe', source: 'hongkong', via: 'taipei', target: 'shanghai', liftK: 1.1, start: 0.35, draw: 1.15, retreat: 0.9 },
  { key: 'sel', source: 'hongkong', via: 'seoul', target: 'shanghai', liftK: 1.08, start: 2.6, draw: 1.15, retreat: 0.9 },
  { key: 'wuh', source: 'hongkong', via: 'wuhan', target: 'shanghai', liftK: 1.35, start: 4.85, draw: 1.15, retreat: 0 }
] as const;

export const DEFAULT_WINNER_CANDIDATE_KEY: RerouteCandidateKey = 'wuh';

export const DEFAULT_BASE_CITIES: readonly [string, string] = ['hongkong', 'shanghai'] as const;

export const DEFAULT_CRISIS_REROUTE_CONFIG: CrisisRerouteConfig = {
  downstreamArcs: DEFAULT_DOWNSTREAM_ARCS,
  candidateArcs: DEFAULT_CANDIDATE_ARCS,
  winnerCandidateKey: DEFAULT_WINNER_CANDIDATE_KEY,
  baseCities: DEFAULT_BASE_CITIES
};

// 向后兼容别名（旧代码引用了这三个名字）
export const DOWNSTREAM_ARCS = DEFAULT_DOWNSTREAM_ARCS;
export const CANDIDATE_ARCS = DEFAULT_CANDIDATE_ARCS;
export const WINNER_CANDIDATE_KEY = DEFAULT_WINNER_CANDIDATE_KEY;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutQuart(v: number): number {
  const t = clamp01(v);
  return 1 - (1 - t) ** 4;
}

type TrialFrameOptions = {
  key: RerouteCandidateKey;
  elapsed: number;
  start: number;
  draw: number;
  retreat: number;
  winner: boolean;
};

function trialFrame({ key, elapsed, start, draw, retreat, winner }: TrialFrameOptions): CandidateFrame {
  const drawEnd = start + draw;
  const retreatEnd = drawEnd + retreat;
  let progress = 0;
  let violetOpacity = 0;

  if (elapsed >= start && elapsed < drawEnd) {
    progress = easeOutQuart((elapsed - start) / draw);
    violetOpacity = 0.18 + progress * (winner ? 0.52 : 0.38);
  } else if (winner && elapsed >= drawEnd) {
    progress = 1;
    violetOpacity = 0.72;
  } else if (!winner && elapsed >= drawEnd && elapsed < retreatEnd) {
    const retreatT = easeOutQuart((elapsed - drawEnd) / retreat);
    progress = 1 - retreatT;
    violetOpacity = 0.44 * (1 - retreatT);
  }

  return {
    key,
    progress: clamp01(progress),
    violetOpacity: Number(violetOpacity.toFixed(3)),
    blueOpacity: 0,
    lineWidthK: winner ? 1.28 : 0.78
  };
}

function reasoningCandidateFrame(elapsed: number, cfg: CrisisRerouteConfig): CandidateFrame[] {
  return cfg.candidateArcs.map((candidate) =>
    trialFrame({
      key: candidate.key,
      elapsed,
      start: candidate.start,
      draw: candidate.draw,
      retreat: candidate.retreat,
      winner: candidate.key === cfg.winnerCandidateKey
    })
  );
}

function activeCandidateKey(elapsed: number, cfg: CrisisRerouteConfig): RerouteCandidateKey | null {
  for (const candidate of cfg.candidateArcs) {
    const end =
      candidate.key === cfg.winnerCandidateKey
        ? Number.POSITIVE_INFINITY
        : candidate.start + candidate.draw + candidate.retreat;
    if (elapsed >= candidate.start && elapsed < end) return candidate.key;
  }
  return null;
}

function winnerOnly(
  cfg: CrisisRerouteConfig,
  violetOpacity: number,
  blueOpacity: number,
  lineWidthK = 1.34
): CandidateFrame[] {
  return cfg.candidateArcs.map((candidate) => ({
    key: candidate.key,
    progress: candidate.key === cfg.winnerCandidateKey ? 1 : 0,
    violetOpacity: candidate.key === cfg.winnerCandidateKey ? violetOpacity : 0,
    blueOpacity: candidate.key === cfg.winnerCandidateKey ? blueOpacity : 0,
    lineWidthK: candidate.key === cfg.winnerCandidateKey ? lineWidthK : 0.78
  }));
}

export function getCrisisRerouteFrame(
  phase: Phase,
  phaseElapsed: number,
  cfg: CrisisRerouteConfig = DEFAULT_CRISIS_REROUTE_CONFIG
): CrisisRerouteFrame {
  const elapsed = Math.max(0, phaseElapsed);
  const downstreamDashOffset = Number((-(elapsed * 0.024) % 1).toFixed(3));
  let downstreamOpacity = 0;
  let crisisRouteOpacity = 1;
  let active: RerouteCandidateKey | null = null;
  let candidates = winnerOnly(cfg, 0, 0);

  if (phase === 'problem') {
    downstreamOpacity = 0.62;
  } else if (phase === 'reasoning') {
    downstreamOpacity = Number((0.62 * (1 - clamp01(elapsed / 0.42))).toFixed(3));
    candidates = reasoningCandidateFrame(elapsed, cfg);
    active = activeCandidateKey(elapsed, cfg);
  } else if (phase === 'plan') {
    active = cfg.winnerCandidateKey;
    candidates = winnerOnly(cfg, 0.72, 0);
  } else if (phase === 'executing') {
    active = cfg.winnerCandidateKey;
    const takeover = easeOutQuart(elapsed / 1.4);
    crisisRouteOpacity = Number((1 - easeOutQuart(elapsed / 1.05)).toFixed(3));
    candidates = winnerOnly(
      cfg,
      Number((0.9 * (1 - takeover)).toFixed(3)),
      Number((0.92 * takeover).toFixed(3)),
      1.55
    );
  } else if (phase === 'executed') {
    crisisRouteOpacity = 0;
    active = cfg.winnerCandidateKey;
    candidates = winnerOnly(cfg, 0, 0.9, 1.15);
  } else {
    crisisRouteOpacity = 1;
  }

  return {
    downstreamOpacity,
    downstreamDashOffset,
    crisisRouteOpacity,
    activeCandidateKey: active,
    candidates
  };
}

export function getCrisisSupplementalCityIds(
  phase: Phase,
  phaseElapsed: number,
  cfg: CrisisRerouteConfig = DEFAULT_CRISIS_REROUTE_CONFIG
): string[] {
  if (phase === 'rest') return [];
  if (phase === 'problem') {
    return [
      ...cfg.baseCities,
      ...cfg.downstreamArcs.map((arc) => arc.target)
    ];
  }

  const frame = getCrisisRerouteFrame(phase, phaseElapsed, cfg);
  const active =
    frame.activeCandidateKey === null
      ? null
      : cfg.candidateArcs.find((candidate) => candidate.key === frame.activeCandidateKey);

  if (!active) return [...cfg.baseCities];
  return [active.source, active.via, active.target];
}
