import { useEffect, useMemo, useRef, useState } from 'react';
import { Routes } from '../components/towerx/globe/Routes';
import type { Route, RouteStatus, RouteEmphasis } from '../components/towerx/mock-data';
import type { ActivePulse } from '../components/towerx/stage/ambientEngine';
import { AMBIENT } from '../components/towerx/stage/ambientConfig';
import { useDarkGlobeStage } from './darkGlobeContext';
import type { FlowLineStyle, GeoArc, LngLat } from './types';

/**
 * `<FlowLine>` 接口契约(handoff §4):支持批量或单线两种调用形式。
 *
 *     <FlowLine arcs={geoArcs} style="cinematic" />
 *     <FlowLine from={[114, 22]} to={[121, 31]} style="cinematic" />
 *
 * 渲染数学(quadratic-bezier 弧 + 3D drei Line + 2D 屏幕空间彗星拖尾 +
 * 背面剔除)100% 复用 `Routes.tsx`;FlowLine 不画图,只做三件事:
 *  1. 合成内部 `Route` + `cityById` 形状(generic GeoArc -> 业务 Route 数据)。
 *  2. 把通用 `FlowLineStyle` 映射成业务 RouteStatus / emphasis(`disruption`
 *     = 旧 `status:'critical'` 的危机渲染,其余按强调度映射)。
 *  3. **自带 pulse 循环(rAF respawn)**:Routes 渲染数学要求每条非危机线必须有
 *     匹配的 `ActivePulse`(无 pulse 即 opacity=0,看不见);消费方传 arcs 即可,
 *     原语内部用 rAF 给每条 arc 持续循环一只彗星(飞完一趟前移 startedAt 重飞,
 *     按弧长匀速),无需消费方维护时序。
 *
 * `cometCanvasRef` 不需要消费方手接 —— 每个 FlowLine 在 DarkGlobe overlay 宿主里
 * 挂自己的画布(`overlayHostRef`),多条流光各画各的、互不 clearRect 清除。
 */
export type FlowLineProps = FlowLineBatchProps | FlowLineSingleProps;

export interface FlowLineBatchProps {
    /** 批量弧线数据。 */
    arcs: GeoArc[];
    from?: never;
    to?: never;
    /** 流光视觉档位(默认 'cinematic')。批量调用时所有弧共用一档。 */
    style?: FlowLineStyle;
}

export interface FlowLineSingleProps {
    /** 单线便捷形式:起点 `[lng, lat]`。 */
    from: LngLat;
    /** 单线便捷形式:终点 `[lng, lat]`。 */
    to: LngLat;
    arcs?: never;
    style?: FlowLineStyle;
}

/**
 * FlowLineStyle → 内部 Route 业务状态映射。原语对外只暴露 FlowLineStyle 四档
 * 中性词;mock-data Route 的 RouteStatus / RouteEmphasis 是渲染层语义,转换
 * 内置:
 *
 *  - `cinematic` —— 主航线感:emphasis primary + status normal(蓝色长流光)。
 *  - `pulse`     —— 网络脉动:emphasis normal + status normal(常态蓝)。
 *  - `disruption`—— 危机/扰动:emphasis primary + status critical(品红 + 2× 速度)。
 *  - `calm`      —— 背景静线:emphasis normal + status normal(同 pulse,语义留白
 *                   给未来透明度衰减;v1 不开)。
 */
function styleToStatus(style: FlowLineStyle): {
    status: RouteStatus;
    emphasis: RouteEmphasis;
} {
    switch (style) {
        case 'disruption':
            return { status: 'critical', emphasis: 'primary' };
        case 'cinematic':
            return { status: 'normal', emphasis: 'primary' };
        case 'pulse':
        case 'calm':
        default:
            return { status: 'normal', emphasis: 'normal' };
    }
}

/**
 * 两端点的大圆中心角(度,0..180)—— 作为弧长代理。彗星匀速:飞行时长 ∝ 弧长,
 * 所以远的目的地飞得更久、后到达,近的先到达(而非所有连线固定同一时长)。
 */
function centralAngleDeg(from: LngLat, to: LngLat): number {
    const k = Math.PI / 180;
    const lat1 = from[1] * k;
    const lat2 = to[1] * k;
    const dLng = (to[0] - from[0]) * k;
    const c = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return Math.acos(Math.max(-1, Math.min(1, c))) / k;
}

