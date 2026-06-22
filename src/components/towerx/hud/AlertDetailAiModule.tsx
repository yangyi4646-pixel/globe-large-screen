import { Sparkles } from 'lucide-react';
import type { RefObject } from 'react';
import type { Alert } from '../mock-data';
import { PALETTE, STATUS } from '../theme';
import { MONO, TXT, type CrisisPhase } from './AlertDetail.constants';

export function AiDecisionModule({
  arc,
  aiModRef,
  alert,
  phase,
  planPhase,
  reasoning,
  reasoningLen,
  revealN,
  reasoningExpanded,
  onStartReasoning,
  onExpandReasoning,
  onCollapseReasoning,
  onExecute
}: {
  arc: boolean;
  aiModRef: RefObject<HTMLDivElement>;
  alert: Alert;
  phase: CrisisPhase;
  planPhase: boolean;
  reasoning: string[];
  reasoningLen: number;
  revealN: number;
  reasoningExpanded: boolean;
  onStartReasoning: () => void;
  onExpandReasoning: () => void;
  onCollapseReasoning: () => void;
  onExecute: () => void;
}) {
  if (!arc) return null;
  return (
    <div
      ref={aiModRef}
      className="ai-region ai-trace absolute bottom-5 left-5 right-5 z-10 flex flex-col gap-3 rounded-2xl p-5"
      style={{
        position: 'absolute',
        background: 'linear-gradient(180deg, #443685 0%, #2f2560 100%)',
        boxShadow:
          '0 18px 46px rgba(8,4,26,0.50), inset 0 0 0 1px rgba(198,180,255,0.46), inset 0 1px 0 rgba(255,255,255,0.14)'
      }}
    >
      <AiModuleHeader alert={alert} planPhase={planPhase} />
      <ProblemReasoningButton phase={phase} onStartReasoning={onStartReasoning} />
      <ReasoningPanel
        phase={phase}
        planPhase={planPhase}
        reasoning={reasoning}
        reasoningLen={reasoningLen}
        revealN={revealN}
        reasoningExpanded={reasoningExpanded}
        onExpandReasoning={onExpandReasoning}
        onCollapseReasoning={onCollapseReasoning}
      />
      <PlanDecision
        alert={alert}
        phase={phase}
        planPhase={planPhase}
        onExecute={onExecute}
      />
    </div>
  );
}

function AiModuleHeader({
  alert,
  planPhase
}: {
  alert: Alert;
  planPhase: boolean;
}) {
  return (
    <div className={`${TXT.label} flex items-center justify-between`}>
      <span className="flex items-center gap-2">
        <Sparkles size={13} style={{ color: '#c9bcff' }} />
        AI · 自主决策
      </span>
      {planPhase && alert.plan ? (
        <span className={`${TXT.micro} font-semibold`} style={{ color: PALETTE.violet }}>
          {Math.round(alert.plan.confidence * 100)}% CONF
        </span>
      ) : null}
    </div>
  );
}

function ProblemReasoningButton({
  phase,
  onStartReasoning
}: {
  phase: CrisisPhase;
  onStartReasoning: () => void;
}) {
  if (phase !== 'problem') return null;
  return (
    <button
      type="button"
      onClick={onStartReasoning}
      className="ai-hover-glow ai-phase-soft group relative flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 transition-transform active:scale-[0.985]"
      style={{
        background:
          'radial-gradient(ellipse 85% 150% at 50% 0%, rgba(139,92,246,0.34), transparent 70%), rgba(139,92,246,0.16)',
        boxShadow:
          'inset 0 0 0 1px rgba(198,180,255,0.50), inset 0 1px 0 rgba(255,255,255,0.12)'
      }}
    >
      <Sparkles size={14} style={{ color: '#c9bcff' }} />
      <span
        className="text-[12px] font-medium uppercase text-white"
        style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.20em' }}
      >
        AI 推理 · 分析改道
      </span>
    </button>
  );
}

