import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './components/towerx/towerx.css';
import { AiActionTicker } from './components/towerx/hud/AiActionTicker';
import { AlertFeed } from './components/towerx/hud/AlertFeed';
import { Header } from './components/towerx/hud/Header';
import { Telemetry } from './components/towerx/hud/Telemetry';
import { type Alert } from './components/towerx/mock-data';
import { type Phase as RrPhase, type CrisisRerouteConfig } from './components/towerx/globe/crisisRerouteTimeline';
import { useAmbient } from './components/towerx/stage/ambientEngine';
import { useStage } from './components/towerx/stage/useStage';
import {
    DEFAULT_CRISIS_FOCUS,
    DEFAULT_PLANE_TRIM,
    DEFAULT_PLANE_MOTION,
    type FocusPose,
    type PlaneTrim,
    type PlaneMotion,
} from './components/towerx/stage/focusPose';
import { useTowerXConfig, type TowerXConfig } from './components/towerx/config/useTowerXConfig';
import {
    activeFocusForStage,
    buildActiveCityIds,
    buildAlertCityIndex,
    buildCrisisRerouteConfig,
    buildRouteIndex,
    crisisPhaseElapsedForDetail,
    crisisPhaseForDetail,
    headerBrandProps,
    resolveDetailAlert,
    useGlobeControlState,
    visiblePulsesForStage,
    type AppStage,
} from './SuperAppGlobeApp.helpers';
import hudStyles from './components/towerx/hud/hud.module.css';

const AlertDetail = lazy(() =>
    import('./components/towerx/hud/AlertDetail').then((m) => ({ default: m.AlertDetail })),
);
const GlobeWebGL = lazy(() =>
    import('./components/towerx/globe/GlobeWebGL').then((m) => ({ default: m.GlobeWebGL })),
);

function RightColumnContent({
    stage,
    mergedCrisisAlert,
    reset,
    isCrisisDetail,
    focusPose,
    setFocusPose,
    planeTrim,
    setPlaneTrim,
    planeMotion,
    setPlaneMotion,
    setCrisisResolving,
    handleCrisisPhase,
    cfg,
    openDetail,
    surfacedEvents,
    crisisRouteId,
}: {
    stage: AppStage;
    mergedCrisisAlert: Alert | null;
    reset: () => void;
    isCrisisDetail: boolean;
    focusPose: FocusPose;
    setFocusPose: (p: FocusPose) => void;
    planeTrim: PlaneTrim;
    setPlaneTrim: (p: PlaneTrim) => void;
    planeMotion: PlaneMotion;
    setPlaneMotion: (m: PlaneMotion) => void;
    setCrisisResolving: (value: boolean) => void;
    handleCrisisPhase: (phase: RrPhase) => void;
    cfg: TowerXConfig;
    openDetail: (alert: Alert) => void;
    surfacedEvents: Alert[];
    crisisRouteId: string;
}) {
    if (stage.kind !== 'detail') {
        return (
            <AlertFeed
                onAlertClick={openDetail}
                surfacedEvents={surfacedEvents}
                crisisRouteId={crisisRouteId}
                feedSubhead={cfg.brand.feedSubhead}
            />
        );
    }
    return (
        <Suspense fallback={<RightColumnLoading label="加载详情" />}>
            <AlertDetail
                alert={mergedCrisisAlert ?? stage.alert}
                onClose={reset}
                isCrisis={isCrisisDetail}
                focusPose={focusPose}
                onFocusPoseChange={setFocusPose}
                planeTrim={planeTrim}
                onPlaneTrimChange={setPlaneTrim}
                planeMotion={planeMotion}
                onPlaneMotionChange={setPlaneMotion}
                onResolve={setCrisisResolving}
                onCrisisPhase={handleCrisisPhase}
                sceneHudTopLeft={cfg.crisis.storySceneHud?.topLeft}
                sceneHudTopRight={cfg.crisis.storySceneHud?.topRight}
            />
        </Suspense>
    );
}

/**
 * SuperAppGlobeApp —— SuperApp Globe 一站式样板装配点（代号 TowerX，Phase 2 全链路）。
 *
 * 完整保留原 TowerX 项目的 stage / focus / intro / ambient 时序系统：
 *  - useTowerXConfig() 注入 settings.json 派生的 cfg（brand / crisis / camera / telemetry / layout）
 *  - useStage() 维护 home / detail 两态
 *  - useAmbient() 驱动地图脉冲 + 右栏 alert feed 浮现
 *  - loadFocusPose / loadPlaneTrim / loadPlaneMotion 持久化危机机位
 *  - getCrisisSupplementalCityIds 配合 CrisisReroute 四拍
 *
 * v1.0 限制（按 spec）：
 *  - mode === 'monitor' / 'bi' 暂时用 demo 同款布局，仅 cameraConfig 不同（settings.scene.preset
 *    切换）。layout.* 差异留给 v1.1。
 *  - 不接入 GlobeEditor3D（隐藏调参面板入口）。
 *  - 不接入 brand.primaryColor 派生整套 PALETTE（仅替换 hero / pill 文案显式色，留 v1.1）。
 */