// 速度锚点:60° 的弧 ≈ 旧的固定时长(AMBIENT.pulseLifetimeMs),据此换算"每度毫秒"。
// 再夹到 [0.5×, 2.2×] 防止极短弧彗星太快、极长弧太慢。
const MS_PER_DEG = AMBIENT.pulseLifetimeMs / 60;
const MIN_LIFETIME = AMBIENT.pulseLifetimeMs * 0.5;
const MAX_LIFETIME = AMBIENT.pulseLifetimeMs * 2.2;

function arcLifetimeMs(from: LngLat, to: LngLat): number {
    return Math.min(MAX_LIFETIME, Math.max(MIN_LIFETIME, MS_PER_DEG * centralAngleDeg(from, to)));
}

/**
 * `<FlowLine>` —— 流光连线原语(Phase D3.5)。
 *
 * 必须挂在 `<DarkGlobe>` 子树内。
 *
 * 设计取舍(v1):
 *  - **synthetic pulses 持续循环驱动**:Routes 的非危机线只在匹配 pulse 存活期间
 *    可见(op=0 否则,见 Routes.tsx useFrame),消费方不应被迫维护 pulse 时序状态;
 *    FlowLine 内部用 rAF 给每条 arc 持续 respawn 一只彗星——飞完一趟(age ≥ 该线
 *    lifetime)就把 startedAt 前移一个 lifetime,从弧首重新起飞,等价于样板
 *    `ambientEngine` 的"飞完即重新 spawn"。每条 arc 每趟都飞整弧,首飞按 index 错峰。
 *  - **匀速**:每条线的 lifetime ∝ 弧长(大圆角距 × ~70ms/度,见 arcLifetimeMs),
 *    彗星速度恒定——远的目的地飞得久、后到达;线随各自彗星抵达终点才结束(线
 *    透明度与彗星共用同一 (now−startedAt)/lifetime 窗口,Routes 读 pulse.lifetime)。
 *  - **多实例不互相清除**:每个 FlowLine 在 DarkGlobe 的 overlay 宿主里挂自己的
 *    canvas(见下),所以同一 DarkGlobe 下多条不同 style 的流光可并存。
 *  - **不接 crisis 时序**:`crisisResolving` / `crisisPhase` 不在原语 prop 表里
 *    (handoff §4 红线);用 `disruption` style 拿"品红 + 2× 速度"危机视觉就够,
 *    四拍治愈动画属于业务时序,留样板。
 *  - **无业务 onClick**:连线不点击,与 CityGlow 一致。
 */
