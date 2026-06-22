/**
 * useTowerXConfig —— 运行时把 settings.json 派生成「TowerX 各层可直接消费」的
 * 配置对象。
 *
 * 核心思想：模板代码层不直接读 settings.json，只读这个 hook 的派生结果。
 * 由 hook 统一：
 *   - 读取 settings.json（通过 loadAppSettings）
 *   - 按 mode 选 CAMERA_PRESETS 中的相机机位预设
 *   - 把 settings.scene.cameraOverrides 覆盖到预设之上
 *   - 把 settings.brand / crisis / layout / telemetry / data / assets 各组
 *     与 TowerX 模板默认值合并，生成最终可消费的派生字段
 *
 * 这层 hook 是「Phase 2 上半场」的关键 —— 所有 TODO(phase2-settings) 标记
 * 的硬编码内容下半场都要改成读取这个 hook 的派生值。
 *
 * 状态语义：
 *   - status 'loading'   首屏 fetch 中；UI 应显示骨架屏 / 默认值
 *   - status 'ready'     settings.json 加载成功，cfg 派生完成
 *   - status 'fallback'  settings.json 加载失败（404 / 解析错误），cfg
 *                        全量回落到 TowerX 模板默认值
 */
import { useEffect, useState } from 'react';
import { loadAppSettings, type AppSettings, type TowerXMode, type CameraPresetName } from '@/services/settings';
import { defaultWebGLConfig, type WebGLGlobeConfig } from '../webglConfig';
import { CAMERA_PRESETS } from '../presets/cameraPresets';
import { PALETTE } from '../theme';

/* ------------------------------ 派生字段类型 ------------------------------ */

export interface TowerXBrand {
    primaryColor: string;
    metadataLine: string;
    tagline: string;
    heroTitleLine1: string;
    heroFocalPhrase: string;
    heroTitleLine2: string;
    feedSubhead: string;
    /** Week 2 Day 1: 客户未填时为 null，Header 内部回落到 'EAST ASIA · {cities.length} 节点' */
    regionLabel: string | null;
}

export interface TowerXCrisisStoryNarrative {
    alertTitle?: string;
    alertMeta?: string;
    insight?: string;
    downstream?: string[];
    reasoning?: string[];
    plan?: { route: string; costDelta: string; avoidedLoss: string; confidence: number };
}

export interface TowerXCrisis {
    routeId: string;
    baseCities: [string, string];
    focusPose: { fov: number; posX: number; posY: number; radius: number } | null;
    planeTrim: {
        pitch: number;
        roll: number;
        yaw: number;
        scale: number;
        bodyShade: number;
    } | null;
    planeMotion: {
        stormAmp: number;
        stormTempo: number;
        cruiseSway: number;
        landCycleSecs: number;
        flarePitchDeg: number;
        takeoffPitchDeg: number;
        camFov: number;
        camDist: number;
        touchY: number;
    } | null;
    downstreamArcs: NonNullable<AppSettings['crisis']>['downstreamArcs'];
    candidateArcs: NonNullable<AppSettings['crisis']>['candidateArcs'];
    winnerCandidateKey: string | null;
    storySceneHud: { topLeft: [string, string]; topRight: [string, string] } | null;
    /** 客户叙事四拍文案覆盖（settings.crisis.story.*）。有值时覆盖 mock-data 中的危机 alert 字段。 */
    storyNarrative: TowerXCrisisStoryNarrative | null;
}

export interface TowerXLayout {
    heroFontPx: number;
    feedColumnWidth: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
}

export interface TowerXTelemetry {
    lat: string;
    latency: string;
    model: string;
    confidence: string;
    savedAmount: string;
    /** 遥测行标签（行业术语本地化）。 */
    latLabel: string;
    latencyLabel: string;
    modelLabel: string;
    confidenceLabel: string;
}

export interface TowerXData {
    useMockData: boolean;
    bi: {
        citiesDsId: string | null;
        routesDsId: string | null;
        alertsDsId: string | null;
    };
}

export interface TowerXAssets {
    baseUrl: string;
    ships: string | null;
    planes: string | null;
    trucks: string | null;
    warehouse: string | null;
    /** 把相对路径解析为绝对 URL（拼 baseUrl）。 */
    resolve: (relative: string | null | undefined) => string | null;
}

export interface TowerXConfig {
    mode: TowerXMode;
    cameraPreset: CameraPresetName;
    cameraConfig: WebGLGlobeConfig;
    brand: TowerXBrand;
    crisis: TowerXCrisis;
    layout: TowerXLayout;
    telemetry: TowerXTelemetry;
    data: TowerXData;
    assets: TowerXAssets;
    /** 原始 settings.json（调试用，组件不直接消费）。 */
    raw: AppSettings | null;
}

