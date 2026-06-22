// Single source of truth for the opening cinematic.
//
// One wall clock (`performance.now()`) drives the R3F layers. R3F
// layers import the alpha helpers and multiply them into the opacity
// uniform they already drive. All tunable numbers now live in
// webglConfig (the "开场动画" editor section); GlobeWebGL pushes them
// here once per frame via `setIntroParams`, mirroring the cfgRef
// pattern the rest of the scene uses.
//
// The DOM chrome (header / right panel / pills) Phase-D timing stays
// in src/index.css and is NOT driven from here.
//
// Module-level start: a full page reload re-evaluates this module and
// replays the intro. Vite HMR keeps the module alive, so an edit during
// dev will NOT replay the sequence — hard-reload (cmd-shift-R) to watch
// it again.

import type { WebGLGlobeConfig } from '../webglConfig';

// IMPORTANT: t=0 is the first RENDERED frame, not module load. The
// land-mask bake + country geometry + world-atlas parse can burn
// several seconds between this module evaluating and the planet's
// first paintable frame; anchoring to module load made every layer's
// window elapse before anything was on screen (the "even 4000ms shows
// instantly" bug). `armIntro()` (called from SceneLive's first
// useFrame) sets the real zero.
let _start = performance.now();
let _armed = false;

/** Idempotent: pins t=0 to the first rendered frame. No-op after the
 *  first call (until restartIntro re-arms). */
export function armIntro(): void {
  if (_armed) return;
  _armed = true;
  _start = performance.now();
}

/** Replay the WebGL choreography from t=0 without a page reload. The
 *  DOM chrome (Phase D in src/index.css) is CSS-`forwards` and does
 *  NOT replay — this restarts the 3D earth/layer sequence only. */