export function FlowLine(props: FlowLineProps) {
    const { overlayHostRef, config } = useDarkGlobeStage();
    const style: FlowLineStyle = props.style ?? 'cinematic';

    // 本实例**专属**的 2D 叠层画布:mount 时往 DarkGlobe 的 overlay 宿主里 append
    // 一块自己的 canvas,unmount 时移除。这样同一 DarkGlobe 下多条 FlowLine 各画各的
    // 彗星,不会因 Routes 每帧 clearRect 整块画布而互相清掉(只剩最后渲染的可见)。
    const cometCanvasRef = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        const host = overlayHostRef.current;
        if (!host) return;
        const canvas = document.createElement('canvas');
        canvas.className = 'pointer-events-none absolute inset-0 h-full w-full';
        host.appendChild(canvas);
        cometCanvasRef.current = canvas;
        return () => {
            if (canvas.parentNode === host) host.removeChild(canvas);
            cometCanvasRef.current = null;
        };
    }, [overlayHostRef]);

    // 每 render 直接解析 arcs(廉价);引用稳定性不靠这里,靠下面 arcsKey 字符串。
    const arcs: GeoArc[] =
        'arcs' in props && props.arcs
            ? props.arcs
            : 'from' in props && props.from && 'to' in props && props.to
              ? [{ id: '__flowline_single__', from: props.from, to: props.to }]
              : [];

    // arc 几何的稳定签名 —— 依赖数组对**字符串按值比较**,所以即便消费方传内联
    // 数组字面量(`arcs={[...]}` / `from={[lng,lat]}`,每 render 新引用),只要坐标
    // 值不变,arcsKey 就不变,下游 useMemo / useEffect 不会每 render 重算 / 重跑。
    // (D3.5 旧版 `useMemo(..., [props])` + 内联字面量 → routes 每 render 新引用 →
    //  pulse effect 每帧重跑、把 startedAt 重置成 now → 彗星永远卡在弧首不飞。)
    const arcsKey = arcs.map((a) => `${a.id ?? ''}:${a.from[0]},${a.from[1]}>${a.to[0]},${a.to[1]}`).join('|');

    // 合成 Route[] + cityById + 每条线的匀速 lifetime(端点用合成 id,避免与样板真
    // city id 冲突)。依赖 [arcsKey, style]:arcsKey 完整编码 arcs 坐标,值不变即复用。
    const { routes, cityById, lifetimes } = useMemo(() => {
        const cMap: Record<string, { latDeg: number; lngDeg: number }> = {};
        const lts: Record<string, number> = {};
        const rs: Route[] = [];
        const { status, emphasis } = styleToStatus(style);
        arcs.forEach((a, i) => {
            const rid = a.id ?? `flowline-${i}`;
            const srcKey = `__flowline_pt__${rid}_src`;
            const dstKey = `__flowline_pt__${rid}_dst`;
            cMap[srcKey] = { lngDeg: a.from[0], latDeg: a.from[1] };
            cMap[dstKey] = { lngDeg: a.to[0], latDeg: a.to[1] };
            lts[rid] = arcLifetimeMs(a.from, a.to);
            rs.push({ id: rid, source: srcKey, target: dstKey, status, emphasis });
        });
        return { routes: rs, cityById: cMap, lifetimes: lts };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- arcsKey 已完整编码 arcs
    }, [arcsKey, style]);

    // 每条 arc 持续循环飞一只彗星:跑完一趟(age ≥ 该线 lifetime)就把 startedAt 前移
    // 一个 lifetime,从弧首重新起飞 —— 等价于样板 useAmbient 的"飞完一趟即重新 spawn"。
    //
    // ⭐ 匀速:每条线的 lifetime ∝ 弧长(见 arcLifetimeMs),所以彗星速度恒定 —— 远的
    // 目的地飞得久、后到达,近的先到达;线随各自彗星抵达终点(u=1)才结束。不再是
    // 所有连线固定同一时长(那样远近不同却同时结束,不合理)。
    //
    // 为什么不能用旧的 "startedAt = now - i·jitter + 整体 rebuild":Routes 非危机彗星
    // 位置 `u = min(1, age/lifetime)`(clamp 不 wrap),提前量会让 route i 只飞 [i/N,1]
    // 一小段就停在弧尾不可见 → 实测一周期 ~70% 帧零彗星。
    //
    // 新方案:每条 arc 每趟都飞整弧 ——
    //  - 首飞错峰:route i 在 t0 + i·stagger 起飞(未到点 age<0 → 不绘制)。
    //  - rAF 每帧检查,飞完一趟就 startedAt += 该线 lifetime(同帧前移,无停顿)。
    //  - 仅在 roll-over 的帧 setPulses,不每帧 setState。
    //
    // 线/光点时长对齐:线透明度 env 与彗星位置 u 都读同一个 (now - startedAt)/lifetime
    // (Routes 用 pulse.lifetime),窗口同为 [0,1] → 线的显隐与光点飞行严格同窗口。
    const [pulses, setPulses] = useState<ActivePulse[]>([]);
    useEffect(() => {
        if (routes.length === 0) {
            setPulses([]);
            return;
        }
        const n = routes.length;
        const lifetimeOf = (id: string) => lifetimes[id] ?? AMBIENT.pulseLifetimeMs;
        // 错峰间隔用平均 lifetime / n —— 各线寿命不同,用均值做近似均匀错峰即可。
        const avgLifetime = routes.reduce((s, r) => s + lifetimeOf(r.id), 0) / n;
        const stagger = avgLifetime / n;
        const t0 = performance.now();
        let cur: ActivePulse[] = routes.map((r, i) => ({
            routeId: r.id,
            startedAt: t0 + i * stagger,
            crisis: false,
            lifetime: lifetimeOf(r.id),
        }));
        setPulses(cur);

        let raf = 0;
        const tick = () => {
            const now = performance.now();
            const next = cur.map((p) => {
                const life = p.lifetime ?? AMBIENT.pulseLifetimeMs;
                let s = p.startedAt;
                let rolled = false;
                while (now - s >= life) {
                    s += life;
                    rolled = true;
                }
                return rolled ? { ...p, startedAt: s } : p;
            });
            if (next.some((p, i) => p !== cur[i])) {
                cur = next;
                setPulses(next);
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [routes, lifetimes]);

    if (arcs.length === 0) return null;

    return (
        <Routes
            routes={routes}
            cityById={cityById}
            config={config}
            cometCanvasRef={cometCanvasRef}
            pulses={pulses}
        />
    );
}