function ReasoningPanel({
  phase,
  planPhase,
  reasoning,
  reasoningLen,
  revealN,
  reasoningExpanded,
  onExpandReasoning,
  onCollapseReasoning
}: {
  phase: CrisisPhase;
  planPhase: boolean;
  reasoning: string[];
  reasoningLen: number;
  revealN: number;
  reasoningExpanded: boolean;
  onExpandReasoning: () => void;
  onCollapseReasoning: () => void;
}) {
  if (phase === 'problem' || reasoningLen <= 0) return null;
  if (planPhase && !reasoningExpanded) {
    return (
      <button
        type="button"
        onClick={onExpandReasoning}
        className="ai-phase-soft flex w-full items-center gap-2 text-left transition-colors hover:text-white/80"
      >
        <span style={{ color: PALETTE.violet }}>✓</span>
        <span className={TXT.data}>已推理 · {reasoningLen} 步</span>
        <span className={`${TXT.micro} ml-auto shrink-0`}>展开 ›</span>
      </button>
    );
  }
  return (
    <div
      className={`ai-phase-soft flex flex-col gap-1.5 ${
        phase === 'reasoning' ? 'ai-reasoning-flow rounded-xl px-3 py-2.5' : ''
      }`}
    >
      <ul className="flex flex-col gap-1.5">
        {reasoning
          .slice(0, phase === 'reasoning' ? revealN : reasoningLen)
          .map((r) => (
            <li
              key={r}
              className={`ai-reveal flex items-baseline gap-2 ${TXT.data}`}
              style={{ fontFamily: MONO }}
            >
              <span style={{ color: PALETTE.violet }}>·</span>
              <span>{r}</span>
            </li>
          ))}
      </ul>
      {planPhase ? (
        <button
          type="button"
          onClick={onCollapseReasoning}
          className={`${TXT.micro} self-end transition-colors hover:text-white/70`}
        >
          收起 ›
        </button>
      ) : null}
    </div>
  );
}

function PlanDecision({
  alert,
  phase,
  planPhase,
  onExecute
}: {
  alert: Alert;
  phase: CrisisPhase;
  planPhase: boolean;
  onExecute: () => void;
}) {
  if (!planPhase || !alert.plan) return null;
  return (
    <>
      <div
        className="ai-phase-soft h-px"
        style={{
          background: 'linear-gradient(90deg, rgba(184,170,255,0.30), transparent)'
        }}
      />
      <p className={`ai-phase-soft ${TXT.body}`}>{alert.plan.route}</p>
      <div
        className={`ai-phase-soft ${TXT.data} flex items-center justify-between rounded-xl px-3 py-2 tabular-nums`}
        style={{
          background: 'rgba(255,255,255,0.05)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
          fontFamily: MONO
        }}
      >
        <span>成本 {alert.plan.costDelta}</span>
        <span>
          规避损失{' '}
          <span className="font-semibold text-white">{alert.plan.avoidedLoss}</span>
        </span>
      </div>
      <PlanActionState plan={alert.plan} phase={phase} onExecute={onExecute} />
    </>
  );
}

function PlanActionState({
  plan,
  phase,
  onExecute
}: {
  plan: NonNullable<Alert['plan']>;
  phase: CrisisPhase;
  onExecute: () => void;
}) {
  if (phase === 'plan') return <ArmExecuteButton onExecute={onExecute} />;
  if (phase === 'executing') return <ExecutingState />;
  return <ExecutedState avoidedLoss={plan.avoidedLoss} />;
}

function ArmExecuteButton({ onExecute }: { onExecute: () => void }) {
  return (
    <button
      type="button"
      onClick={onExecute}
      className="ai-hover-glow ai-phase-soft group relative flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 transition-transform active:scale-[0.985]"
      style={{
        background:
          'radial-gradient(ellipse 85% 150% at 50% 0%, rgba(139,92,246,0.32), transparent 70%), rgba(139,92,246,0.14)',
        boxShadow:
          'inset 0 0 0 1px rgba(184,164,255,0.50), inset 0 1px 0 rgba(255,255,255,0.12)'
      }}
    >
      <Sparkles size={14} style={{ color: '#c9bcff' }} />
      <span
        className="text-[12px] font-medium uppercase text-white"
        style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.20em' }}
      >
        授权执行 · 武汉中继
      </span>
    </button>
  );
}

function ExecutingState() {
  return (
    <div
      className="ai-executing-flow ai-phase-soft flex items-center justify-center gap-2.5 rounded-xl px-4 py-3"
      style={{
        background:
          'radial-gradient(ellipse 85% 150% at 50% 0%, rgba(139,92,246,0.34), transparent 70%), rgba(139,92,246,0.18)',
        boxShadow: 'inset 0 0 0 1px rgba(184,164,255,0.50)'
      }}
    >
      <Sparkles size={14} style={{ color: '#c9bcff' }} />
      <span
        className="text-[12px] font-medium uppercase text-white"
        style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.20em' }}
      >
        执行中 · 武汉中继
      </span>
    </div>
  );
}

function ExecutedState({ avoidedLoss }: { avoidedLoss: string }) {
  return (
    <div
      className="ai-phase-soft flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{
        background: 'rgba(95, 255, 184, 0.10)',
        boxShadow: 'inset 0 0 0 1px rgba(95, 255, 184, 0.22)'
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: STATUS.success,
          boxShadow: `0 0 8px ${STATUS.success}`
        }}
      />
      <span className={TXT.data}>
        已实施 · 规避损失{' '}
        <span className="font-semibold text-white">{avoidedLoss}</span> 已锁定
      </span>
    </div>
  );
}
