import { getAppBaseUrl } from '../core/url';

/** 叙事密度模式，对应 docs/architecture/towerx-template.md §4 三种模式。 */
export type TowerXMode = 'demo' | 'monitor' | 'bi';

/** 相机机位预设，详见 src/components/towerx/presets/cameraPresets.ts。 */
export type CameraPresetName = 'east-asia-focus' | 'globe-overview' | 'background-decoration';

/** 危机叙事中的下游受影响弧线。 */
export interface DownstreamArc {
    key: string;
    source: string;
    target: string;
    liftK?: number;
}

/** AI 推理候选改道航线。 */
export interface CandidateArc {
    key: string;
    source: string;
    via: string;
    target: string;
    liftK?: number;
    start?: number;
    draw?: number;
    retreat?: number;
}

export interface AppSettings {
    name?: string;
    title?: string;
    page?: {
        pgType?: 'PAGE' | 'LARGE_SCREEN' | 'ANALYSE_REPORT' | 'OVERVIEW';
        exemptDesignLint?: boolean;
        exemptReason?: string;
    };

    /** 叙事密度模式（demo / monitor / bi）。决定 scene.preset / layout 等默认派生。 */
    mode?: TowerXMode;

    /** 品牌相关文案 + 主色。所有字段都可被客户在 settings.json 中覆盖。 */
    brand?: {
        /** 客户品牌主色（hex），覆盖 PALETTE.blue。紫色 / 品红 / 金色不会被覆盖。 */
        primaryColor?: string;
        metadataLine?: string;
        tagline?: string;
        heroTitleLine1?: string;
        heroFocalPhrase?: string;
        heroTitleLine2?: string;
        feedSubhead?: string;
        /** Header pill 行末位地理 / 节点数标签（建议格式：业务地理范围 · N 节点）。 */
        regionLabel?: string;
    };

    /** 3D 场景相机与地球外观。 */
    scene?: {
        preset?: CameraPresetName;
        /** 预设之外的相机精调，部分覆盖 WebGLGlobeConfig 字段。 */
        cameraOverrides?: Record<string, unknown>;
        earthVariant?: 'stylized-dark' | 'stylized-light';
    };

    /** 客户专属危机叙事。模板里唯一允许写「具体业务故事」的位置。 */
    crisis?: {
        routeId?: string;
        baseCities?: [string, string];
        focusPose?: {
            fov?: number;
            posX?: number;
            posY?: number;
            radius?: number;
        };
        planeTrim?: {
            pitch?: number;
            roll?: number;
            yaw?: number;
            scale?: number;
            bodyShade?: number;
        };
        planeMotion?: {
            stormAmp?: number;
            stormTempo?: number;
            cruiseSway?: number;
            landCycleSecs?: number;
            flarePitchDeg?: number;
            takeoffPitchDeg?: number;
            camFov?: number;
            camDist?: number;
            touchY?: number;
        };
        downstreamArcs?: DownstreamArc[];
        candidateArcs?: CandidateArc[];
        winnerCandidateKey?: string;
        story?: {
            sceneHud?: {
                topLeft?: [string, string];
                topRight?: [string, string];
            };
            alertTitle?: string;
            alertMeta?: string;
            insight?: string;
            downstream?: string[];
            reasoning?: string[];
            plan?: {
                route: string;
                costDelta: string;
                avoidedLoss: string;
                confidence: number;
            };
        };
    };

    /** HUD 布局尺寸。 */
    layout?: {
        heroFontPx?: number;
        feedColumnWidth?: number;
        paddingTop?: number;
        paddingRight?: number;
        paddingBottom?: number;
        paddingLeft?: number;
    };

    /** 左下 Telemetry 静态值（FLOWS / AI 规避损失由代码派生不在这里）。 */
    telemetry?: {
        lat?: string;
        latency?: string;
        model?: string;
        confidence?: string;
        savedAmount?: string;
        /** 遥测行标签覆盖（行业术语本地化用）。 */
        latLabel?: string;
        latencyLabel?: string;
        modelLabel?: string;
        confidenceLabel?: string;
    };

    /** 数据源配置。 */
    data?: {
        useMockData?: boolean;
        bi?: {
            citiesDsId?: string;
            routesDsId?: string;
            alertsDsId?: string;
        };
    };

    /** 3D 模型资产 URL 配置，详见 docs/sop/3d-asset-sourcing.md §4。 */
    assets?: {
        baseUrl?: string;
        ships?: string;
        planes?: string;
        trucks?: string;
        warehouse?: string;
    };
}

export const DEFAULT_APP_TITLE = '观远 BI 应用';

export function resolveAppTitle(settings: AppSettings | null | undefined): string {
    const configuredTitle =
        typeof settings?.title === 'string' && settings.title.trim()
            ? settings.title.trim()
            : typeof settings?.name === 'string'
              ? settings.name.trim()
              : '';

    return configuredTitle || DEFAULT_APP_TITLE;
}

export async function loadAppSettings(): Promise<AppSettings> {
    const response = await fetch(`${getAppBaseUrl()}/settings.json`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`settings.json 加载失败: ${response.status}`);
    }

    return (await response.json()) as AppSettings;
}
