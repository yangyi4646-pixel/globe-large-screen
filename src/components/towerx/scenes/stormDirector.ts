// ─────────────────────────────────────────────────────────────────────
// Scene "director script" — a shared narrative that modulates the
// effective turbulence of every animator (plane bob, rain speed,
// lightning frequency) over a 30s storm cycle. Each animator reads
// its `effective` turbulence via this function from the same clock,
// so they stay coordinated without needing React state or refs.
//
// Cycle starts at PEAK so opening the detail panel immediately
// shows the user "weather event in progress" (no slow buildup wait):
//
//   Phase            seconds   modulation
//   ──────────────────────────────────────
//   peak (open)      0-7       0.95 → 0.70 (violent → rough)
//   easing           7-15      0.70 → 0.30 (calming)
//   calm             15-22     0.30 → 0.55 (settling, building)
//   approaching      22-30     0.55 → 0.95 (re-intensifying → peak)
//
// Then loops. Implemented as a smooth sin so transitions are continuous.
const STORM_CYCLE_SECONDS = 30;

export function effectiveTurbulence(elapsedSec: number, base: number): number {
  const phase = (elapsedSec % STORM_CYCLE_SECONDS) / STORM_CYCLE_SECONDS;
  // sin shifted so phase=0 → +1 (PEAK at open), phase=0.5 → -1 (calm).
  // Inverted from prior calm-first cycle — story hook: drama first.
  const wave = Math.sin(phase * Math.PI * 2 + Math.PI / 2);
  // Map -1..+1 → 0.30..0.95
  const dynamic = 0.625 + 0.325 * wave;
  // Multiply by user-passed base (controlled mode: outside choreographer
  // can damp / amplify the whole storm by passing base != 1).
  return dynamic * (base / 0.6);
}
