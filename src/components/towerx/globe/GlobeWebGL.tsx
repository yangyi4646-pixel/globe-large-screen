import { Cities } from './Cities';
import { CrisisReroute } from './CrisisReroute';
import type { Phase as RrPhase } from './crisisRerouteTimeline';
import { DisruptionRing } from './DisruptionRing';
import { Routes } from './Routes';
import { cities, routes } from '../mock-data';
import { defaultWebGLConfig, type WebGLGlobeConfig } from '../webglConfig';
import { DarkGlobe } from '../../../primitives/DarkGlobe';
import { useDarkGlobeStage } from '../../../primitives/darkGlobeContext';
import type { ActivePulse } from '../stage/ambientEngine';
import type { FocusPose } from '../stage/focusPose';

type GlobeWebGLProps = {
  config?: WebGLGlobeConfig;
  /** Click handler for city dots. App wires this to setSelectedAlert
   *  via the cityId → alert mapping. */
  onCityClick?: (cityId: string) => void;
  /** cityId → has-alert? for the cursor / interactivity gate. */
  hasAlertByCityId?: Record<string, boolean>;
  /** 环境引擎活跃脉冲,透传给 Routes。 */
  pulses: ActivePulse[];
  /** 有活跃连线的城市 id —— 标签只在这些城市显示(R4-4 去杂乱)。 */
  activeCityIds?: Set<string>;
  /** 当前要电影聚焦的目标 pose(危机详情打开时由 App 给出实时可调
   *  的值);null = 回广角。App 决定只有危机航线传非 null。 */
  focusPose?: FocusPose | null;
  /** P-B Slice2:人按核按钮后 true → 危机线 magenta→blue 愈合 +
   *  HK 危机环平息。Routes/DisruptionRing 内部按帧缓动。 */
  crisisResolving?: boolean;
  /** P-B Slice2b:当前危机拍 → CrisisReroute 编排候选/待定/画通
   *  改道线。'rest'(非危机详情)= 全隐。 */
  crisisPhase?: RrPhase;
};

/**
 * GlobeWebGL — 样板内部的"暗夜地球 + 业务图层"装配点。
 *
 * Phase D3.4 起,通用的暗夜地球舞台(画布 / 相机 / 地球本体 / 大气 / bloom /
 * 入场编排 / tilt-spin-scale 坐标系)已抽到 `<DarkGlobe>` 原语。本组件只剩
 * "把样板的业务图层(Routes / Cities / DisruptionRing / CrisisReroute)作为
 * children 挂进 DarkGlobe,并透传 crisis 时序"这一职责。对外行为与重构前一致。
 *
 * Phase D3.5:2D 彗星叠层 ref 不再 GlobeWebGL 自己 useRef + 手接给 Routes;
 * DarkGlobe 内部已持有这个 ref 并通过 `useDarkGlobeStage()` 提供。GlobeWebGL
 * 用 `<SampleLayers>` 这个 children 桥接子组件从 Context 取出 ref 再喂给
 * Routes —— 业务行为不变,但把消费方手接 ref 这条耦合彻底拆掉,与公开
 * CityGlow / FlowLine 原语走同一条 context 取法。
 */
export function GlobeWebGL({
  config = defaultWebGLConfig,
  onCityClick,
  hasAlertByCityId,
  pulses,
  activeCityIds,
  focusPose = null,
  crisisResolving = false,
  crisisPhase = 'rest'
}: GlobeWebGLProps) {
  return (
    <DarkGlobe config={config} focusPose={focusPose}>
      <SampleLayers
        config={config}
        onCityClick={onCityClick}
        hasAlertByCityId={hasAlertByCityId}
        pulses={pulses}
        activeCityIds={activeCityIds}
        crisisResolving={crisisResolving}
        crisisPhase={crisisPhase}
      />
    </DarkGlobe>
  );
}

type SampleLayersProps = {
  config: WebGLGlobeConfig;
  onCityClick?: (cityId: string) => void;
  hasAlertByCityId?: Record<string, boolean>;
  pulses: ActivePulse[];
  activeCityIds?: Set<string>;
  crisisResolving: boolean;
  crisisPhase: RrPhase;
};

/**
 * SampleLayers — 在 `<DarkGlobe>` 子树内运行的样板图层组,使用
 * `useDarkGlobeStage()` 从 Context 取舞台 overlayCanvasRef 后透传给 Routes。
 * 这是 D3.5 把"样板手接 overlay ref"换成"context 取法"的唯一过渡点;Routes/
 * Cities 等内部业务渲染组件未动,渲染数学零变化。
 */
function SampleLayers({
  config,
  onCityClick,
  hasAlertByCityId,
  pulses,
  activeCityIds,
  crisisResolving,
  crisisPhase
}: SampleLayersProps) {
  const { overlayCanvasRef } = useDarkGlobeStage();
  return (
    <>
      <Routes
        routes={routes}
        cityById={cityById}
        config={config}
        cometCanvasRef={overlayCanvasRef}
        pulses={pulses}
        crisisResolving={crisisResolving}
        crisisPhase={crisisPhase}
      />
      <Cities
        cities={cities}
        config={config}
        onCityClick={onCityClick}
        hasAlertById={hasAlertByCityId}
        activeCityIds={activeCityIds}
      />
      <DisruptionRing cities={cities} config={config} crisisResolving={crisisResolving} />
      <CrisisReroute phase={crisisPhase} />
    </>
  );
}

// cityById — lat/lng lookup used by Routes for endpoint resolution.
// Built once at module load since `cities` is a static dataset.
const cityById: Record<string, { latDeg: number; lngDeg: number }> = (() => {
  const out: Record<string, { latDeg: number; lngDeg: number }> = {};
  for (const c of cities) out[c.id] = { latDeg: c.latDeg, lngDeg: c.lngDeg };
  return out;
})();