export type UseTowerXConfigResult =
    | { status: 'loading'; cfg: null; error: null }
    | { status: 'ready'; cfg: TowerXConfig; error: null }
    | { status: 'fallback'; cfg: TowerXConfig; error: Error };

/* ------------------------------ 模板默认值 ------------------------------ */

/** 当 settings.json 完全缺失时的模板兜底（与 TowerX 模板自带的演示场景对齐）。 */
const TEMPLATE_DEFAULTS = {
    mode: 'demo' as TowerXMode,
    brand: {
        primaryColor: PALETTE.blue,
        metadataLine: '[01] · GLOBAL CONTROL TOWER · v 2.5',
        tagline: 'SUPPLY CHAIN · AUTONOMOUS RESPONSE',
        heroTitleLine1: 'Steering',
        heroFocalPhrase: 'East Asia',
        heroTitleLine2: 'in Real Time',
        feedSubhead: 'EAST ASIA · AUTO-TRIAGED',
        regionLabel: null,
    } satisfies TowerXBrand,
    layout: {
        heroFontPx: 84,
        feedColumnWidth: 360,
        paddingTop: 40,
        paddingRight: 32,
        paddingBottom: 32,
        paddingLeft: 48,
    } satisfies TowerXLayout,
    telemetry: {
        lat: '31.80°N',
        latency: '38 ms',
        model: 'TOWER-X · turbo',
        confidence: '99.2%',
        savedAmount: '¥ 2.43M',
        latLabel: 'LAT',
        latencyLabel: 'LATENCY',
        modelLabel: 'MODEL',
        confidenceLabel: 'CONFIDENCE',
    } satisfies TowerXTelemetry,
    crisis: {
        routeId: 'hongkong-shanghai',
        baseCities: ['hongkong', 'shanghai'] as [string, string],
    },
};

/** mode → 默认 cameraPreset 的映射。 */
const MODE_TO_PRESET: Record<TowerXMode, CameraPresetName> = {
    demo: 'east-asia-focus',
    monitor: 'globe-overview',
    bi: 'background-decoration',
};

const DEFAULT_FOCUS_POSE: NonNullable<TowerXCrisis['focusPose']> = {
    fov: 12,
    posX: -0.94,
    posY: -1.6,
    radius: 2.41,
};

const DEFAULT_PLANE_TRIM_CONFIG: NonNullable<TowerXCrisis['planeTrim']> = {
    pitch: 0,
    roll: 0,
    yaw: Math.PI * 0.25,
    scale: 0.13,
    bodyShade: 0.1,
};

const DEFAULT_PLANE_MOTION_CONFIG: NonNullable<TowerXCrisis['planeMotion']> = {
    stormAmp: 1.4,
    stormTempo: 0.7,
    cruiseSway: 1.6,
    landCycleSecs: 30,
    flarePitchDeg: 16,
    takeoffPitchDeg: 16,
    camFov: 18,
    camDist: 16,
    touchY: -0.3,
};

/* ------------------------------ 派生逻辑 ------------------------------ */

function mergeDefined<T extends object>(defaults: T, overrides: Partial<T> | null | undefined): T {
    const merged = { ...defaults };
    if (!overrides) return merged;
    for (const key of Object.keys(defaults) as Array<keyof T>) {
        merged[key] = overrides[key] ?? defaults[key];
    }
    return merged;
}

function deriveCameraConfig(settings: AppSettings | null, preset: CameraPresetName): WebGLGlobeConfig {
    const base = { ...defaultWebGLConfig, ...CAMERA_PRESETS[preset] };
    const overrides = settings?.scene?.cameraOverrides ?? {};
    return { ...base, ...overrides } as WebGLGlobeConfig;
}

function deriveBrand(settings: AppSettings | null): TowerXBrand {
    return mergeDefined(TEMPLATE_DEFAULTS.brand as TowerXBrand, settings?.brand);
}

type CrisisSettings = NonNullable<AppSettings['crisis']>;
type CrisisStorySettings = NonNullable<CrisisSettings['story']>;

function deriveFocusPose(c: CrisisSettings): TowerXCrisis['focusPose'] {
    return c.focusPose ? mergeDefined(DEFAULT_FOCUS_POSE, c.focusPose) : null;
}

function derivePlaneTrim(c: CrisisSettings): TowerXCrisis['planeTrim'] {
    return c.planeTrim ? mergeDefined(DEFAULT_PLANE_TRIM_CONFIG, c.planeTrim) : null;
}

function derivePlaneMotion(c: CrisisSettings): TowerXCrisis['planeMotion'] {
    return c.planeMotion ? mergeDefined(DEFAULT_PLANE_MOTION_CONFIG, c.planeMotion) : null;
}

function deriveStorySceneHud(story: CrisisStorySettings | undefined): TowerXCrisis['storySceneHud'] {
    if (!story?.sceneHud?.topLeft || !story.sceneHud.topRight) return null;
    return {
        topLeft: story.sceneHud.topLeft,
        topRight: story.sceneHud.topRight,
    };
}