export function SuperAppGlobeApp() {
    const cfgState = useTowerXConfig();
    // settings.json loading / fallback 期间用 fallback cfg；保证组件不在 cfg === null 时崩
    const cfg = cfgState.cfg;

    const { pulses, surfacedEvents } = useAmbient();
    const { stage, openDetail, reset } = useStage();

    const { focusPose, setFocusPose, planeTrim, setPlaneTrim, planeMotion, setPlaneMotion } = useGlobeControlState(cfg);

    const [crisisResolving, setCrisisResolving] = useState(false);
    const [detailPhase, setDetailPhase] = useState<RrPhase>('rest');
    const [detailPhaseStartedAt, setDetailPhaseStartedAt] = useState(() => Date.now());
    const [detailPhaseNow, setDetailPhaseNow] = useState(() => Date.now());

    useEffect(() => {
        if (stage.kind !== 'detail') {
            setCrisisResolving(false);
            setDetailPhase('rest');
            setDetailPhaseStartedAt(Date.now());
        }
    }, [stage.kind]);

    useEffect(() => {
        if (stage.kind !== 'detail') return;
        const id = window.setInterval(() => setDetailPhaseNow(Date.now()), 100);
        return () => window.clearInterval(id);
    }, [stage.kind]);

    // brand.primaryColor → CSS variable --brand-primary（hairline / hero gradient 用）
    const prevPrimaryColor = useRef<string | null>(null);
    useEffect(() => {
        const color = cfg?.brand.primaryColor ?? null;
        if (color === prevPrimaryColor.current) return;
        prevPrimaryColor.current = color;
        document.documentElement.style.setProperty('--brand-primary', color ?? '#4d8bff');
    }, [cfg?.brand.primaryColor]);

    const crisisRouteId = cfg?.crisis.routeId ?? 'hongkong-shanghai';
    const isCrisisDetail = stage.kind === 'detail' && stage.alert.routeId === crisisRouteId;
    const crisisPhase = crisisPhaseForDetail(isCrisisDetail, detailPhase);
    const crisisPhaseElapsed = crisisPhaseElapsedForDetail(isCrisisDetail, detailPhaseNow, detailPhaseStartedAt);
    const handleCrisisPhase = useCallback((phase: RrPhase) => {
        const now = Date.now();
        setDetailPhase(phase);
        setDetailPhaseStartedAt(now);
        setDetailPhaseNow(now);
    }, []);

    // 危机改道时序的 cfg —— 来自 settings 或回落到模板默认
    const crisisRerouteCfg = useMemo<CrisisRerouteConfig>(() => buildCrisisRerouteConfig(cfg), [cfg]);

    const activeFocus = activeFocusForStage(stage, focusPose);

    // settings.crisis.story 覆盖危机 alert 文案（四拍叙事 + 标题/事件描述）
    const mergedCrisisAlert = useMemo(
        () => resolveDetailAlert(stage, crisisRouteId, cfg?.crisis.storyNarrative),
        [stage, crisisRouteId, cfg?.crisis.storyNarrative],
    );

    const { alertByCityId, hasAlertByCityId } = useMemo(buildAlertCityIndex, []);

    const routeById = useMemo(buildRouteIndex, []);

    const visiblePulses = visiblePulsesForStage(isCrisisDetail, pulses);
    const activeCityIds = useMemo(() => {
        return buildActiveCityIds({ visiblePulses, routeById, crisisPhase, crisisPhaseElapsed, crisisRerouteCfg });
    }, [visiblePulses, routeById, crisisPhase, crisisPhaseElapsed, crisisRerouteCfg]);

    const handleCityClick = (cityId: string) => {
        const a = alertByCityId[cityId];
        if (!a) return;
        openDetail(a);
    };

    // 派生 cameraConfig —— useTowerXConfig 已经按 cfg.mode + scene.preset 选好相机机位预设。
    const cameraConfig = cfg?.cameraConfig;
    // TODO(v1.1): mode === 'monitor' / 'bi' 暂用 demo 同款 layout；v1.1 实现 layout 差异（双侧栏 / 下指标排）
    const isDetailOpen = stage.kind === 'detail';

    if (!cameraConfig) {
        // settings.json 加载中 —— 用最小骨架背景，避免白屏
        return <LoadingBackdrop />;
    }

    const headerProps = headerBrandProps(cfg);

    return (
        <>
            {/* Behind-globe Header：仅显示 Hero 标题（其余 visibility:hidden 占位）。
                位于 z-0 在 GlobeWebGL 之前，被透明 Canvas 上的不透明球面遮挡部分文字 → 3D 深度幻觉 */}
            <div
                className="pointer-events-none fixed inset-0 z-0"
                style={{ pointerEvents: 'none' }}
            >
                <div className="absolute" style={{ top: cfg.layout.paddingTop, left: cfg.layout.paddingLeft }}>
                    <Header {...headerProps} layer="behind" />
                </div>
            </div>

            <Suspense fallback={<LoadingBackdrop />}>
                <GlobeWebGL
                    config={cameraConfig}
                    onCityClick={handleCityClick}
                    hasAlertByCityId={hasAlertByCityId}
                    pulses={visiblePulses}
                    activeCityIds={activeCityIds}
                    focusPose={activeFocus}
                    crisisResolving={crisisResolving}
                    crisisPhase={crisisPhase}
                />
            </Suspense>

            {/* HUD overlay —— z 10，pointer-events 默认 none，子项按需打开 */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 10,
                    pointerEvents: 'none',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
            >
                {/* Front Header：显示 pill / metadata / tagline，标题透明占位（保持版面对齐） */}
                <div
                    style={{
                        position: 'absolute',
                        top: cfg.layout.paddingTop,
                        left: cfg.layout.paddingLeft,
                    }}
                >
                    <Header
                        {...headerProps}
                        layer="front"
                        chromeHidden={isDetailOpen}
                    />
                </div>

                {/* 左下角 Telemetry + AiActionTicker */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: cfg.layout.paddingBottom,
                        left: cfg.layout.paddingLeft,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                    }}
                >
                    <AiActionTicker />
                    <Telemetry
                        lat={cfg.telemetry.lat}
                        latency={cfg.telemetry.latency}
                        model={cfg.telemetry.model}
                        confidence={cfg.telemetry.confidence}
                        savedAmount={cfg.telemetry.savedAmount}
                        latLabel={cfg.telemetry.latLabel}
                        latencyLabel={cfg.telemetry.latencyLabel}
                        modelLabel={cfg.telemetry.modelLabel}
                        confidenceLabel={cfg.telemetry.confidenceLabel}
                    />
                </div>

                {/* 右栏 AlertFeed / AlertDetail —— 详情打开时列宽 360→680 */}
                <div
                    style={{
                        position: 'absolute',
                        top: cfg.layout.paddingTop,
                        right: cfg.layout.paddingRight,
                        bottom: cfg.layout.paddingBottom,
                        width: isDetailOpen ? 680 : cfg.layout.feedColumnWidth,
                        transition: 'width 360ms cubic-bezier(0.22, 1, 0.36, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        pointerEvents: 'auto',
                    }}
                >
                    <RightColumnContent
                        stage={stage}
                        mergedCrisisAlert={mergedCrisisAlert}
                        reset={reset}
                        isCrisisDetail={isCrisisDetail}
                        focusPose={focusPose}
                        setFocusPose={setFocusPose}
                        planeTrim={planeTrim}
                        setPlaneTrim={setPlaneTrim}
                        planeMotion={planeMotion}
                        setPlaneMotion={setPlaneMotion}
                        setCrisisResolving={setCrisisResolving}
                        handleCrisisPhase={handleCrisisPhase}
                        cfg={cfg}
                        openDetail={openDetail}
                        surfacedEvents={surfacedEvents}
                        crisisRouteId={crisisRouteId}
                    />
                </div>
            </div>
        </>
    );
}

function LoadingBackdrop() {
    return (
        <div
            aria-hidden="true"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                background:
                    'radial-gradient(circle at 36% 70%, rgba(77,139,255,0.16), transparent 38%), #08041a',
            }}
        />
    );
}

function RightColumnLoading({ label }: { label: string }) {
    return (
        <div
            className={hudStyles.liquidGlass}
            style={{
                display: 'flex',
                width: '100%',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <span
                style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.22em',
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                }}
            >
                {label}
            </span>
        </div>
    );
}

/* DEFAULT_* 引用保留作为 ESM tree-shaking 锚点 —— 避免被未来"无 settings 时
 * 走 localStorage"的优化误删；ambientConfig/focusPose 内部仍直接消费这些常量。 */
void DEFAULT_CRISIS_FOCUS;
void DEFAULT_PLANE_TRIM;
void DEFAULT_PLANE_MOTION;
