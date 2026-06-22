/**
 * SuperApp Globe —— 原语组件公共出口(Phase D3)。
 *
 * 这一层是给 SuperApp 用户直接组装 3D 地球美学的"积木"。与一站式样板
 * `SuperAppGlobeApp` 并列:样板用于快速预览,原语用于生产自由组装。
 *
 * 已开放(D3.1 / D3.2 / D3.3 / D3.4 / D3.5):
 *  - LiquidGlassPanel(玻璃 HUD 容器)
 *  - DarkGlobe(暗夜地球容器:画布 + 地球本体 + 大气 + bloom + 入场 + 坐标系)
 *  - ParticleHalo(大气环境层:halo 辉光 + 粒子尘埃,可开关 / 微调)
 *  - CityGlow(城市点光,GeoPoint -> halo + dot + label)
 *  - FlowLine(流光连线,GeoArc + FlowLineStyle -> 弧 + 彗星拖尾)
 *  - 公共数据契约 LngLat / GeoPoint / GeoArc / FlowLineStyle / GlobeDensity
 */

export { LiquidGlassPanel } from './LiquidGlassPanel';
export type { LiquidGlassPanelProps, LiquidGlassVariant } from './LiquidGlassPanel';

// 暗夜地球容器原语(画布 + 地球本体 + 大气 + bloom + 入场 + 坐标系)
export { DarkGlobe } from './DarkGlobe';
export type { DarkGlobeProps, GlobeFocusPose } from './DarkGlobe';

// 大气环境层原语(halo 辉光 + 粒子尘埃;DarkGlobe 内置层也用它,D3.3)
export { ParticleHalo } from './ParticleHalo';
export type { ParticleHaloProps } from './ParticleHalo';

// 城市点光 / 流光连线原语(D3.5)
export { CityGlow } from './CityGlow';
export type { CityGlowProps, CityGlowBatchProps, CityGlowSingleProps } from './CityGlow';
export { FlowLine } from './FlowLine';
export type { FlowLineProps, FlowLineBatchProps, FlowLineSingleProps } from './FlowLine';

// 公共数据契约(去业务化的几何 + 视觉词汇)
export type { LngLat, GeoPoint, GeoArc, FlowLineStyle, GlobeDensity } from './types';
