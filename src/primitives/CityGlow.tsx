import { useMemo } from 'react';
import { Cities } from '../components/towerx/globe/Cities';
import type { City } from '../components/towerx/mock-data';
import { useDarkGlobeStage } from './darkGlobeContext';
import type { GeoPoint, LngLat } from './types';

/**
 * `<CityGlow>` 接口契约(handoff §4):支持批量或单点两种调用形式。
 *
 *     <CityGlow points={geoPoints} />
 *     <CityGlow position={[121, 31]} label="上海" />
 *
 * 视觉数学(halo 三层、状态色、标签 billboard、背面剔除)100% 复用
 * `Cities.tsx` 的 16 轮调出来的渲染实现 —— CityGlow 不画图,只做数据形态
 * 适配:把通用 `GeoPoint`(无业务语义)合成内部 `City`(有 nodeType / status
 * 等业务字段),再喂给 `Cities`。
 */
export type CityGlowProps =
    | CityGlowBatchProps
    | CityGlowSingleProps;

export interface CityGlowBatchProps {
    /** 批量点光数据。 */
    points: GeoPoint[];
    position?: never;
    label?: never;
}

export interface CityGlowSingleProps {
    /** 单点便捷形式:`[经度, 纬度]`。 */
    position: LngLat;
    /** 单点可选标签。 */
    label?: string;
    points?: never;
}

/**
 * `<CityGlow>` —— 城市点光原语(Phase D3.5)。
 *
 * 必须挂在 `<DarkGlobe>` 子树内 —— 通过 `useDarkGlobeStage()` 取舞台几何
 * cfg(球半径 / 视口 cfg),保证 halo 与地球球面对齐。
 *
 * 设计取舍(v1):
 *  - **无业务 prop**:不接 hasAlertById / onCityClick / activeCityIds —— 这些
 *    是样板的业务门控,按 handoff §4 红线"留在样板",原语不污染。
 *  - **synthetic City**:nodeType 兜底 'air-hub'、status 兜底 'normal';要让
 *    点用 critical(品红)/ watch(琥珀)/ primary(亮白)等业务状态色,
 *    走样板的 `<Cities>`(走 mock City[] + 业务字段),不在原语侧暴露。
 *  - **label 始终显示**:有 `label` 字段的点直接画出文字(用 activeCityIds
 *    枚举所有有 label 的 id);Cities 的 R4-4 "只给活跃连线显示标签" 是危机
 *    场景的去杂乱策略,原语场景下消费方传 label 就是想看见,直接显示。
 */
export function CityGlow(props: CityGlowProps) {
    const { config } = useDarkGlobeStage();

    const points: GeoPoint[] = useMemo(() => {
        if ('points' in props && props.points) {
            return props.points;
        }
        if ('position' in props && props.position) {
            const id = '__cityglow_single__';
            const label = 'label' in props ? props.label : undefined;
            return [{ id, position: props.position, label }];
        }
        return [];
    }, [props]);

    const cities: City[] = useMemo(
        () =>
            points.map((p, i) => ({
                id: p.id ?? `cityglow-${i}`,
                name: p.label ?? '',
                lngDeg: p.position[0],
                latDeg: p.position[1],
                nodeType: 'air-hub',
                status: 'normal',
            })),
        [points],
    );

    const activeCityIds = useMemo(() => {
        const s = new Set<string>();
        for (const p of points) {
            if (p.label && (p.id || p.label)) {
                s.add(p.id ?? '__cityglow_single__');
            }
        }
        return s;
    }, [points]);

    if (points.length === 0) return null;

    return <Cities cities={cities} config={config} activeCityIds={activeCityIds} />;
}
