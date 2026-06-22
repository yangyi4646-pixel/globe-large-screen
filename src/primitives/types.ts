/**
 * SuperApp Globe —— 原语组件公共数据契约(Phase D3.2)。
 *
 * 这一层刻意"去业务化":只描述几何 + 视觉,不带任何物流 / 供应链 / 危机语义。
 * 消费方用自己的业务数据填充这些通用结构,包负责把它们渲染成暗夜美学。
 *
 * 设计依据(对照旧业务结构,见 components/towerx/mock-data.ts):
 *  - 旧 `City{nodeType:factory|port…, status:critical|watch}` → 通用 `GeoPoint`
 *    (节点角色 / 业务状态属于消费方语义,不进包的公共契约)
 *  - 旧 `Route{emphasis, status:critical}` → 通用 `GeoArc` + 视觉 `FlowLineStyle`
 *    (旧 status:critical 的"危机"渲染 = `FlowLineStyle: 'disruption'` 一种样式)
 *
 * 坐标统一用 `[经度, 纬度]`(度,WGS84),与 memory 里既定 API
 * `position={[121, 31]}`(上海)一致 —— 经度在前。
 */

/** 经纬度坐标 `[经度, 纬度]`,单位度(WGS84)。经度在前。 */
export type LngLat = [number, number];

/** 地理点(通用,无业务语义)—— `<CityGlow>` / `<DarkGlobe>` 的点数据单元。 */
export interface GeoPoint {
    /** 稳定标识(用于 React key / 交互回调寻址);可选。 */
    id?: string;
    /** 坐标 `[经度, 纬度]`。 */
    position: LngLat;
    /** 显示标签(可选);不传则只渲染光点,不出文字。 */
    label?: string;
}

/** 连线(通用,无业务语义)—— `<FlowLine>` 的弧线数据单元。 */
export interface GeoArc {
    /** 稳定标识;可选。 */
    id?: string;
    /** 起点 `[经度, 纬度]`。 */
    from: LngLat;
    /** 终点 `[经度, 纬度]`。 */
    to: LngLat;
}

/**
 * 流光连线视觉样式 —— 纯视觉档位,不绑定业务含义。
 *  - `cinematic`:电影感长拖尾流光(默认,主航线 / 强调连线)。
 *  - `pulse`:周期脉冲流光(常态网络,密度较高时用)。
 *  - `disruption`:扰动 / 改道样式(原"危机"渲染的通用名)。
 *  - `calm`:低调静线(背景连线,不抢视觉)。**v1 视觉同 `pulse`**,作为
 *    未来"低调静线"档位的预留语义(待 Routes 开放 per-line 透明度衰减再区分)。
 */
export type FlowLineStyle = 'cinematic' | 'pulse' | 'disruption' | 'calm';

/**
 * 视觉密度预设(对应架构文档 §4 视觉密度预设,非业务边界)。
 *  - `sparse`:稀疏,少点少线,适合远景 / 营销定格。
 *  - `dense`:密集(默认),经营驾驶舱常态密度。
 *  - `immersive`:沉浸,最高粒子 / 流光密度,适合值守大屏。
 */
export type GlobeDensity = 'sparse' | 'dense' | 'immersive';