function hasStoryNarrative(story: CrisisStorySettings | undefined): boolean {
    return Boolean(story?.alertTitle || story?.downstream || story?.reasoning || story?.plan);
}

function deriveStoryNarrative(story: CrisisStorySettings | undefined): TowerXCrisisStoryNarrative | null {
    if (!hasStoryNarrative(story)) return null;
    return {
        alertTitle: story?.alertTitle,
        alertMeta: story?.alertMeta,
        insight: story?.insight,
        downstream: story?.downstream,
        reasoning: story?.reasoning,
        plan: story?.plan,
    };
}

function deriveCrisis(settings: AppSettings | null): TowerXCrisis {
    const c = settings?.crisis ?? {};
    return {
        routeId: c.routeId ?? TEMPLATE_DEFAULTS.crisis.routeId,
        baseCities: c.baseCities ?? TEMPLATE_DEFAULTS.crisis.baseCities,
        focusPose: deriveFocusPose(c),
        planeTrim: derivePlaneTrim(c),
        planeMotion: derivePlaneMotion(c),
        downstreamArcs: c.downstreamArcs,
        candidateArcs: c.candidateArcs,
        winnerCandidateKey: c.winnerCandidateKey ?? null,
        storySceneHud: deriveStorySceneHud(c.story),
        storyNarrative: deriveStoryNarrative(c.story),
    };
}

function deriveLayout(settings: AppSettings | null): TowerXLayout {
    const l = settings?.layout ?? {};
    return {
        heroFontPx: l.heroFontPx ?? TEMPLATE_DEFAULTS.layout.heroFontPx,
        feedColumnWidth: l.feedColumnWidth ?? TEMPLATE_DEFAULTS.layout.feedColumnWidth,
        paddingTop: l.paddingTop ?? TEMPLATE_DEFAULTS.layout.paddingTop,
        paddingRight: l.paddingRight ?? TEMPLATE_DEFAULTS.layout.paddingRight,
        paddingBottom: l.paddingBottom ?? TEMPLATE_DEFAULTS.layout.paddingBottom,
        paddingLeft: l.paddingLeft ?? TEMPLATE_DEFAULTS.layout.paddingLeft,
    };
}

function deriveTelemetry(settings: AppSettings | null): TowerXTelemetry {
    return mergeDefined(TEMPLATE_DEFAULTS.telemetry, settings?.telemetry);
}

function deriveData(settings: AppSettings | null): TowerXData {
    const d = settings?.data ?? {};
    return {
        useMockData: d.useMockData ?? true,
        bi: {
            citiesDsId: d.bi?.citiesDsId ?? null,
            routesDsId: d.bi?.routesDsId ?? null,
            alertsDsId: d.bi?.alertsDsId ?? null,
        },
    };
}

function deriveAssets(settings: AppSettings | null): TowerXAssets {
    const a = settings?.assets ?? {};
    const baseUrl = a.baseUrl ?? '';
    const resolve = (relative: string | null | undefined): string | null => {
        if (!relative) return null;
        if (!baseUrl) return relative;
        try {
            return new URL(relative, baseUrl).toString();
        } catch {
            return relative;
        }
    };
    return {
        baseUrl,
        ships: a.ships ?? null,
        planes: a.planes ?? null,
        trucks: a.trucks ?? null,
        warehouse: a.warehouse ?? null,
        resolve,
    };
}

export function deriveTowerXConfig(settings: AppSettings | null): TowerXConfig {
    const mode = settings?.mode ?? TEMPLATE_DEFAULTS.mode;
    const cameraPreset = settings?.scene?.preset ?? MODE_TO_PRESET[mode];
    return {
        mode,
        cameraPreset,
        cameraConfig: deriveCameraConfig(settings, cameraPreset),
        brand: deriveBrand(settings),
        crisis: deriveCrisis(settings),
        layout: deriveLayout(settings),
        telemetry: deriveTelemetry(settings),
        data: deriveData(settings),
        assets: deriveAssets(settings),
        raw: settings,
    };
}

/* ------------------------------ React hook ------------------------------ */

export function useTowerXConfig(): UseTowerXConfigResult {
    const [state, setState] = useState<UseTowerXConfigResult>({
        status: 'loading',
        cfg: null,
        error: null,
    });

    useEffect(() => {
        let cancelled = false;
        loadAppSettings()
            .then((settings) => {
                if (cancelled) return;
                setState({ status: 'ready', cfg: deriveTowerXConfig(settings), error: null });
            })
            .catch((err: Error) => {
                if (cancelled) return;
                // settings.json 加载失败时全量回落到模板默认值，不让 UI 崩
                setState({ status: 'fallback', cfg: deriveTowerXConfig(null), error: err });
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return state;
}
