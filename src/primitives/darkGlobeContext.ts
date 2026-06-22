import { createContext, useContext, type RefObject } from 'react';
import type { WebGLGlobeConfig } from '../components/towerx/webglConfig';

/**
 * SuperApp Globe —— `<DarkGlobe>` 暗夜地球容器原语对外暴露给 children 的舞台上下文
 * (Phase D3.5)。
 *
 * 为什么需要这个 Context:
 *  - 暗夜地球的几何 / 视觉 cfg(`WebGLGlobeConfig`)是整座舞台共享的坐标系 +
 *    渲染参数:CityGlow / FlowLine 这类点 / 线原语在球面投影时必须用同一份
 *    cfg(`positionX/Y`、`radius`、`routesEnabled` 等),不然彗星与点位会偏。
 *  - FlowLine 的 2D 彗星流光画在 R3F Canvas 之外的叠层 <canvas> 上,需要拿到
 *    叠层画布的 ref 才能逐帧 `ctx.lineTo`。Context 让消费方"摆"FlowLine 不必
 *    手接 `overlayCanvasRef`,直接 `<DarkGlobe><FlowLine arcs=.../></DarkGlobe>`
 *    即可。
 *
 * 为什么 Provider 放 Canvas 内:
 *  - R3F 的 `<Canvas>` 默认不向 R3F 子树穿透 React Context(它建独立 fiber root,
 *    参 https://docs.pmnd.rs/r3f/advanced/gotchas#context-not-being-passed-down-by-canvas)。
 *  - 因此 DarkGlobe 在 Canvas 内部把 Provider 包在 SceneStage 外层,3D children
 *    才能 `useDarkGlobeStage()` 拿到 cfg + overlayCanvasRef。
 */
export type DarkGlobeStage = {
    /** 当前舞台用的完整 WebGL 几何/视觉配置(已合并 density / camera / bloom / 逃生舱)。 */
    config: WebGLGlobeConfig;
    /**
     * 共享叠层 2D 画布 ref —— 样板 `GlobeWebGL`(单 Routes 实例)在此画彗星。
     * ⚠️ 多个 `<FlowLine>` 不能共用它:Routes 每帧 `clearRect` 整块画布再重画自己
     * 的彗星,共用会互相清除(只剩最后渲染的实例可见)。多实例场景每个 FlowLine
     * 走 `overlayHostRef` 各自挂一块独立画布。
     */
    overlayCanvasRef: RefObject<HTMLCanvasElement | null>;
    /**
     * 叠层画布宿主容器 —— 每个 `<FlowLine>` 在 mount 时往这里 append 一块**自己的**
     * `<canvas>`(stack 在一起,各画各的彗星,互不 clearRect 清除),unmount 时移除。
     * 这是 FlowLine 可组合(同一 DarkGlobe 下多条不同 style 的流光)的关键。
     */
    overlayHostRef: RefObject<HTMLDivElement | null>;
};

export const DarkGlobeContext = createContext<DarkGlobeStage | null>(null);

/**
 * 在 `<DarkGlobe>` 子树内取舞台 cfg + overlayCanvasRef。
 * 在 `<DarkGlobe>` 之外调用会 throw —— 把契约错误尽量左移。
 */
export function useDarkGlobeStage(): DarkGlobeStage {
    const ctx = useContext(DarkGlobeContext);
    if (!ctx) {
        throw new Error(
            'useDarkGlobeStage() must be called inside a <DarkGlobe> subtree. ' +
                'CityGlow / FlowLine require this context to share the globe geometry config + 2D overlay canvas.',
        );
    }
    return ctx;
}
