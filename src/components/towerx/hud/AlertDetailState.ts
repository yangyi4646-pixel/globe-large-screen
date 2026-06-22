import type { Dispatch, SetStateAction } from 'react';
import type { Alert } from '../mock-data';
import type { FocusPose, PlaneMotion, PlaneTrim } from '../stage/focusPose';
import {
  EXEC_HOLD_MS,
  REASONING_DONE_HOLD_MS,
  REASONING_LINE_MS,
  type CrisisPhase
} from './AlertDetail.constants';

type SceneMode = 'storm' | 'cruise' | 'landing';

export function canTune({
  focusPose,
  onFocusPoseChange,
  onPlaneTrimChange,
  onPlaneMotionChange
}: {
  focusPose?: FocusPose;
  onFocusPoseChange?: (p: FocusPose) => void;
  onPlaneTrimChange?: (p: PlaneTrim) => void;
  onPlaneMotionChange?: (m: PlaneMotion) => void;
}): boolean {
  return Boolean(
    focusPose &&
      onFocusPoseChange &&
      onPlaneTrimChange &&
      onPlaneMotionChange
  );
}

export function hasCrisisArc(isCrisis: boolean, alert: Alert): boolean {
  return isCrisis && Boolean(alert.plan);
}

export function alertReasoning(alert: Alert): string[] {
  return alert.reasoning ?? [];
}

export function isPlanPhase(phase: CrisisPhase): boolean {
  return phase === 'plan' || phase === 'executing' || phase === 'executed';
}

export function isResolvingPhase(phase: CrisisPhase): boolean {
  return phase === 'executing' || phase === 'executed';
}

export function sceneModeFor({
  isCrisis,
  alert
}: {
  isCrisis: boolean;
  alert: Alert;
}): SceneMode {
  if (isCrisis) return 'storm';
  return alert.level === 'responding' ? 'cruise' : 'landing';
}

export function aiPaddingFor(arc: boolean, node: HTMLDivElement | null): number {
  return arc && node ? node.offsetHeight + 48 : 0;
}

export function resetDetailState({
  setPhase,
  setRevealN,
  setLogiExpanded,
  setReasoningExpanded
}: {
  setPhase: Dispatch<SetStateAction<CrisisPhase>>;
  setRevealN: Dispatch<SetStateAction<number>>;
  setLogiExpanded: Dispatch<SetStateAction<boolean>>;
  setReasoningExpanded: Dispatch<SetStateAction<boolean>>;
}) {
  setPhase('problem');
  setRevealN(0);
  setLogiExpanded(false);
  setReasoningExpanded(false);
}

export function scheduleReasoningReveal({
  arc,
  phase,
  revealN,
  reasoningLen,
  setPhase,
  setRevealN
}: {
  arc: boolean;
  phase: CrisisPhase;
  revealN: number;
  reasoningLen: number;
  setPhase: Dispatch<SetStateAction<CrisisPhase>>;
  setRevealN: Dispatch<SetStateAction<number>>;
}): (() => void) | undefined {
  if (!arc || phase !== 'reasoning') return undefined;
  const done = revealN >= reasoningLen;
  const id = window.setTimeout(
    done ? () => setPhase('plan') : () => setRevealN((n) => n + 1),
    done ? REASONING_DONE_HOLD_MS : REASONING_LINE_MS
  );
  return () => window.clearTimeout(id);
}

export function scheduleExecutionPhase({
  arc,
  phase,
  setPhase
}: {
  arc: boolean;
  phase: CrisisPhase;
  setPhase: Dispatch<SetStateAction<CrisisPhase>>;
}): (() => void) | undefined {
  if (!arc || phase !== 'executing') return undefined;
  const id = window.setTimeout(() => setPhase('executed'), EXEC_HOLD_MS);
  return () => window.clearTimeout(id);
}
