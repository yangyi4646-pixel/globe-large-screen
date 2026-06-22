/**
 * @guandata/superapp-globe - SuperApp Globe(代号 TowerX)
 *
 * 库入口,导出分四层:① 一站式样板 ② 原语组件 ③ 公共数据契约 ④ 既有
 * hook / settings / 相机预设 / 类型。消费方典型用法:
 *   import { SuperAppGlobeApp } from '@guandata/superapp-globe';
 *   import '@guandata/superapp-globe/styles';
 * 或用原语自由组装:
 *   import { DarkGlobe, CityGlow, FlowLine, LiquidGlassPanel } from '@guandata/superapp-globe';
 */

// ① 一站式样板组件 —— `npm install` 后 5 秒看到完整美学(美学样板示例)
export { SuperAppGlobeApp } from './SuperAppGlobeApp';
/**
 * @deprecated 改用 `SuperAppGlobeApp`。`TowerXApp` 是 D3.6 改名前的旧名,
 * 保留为别名以兼容既有 import,后续大版本可能移除。
 */
export { SuperAppGlobeApp as TowerXApp } from './SuperAppGlobeApp';

// ② 原语组件(Phase D3 —— 直接组装 3D 地球美学的积木)
export { DarkGlobe, ParticleHalo, CityGlow, FlowLine, LiquidGlassPanel } from './primitives';
export type {
    DarkGlobeProps,
    ParticleHaloProps,
    CityGlowProps,
    FlowLineProps,
    LiquidGlassPanelProps,
    LiquidGlassVariant,
} from './primitives';

// ③ 公共数据契约(去业务化的几何 + 视觉词汇)
export type { LngLat, GeoPoint, GeoArc, FlowLineStyle, GlobeDensity, GlobeFocusPose } from './primitives';

// ④ 既有:配置 hook / settings 服务 / 相机预设 / TowerX* 类型(内部代号保留)
export { useTowerXConfig, deriveTowerXConfig } from './components/towerx/config/useTowerXConfig';
export { loadAppSettings, resolveAppTitle, DEFAULT_APP_TITLE } from './services/settings';
export { CAMERA_PRESETS } from './components/towerx/presets/cameraPresets';

export type { AppSettings, TowerXMode, CameraPresetName, DownstreamArc, CandidateArc } from './services/settings';

export type {
    TowerXConfig,
    TowerXBrand,
    TowerXCrisis,
    TowerXCrisisStoryNarrative,
    TowerXLayout,
    TowerXTelemetry,
    TowerXData,
    TowerXAssets,
    UseTowerXConfigResult,
} from './components/towerx/config/useTowerXConfig';