export function restartIntro(): void {
  _armed = true;
  _start = performance.now();
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
/** Aggressive early move + a long, slow glide into rest — the
 *  "cinematic lens" deceleration. */
export function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

/** Clamped, eased 0→1 ramp over [startMs, endMs]. */
function ramp(
  ms: number,
  startMs: number,
  endMs: number,
  ease: (t: number) => number = easeOutCubic
): number {
  if (endMs <= startMs) return ms >= endMs ? 1 : 0;
  if (ms <= startMs) return 0;
  if (ms >= endMs) return 1;
  return ease((ms - startMs) / (endMs - startMs));
}

// ── Live params (pushed from webglConfig each frame) ─────────────────
type IntroParams = Pick<
  WebGLGlobeConfig,
  | 'introEnabled'
  | 'introSpeed'
  | 'introEmergeFrom'
  | 'introEmergeMs'
  | 'introSpinRad'
  | 'introIgnite'
  | 'introBodyMs'
  | 'introTravelStartMs'
  | 'introTravelEndMs'
  | 'introDotsStartMs'
  | 'introLinesStartMs'
  | 'introAtmoStartMs'
  | 'introCityStartMs'
  | 'introRouteStartMs'
  | 'introLayerFadeMs'
>;

// Defaults match webglConfig's defaultWebGLConfig so the very first
// frame (before GlobeWebGL's useFrame runs setIntroParams) is correct.
let P: IntroParams = {
  introEnabled: true,
  introSpeed: 0.75,
  introEmergeFrom: 0.12,
  introEmergeMs: 3000,
  introSpinRad: 3,
  introIgnite: 1,
  introBodyMs: 1700,
  introTravelStartMs: 550,
  introTravelEndMs: 4000,
  introAtmoStartMs: 1050,
  introDotsStartMs: 1500,
  introLinesStartMs: 1000,
  introCityStartMs: 2500,
  introRouteStartMs: 3000,
  introLayerFadeMs: 1000
};

/** Called by GlobeWebGL.useFrame each frame with the live config. */
export function setIntroParams(p: IntroParams): void {
  P = p;
}

/** Wall-clock ms since first paint, scaled by the playback rate.
 *  introSpeed > 1 plays the whole cinematic faster. */
function clockMs(): number {
  return (performance.now() - _start) * P.introSpeed;
}

// Opacity fades use LINEAR time, not easeOutCubic. easeOutCubic is
// front-loaded (≈27% at 10% of the window, ≈88% at half) so a fade
// reads as basically over in its first fifth no matter how long the
// nominal window — which made "裸球淡入" feel instant even at 4000ms.
// Linear makes the configured ms equal the perceived fade duration
// (slider = what you see). Position/scale curves below keep their
// expressive easing; only the alpha ramps are linearised.
const linear = (t: number): number => t;

// ── Per-layer alpha (0→1) ───────────────────────────────────────────
// When the intro is disabled every layer is fully present from frame 0.
function layer(startMs: number): number {
  if (!P.introEnabled) return 1;
  return ramp(clockMs(), startMs, startMs + P.introLayerFadeMs, linear);
}

export function bodyAlpha(): number {
  if (!P.introEnabled) return 1;
  return ramp(clockMs(), 0, P.introBodyMs, linear);
}
export function dotsAlpha(): number {
  return layer(P.introDotsStartMs);
}
export function linesAlpha(): number {
  return layer(P.introLinesStartMs);
}
export function atmoAlpha(): number {
  return layer(P.introAtmoStartMs);
}
export function cityAlpha(): number {
  return layer(P.introCityStartMs);
}
export function routeAlpha(): number {
  return layer(P.introRouteStartMs);
}

// ── Earth emerge / travel ───────────────────────────────────────────

/** 0→1 over the travel window, eased for a settled arrival. Drives the
 *  center → final-pose lerp and the spin-in decay. */
export function travelT(): number {
  if (!P.introEnabled) return 1;
  return ramp(
    clockMs(),
    P.introTravelStartMs,
    P.introTravelEndMs,
    easeInOutCubic
  );
}

/** Sphere grows far/small → full size. easeInOutCubic (NOT easeOut*):
 *  the scale change is the highest-contrast part of the reveal, so it
 *  must be spread across the window. easeOutQuint was ~80% done in the
 *  first 20% of the window — the growth was over before the eye caught
 *  it, which is a big part of why "渐显" read as "just there". */
export function emergeScale(): number {
  if (!P.introEnabled) return 1;
  const g = ramp(clockMs(), 0, P.introEmergeMs, easeInOutCubic);
  return P.introEmergeFrom + (1 - P.introEmergeFrom) * g;
}

/** Single reveal(+optional flare) curve over [startMs, startMs+durMs]:
 *
 *    introIgnite <= 1 → clean linear 0 → 1 reveal (no overshoot).
 *    introIgnite  > 1 → 0 → peak (≈⅓ in) → settle to 1.
 *
 *  It is the SOLE intro driver for the layer it feeds — NOT also
 *  multiplied by a separate opacity fade, because doing both cancelled
 *  the flare exactly while it should flare (proven via instrumentation).
 *  Ends at exactly 1 so steady state is untouched; 0 before start. */
function revealFlare(startMs: number, durMs: number): number {
  if (!P.introEnabled) return 1;
  const t = ramp(clockMs(), startMs, startMs + durMs, linear);
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const peak = P.introIgnite;
  if (peak <= 1) return t; // clean reveal, respects start + duration
  const RISE = 0.35; // fraction of window spent ramping 0 → peak
  if (t < RISE) return peak * (t / RISE);
  return peak + (1 - peak) * ((t - RISE) / (1 - RISE));
}

/** Background atmosphere halo glow — reveals from `introAtmoStartMs`
 *  over `introLayerFadeMs` (so the "大气起" + "分层淡入时长" sliders
 *  actually drive it), with `introIgnite` as an optional bloom peak. */
export function haloFlare(): number {
  return revealFlare(P.introAtmoStartMs, P.introLayerFadeMs);
}

/** Body fresnel rim — flares as the sphere materialises (tied to the
 *  body window, not the atmosphere start). */
export function rimFlare(): number {
  return revealFlare(0, P.introBodyMs);
}

/** Extra spin (radians) the planet carries at t=0, decaying to 0 over
 *  the travel window so it "spins into" its resting orientation. */
export function spinIntroOffset(): number {
  if (!P.introEnabled) return 0;
  return (1 - travelT()) * P.introSpinRad;
}
