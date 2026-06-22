import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type Alert } from '../mock-data';
import {
  DEFAULT_PLANE_TRIM,
  DEFAULT_PLANE_MOTION,
  type FocusPose,
  type PlaneTrim,
  type PlaneMotion
} from '../stage/focusPose';
import {
  type CrisisPhase
} from './AlertDetail.constants';
import { AiDecisionModule } from './AlertDetailAiModule';
import {
  aiPaddingFor,
  alertReasoning,
  canTune,
  hasCrisisArc,
  isPlanPhase,
  isResolvingPhase,
  resetDetailState,
  sceneModeFor,
  scheduleExecutionPhase,
  scheduleReasoningReveal
} from './AlertDetailState';
import {
  AlertDetailHeader,
  DownstreamSection,
  NormalEventFooter,
  NowEventSection,
  ScenePanel,
  TunerPanel
} from './AlertDetailParts';

type Props = {
  alert: Alert;
  onClose: () => void;
  /** 是否危机事件。R7:只有危机详情有 AI 区(分析/方案/预测)+ 风暴
   *  飞机场景;普通物流事件无 AI,场景为飞机降落。 */
  isCrisis?: boolean;
  /** 危机详情时传入:实时聚焦取景值 + 改它的回调(详情内调焦面板)。 */
  focusPose?: FocusPose;
  onFocusPoseChange?: (p: FocusPose) => void;
  /** R13:飞机朝向校正(所有场景共用)。值始终传入用于渲染;有
   *  onChange(危机详情)时面板可拖。 */
  planeTrim?: PlaneTrim;
  onPlaneTrimChange?: (p: PlaneTrim) => void;
  /** planeMotion:飞机动画参数(风暴幅度/节奏等)。下一任务接入调试面板。 */
  planeMotion?: PlaneMotion;
  onPlaneMotionChange?: (m: PlaneMotion) => void;
  /** P-B:危机进入 executing/executed(人按核按钮后)→ true。
   *  App 据此让世界屏息 + 地球危机线愈合。 */
  onResolve?: (resolving: boolean) => void;
  /** P-B Slice2b:把当前危机拍透给 App→地球(候选/待定/画通改道线
   *  按 phase 编排)。仅危机详情有意义。 */
  onCrisisPhase?: (phase: CrisisPhase) => void;
  // Phase 2: 由 useTowerXConfig().crisis.storySceneHud 注入；
  // null 时回落到模板默认（'[ SOP-A47 ]' / 'HKG ─ SHA' 等）
  sceneHudTopLeft?: [string, string];
  sceneHudTopRight?: [string, string];
};

/**
 * AlertDetail — right-column glass panel that takes over the AlertFeed
 * slot when a row is clicked. Top hosts a 3D scene placeholder
 * (PlaneInStorm / ShipInStorm / etc. land in commit 2+); body shows
 * AI insight + action ledger so the panel reads as a narrative even
 * before the scene is wired.
 *
 * Note: deliberately no opacity/transform mount animation on the glass
 * section itself. Both break backdrop-filter on this element
 * (opacity < 1 creates a stacking context, transforms even more so).
 * The reveal comes from the right column expanding 360 → 680 in App.tsx
 * via `transition: width`.
 */
