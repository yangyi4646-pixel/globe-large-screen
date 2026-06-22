import { useEffect, useState } from 'react';
import { alertPool, routes, type Alert } from './components/towerx/mock-data';
import { getCrisisSupplementalCityIds, type Phase as RrPhase, type CrisisRerouteConfig, DEFAULT_CRISIS_REROUTE_CONFIG } from './components/towerx/globe/crisisRerouteTimeline';
import { focusPoseForRoute, loadFocusPose, saveFocusPose, loadPlaneTrim, savePlaneTrim, loadPlaneMotion, savePlaneMotion, type FocusPose, type PlaneTrim, type PlaneMotion } from './components/towerx/stage/focusPose';
import type { ActivePulse } from './components/towerx/stage/ambientEngine';
import { useStage } from './components/towerx/stage/useStage';
import type { TowerXConfig, TowerXCrisisStoryNarrative } from './components/towerx/config/useTowerXConfig';

export type AppStage = ReturnType<typeof useStage>['stage'];
type RouteIndex = Record<string, { source: string; target: string }>;

function assignIfDefined<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined) {
    if (value !== undefined) target[key] = value;
}

function mergeCrisisAlert(alert: Alert, story: TowerXCrisisStoryNarrative | null | undefined): Alert {
    if (!story) return alert;
    const merged = { ...alert };
    assignIfDefined(merged, 'title', story.alertTitle);
    assignIfDefined(merged, 'meta', story.alertMeta);
    assignIfDefined(merged, 'insight', story.insight);
    assignIfDefined(merged, 'downstream', story.downstream);
    assignIfDefined(merged, 'reasoning', story.reasoning);
    assignIfDefined(merged, 'plan', story.plan);
    return merged;
}

export function resolveDetailAlert(stage: AppStage, crisisRouteId: string, story: TowerXCrisisStoryNarrative | null | undefined): Alert | null {
    if (stage.kind !== 'detail') return null;
    if (stage.alert.routeId !== crisisRouteId) return stage.alert;
    return mergeCrisisAlert(stage.alert, story);
}

export function buildCrisisRerouteConfig(cfg: TowerXConfig | null): CrisisRerouteConfig {
    if (!cfg) return DEFAULT_CRISIS_REROUTE_CONFIG;
    return {
        downstreamArcs: cfg.crisis.downstreamArcs ?? DEFAULT_CRISIS_REROUTE_CONFIG.downstreamArcs,
        candidateArcs: (cfg.crisis.candidateArcs ?? DEFAULT_CRISIS_REROUTE_CONFIG.candidateArcs) as CrisisRerouteConfig['candidateArcs'],
        winnerCandidateKey: cfg.crisis.winnerCandidateKey ?? DEFAULT_CRISIS_REROUTE_CONFIG.winnerCandidateKey,
        baseCities: cfg.crisis.baseCities ?? DEFAULT_CRISIS_REROUTE_CONFIG.baseCities,
    };
}

export function buildAlertCityIndex(): { alertByCityId: Record<string, Alert>; hasAlertByCityId: Record<string, boolean> } {
    const byCity: Record<string, Alert> = {};
    const has: Record<string, boolean> = {};
    for (const a of alertPool) {
        if (!a.cityIds) continue;
        for (const cid of a.cityIds) {
            if (!byCity[cid]) byCity[cid] = a;
            has[cid] = true;
        }
    }
    return { alertByCityId: byCity, hasAlertByCityId: has };
}

export function buildRouteIndex(): RouteIndex {
    const m: RouteIndex = {};
    for (const r of routes) m[r.id] = { source: r.source, target: r.target };
    return m;
}

export function activeFocusForStage(stage: AppStage, focusPose: FocusPose): FocusPose | null {
    return stage.kind === 'detail' && stage.alert.routeId ? focusPoseForRoute(stage.alert.routeId, focusPose) : null;
}

type ActiveCityOptions = {
    visiblePulses: ActivePulse[];
    routeById: RouteIndex;
    crisisPhase: RrPhase;
    crisisPhaseElapsed: number;
    crisisRerouteCfg: CrisisRerouteConfig;
};

export function buildActiveCityIds({
    visiblePulses,
    routeById,
    crisisPhase,
    crisisPhaseElapsed,
    crisisRerouteCfg,
}: ActiveCityOptions): Set<string> {
    const s = new Set<string>();
    for (const p of visiblePulses) {
        const r = routeById[p.routeId];
        if (r) {
            s.add(r.source);
            s.add(r.target);
        }
    }
    for (const cityId of getCrisisSupplementalCityIds(crisisPhase, crisisPhaseElapsed, crisisRerouteCfg)) {
        s.add(cityId);
    }
    return s;
}

export function visiblePulsesForStage(isCrisisDetail: boolean, pulses: ActivePulse[]) {
    return isCrisisDetail ? pulses.filter((p) => p.crisis) : pulses;
}

export function crisisPhaseForDetail(isCrisisDetail: boolean, detailPhase: RrPhase): RrPhase {
    return isCrisisDetail ? detailPhase : 'rest';
}

export function crisisPhaseElapsedForDetail(isCrisisDetail: boolean, now: number, startedAt: number): number {
    return isCrisisDetail ? Math.max(0, (now - startedAt) / 1000) : 0;
}

export function headerBrandProps(cfg: TowerXConfig) {
    return {
        titleFontPx: cfg.layout.heroFontPx,
        titleLineGap: 0,
        metadataLine: cfg.brand.metadataLine,
        tagline: cfg.brand.tagline,
        heroTitleLine1: cfg.brand.heroTitleLine1,
        heroFocalPhrase: cfg.brand.heroFocalPhrase,
        heroTitleLine2: cfg.brand.heroTitleLine2,
        regionLabel: cfg.brand.regionLabel ?? undefined,
    };
}

export function useGlobeControlState(cfg: TowerXConfig | null) {
    const [focusPose, setFocusPoseState] = useState<FocusPose>(() => cfg?.crisis.focusPose ?? loadFocusPose());
    const [planeTrim, setPlaneTrimState] = useState<PlaneTrim>(() => cfg?.crisis.planeTrim ?? loadPlaneTrim());
    const [planeMotion, setPlaneMotionState] = useState<PlaneMotion>(() => cfg?.crisis.planeMotion ?? loadPlaneMotion());
    const setFocusPose = (p: FocusPose) => {
        setFocusPoseState(p);
        saveFocusPose(p);
    };
    const setPlaneTrim = (p: PlaneTrim) => {
        setPlaneTrimState(p);
        savePlaneTrim(p);
    };
    const setPlaneMotion = (m: PlaneMotion) => {
        setPlaneMotionState(m);
        savePlaneMotion(m);
    };
    useEffect(() => {
        if (!cfg) return;
        const stored = loadFocusPose();
        const settingsHas = cfg.crisis.focusPose;
        if (!stored && settingsHas) setFocusPoseState(settingsHas);
    }, [cfg]);
    return { focusPose, setFocusPose, planeTrim, setPlaneTrim, planeMotion, setPlaneMotion };
}