export function AlertDetail({
  alert,
  onClose,
  isCrisis = false,
  focusPose,
  onFocusPoseChange,
  planeTrim = DEFAULT_PLANE_TRIM,
  onPlaneTrimChange,
  planeMotion = DEFAULT_PLANE_MOTION,
  onPlaneMotionChange,
  onResolve,
  onCrisisPhase,
  sceneHudTopLeft = ['[ SOP-A47 ]', 'HKG ─ SHA'],
  sceneHudTopRight = ['FL 340 · 0.78 M', 'RE-ROUTE · +24 M']
}: Props) {
  const [tunerOpen, setTunerOpen] = useState(false);
  const tunable = canTune({
    focusPose,
    onFocusPoseChange,
    onPlaneTrimChange,
    onPlaneMotionChange
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 危机详情四拍编排(spec §10.3):问题 → 推理(逐行流入)→ 计划
  // → 实施(人按 armed 核按钮)。取代旧 setTimeout 1800 假 spinner。
  // 仅危机(有 plan)走四拍;普通事件不变(arc=false 全不渲染)。
  const arc = hasCrisisArc(isCrisis, alert);
  const reasoning = alertReasoning(alert);
  const reasoningLen = reasoning.length;
  const [phase, setPhase] = useState<CrisisPhase>('problem');
  const [revealN, setRevealN] = useState(0);
  // 危机面板按拍收起:运单格栅默认收成一行;AI 推理流完自动收起
  // 成「已推理 N 步」。两者均可点开回看(普通事件不受影响)。
  const [logiExpanded, setLogiExpanded] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  useEffect(() => {
    resetDetailState({
      setPhase,
      setRevealN,
      setLogiExpanded,
      setReasoningExpanded
    });
  }, [alert.id]);
  // 问题 → 推理:不再自动推进(用户:分两步手动)。改由「AI 推理」
  // 按钮触发 setPhase('reasoning')(见下方 Step1 按钮)。
  // 推理碎片逐行流入;流完 → 计划(停在此等人按核按钮)
  useEffect(
    () =>
      scheduleReasoningReveal({
        arc,
        phase,
        revealN,
        reasoningLen,
        setPhase,
        setRevealN
      }),
    [arc, phase, revealN, reasoningLen]
  );
  // 人按核按钮 → 执行中(给份量)→ 已实施。P-B 在此拍接 world 联动。
  useEffect(
    () => scheduleExecutionPhase({ arc, phase, setPhase }),
    [arc, phase]
  );
  // AI 模块是浮在整个详情层之上的绝对定位浮层(不参与内部滚动);
  // 滚动区底部留出 = 浮层实测高度,使情境内容能滚到浮层之上。
  const aiModRef = useRef<HTMLDivElement>(null);
  const [aiPad, setAiPad] = useState(0);
  useLayoutEffect(() => {
    setAiPad(aiPaddingFor(arc, aiModRef.current));
  }, [arc, phase, reasoningExpanded, revealN, alert.id]);
  // 计划/执行/已实施 三态都展示计划卡(推理已收起);仅 'plan' 出
  // 核按钮,'executing' 出执行中,'executed' 出已实施确认。
  const planPhase = isPlanPhase(phase);
  // P-B:人按核按钮后(executing/executed)→ 风暴平息 + 世界屏息。
  const resolving = isResolvingPhase(phase);
  useEffect(() => {
    onResolve?.(resolving);
  }, [resolving, onResolve]);
  useEffect(() => {
    onCrisisPhase?.(phase);
  }, [phase, onCrisisPhase]);
  // 场景模式单一来源:危机=storm、在途=cruise、其余(已闭环)=landing。
  // SceneCanvas(降落镜头推进)与 PlaneInStorm 共用,避免重复表达式。
  const sceneMode = sceneModeFor({ isCrisis, alert });

  return (
    <section
      className="liquid-glass-strong relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[1.75rem]"
      aria-label={`事件详情：${alert.title}`}
    >
      <AlertDetailHeader
        alert={alert}
        onClose={onClose}
        tunable={tunable}
        tunerOpen={tunerOpen}
        onToggleTuner={() => setTunerOpen((v) => !v)}
      />
      <div
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6"
        style={{
          scrollbarWidth: 'none',
          paddingBottom: aiPad ? `${aiPad}px` : undefined
        }}
      >
        <TunerPanel
          tunerOpen={tunerOpen}
          focusPose={focusPose}
          onFocusPoseChange={onFocusPoseChange}
          planeTrim={planeTrim}
          onPlaneTrimChange={onPlaneTrimChange}
          planeMotion={planeMotion}
          onPlaneMotionChange={onPlaneMotionChange}
        />
        <ScenePanel
          alert={alert}
          isCrisis={isCrisis}
          sceneMode={sceneMode}
          planeMotion={planeMotion}
          planeTrim={planeTrim}
          resolving={resolving}
          sceneHudTopLeft={sceneHudTopLeft}
          sceneHudTopRight={sceneHudTopRight}
        />
        <NowEventSection
          alert={alert}
          arc={arc}
          logiExpanded={logiExpanded}
          onExpand={() => setLogiExpanded(true)}
          onCollapse={() => setLogiExpanded(false)}
        />
        <DownstreamSection alert={alert} arc={arc} />
        <NormalEventFooter alert={alert} arc={arc} />
      </div>
      <AiDecisionModule
        arc={arc}
        aiModRef={aiModRef}
        alert={alert}
        phase={phase}
        planPhase={planPhase}
        reasoning={reasoning}
        reasoningLen={reasoningLen}
        revealN={revealN}
        reasoningExpanded={reasoningExpanded}
        onStartReasoning={() => setPhase('reasoning')}
        onExpandReasoning={() => setReasoningExpanded(true)}
        onCollapseReasoning={() => setReasoningExpanded(false)}
        onExecute={() => setPhase('executing')}
      />
    </section>
  );
}
