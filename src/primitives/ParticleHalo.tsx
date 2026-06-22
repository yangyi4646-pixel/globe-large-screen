import { useMemo } from 'react';
import { AtmosphereHalo } from '../components/towerx/globe/AtmosphereHalo';
import { AtmosphereParticles } from '../components/towerx/globe/AtmosphereParticles';
import type { WebGLGlobeConfig } from '../components/towerx/webglConfig';
import { useDarkGlobeStage } from './darkGlobeContext';
import type { GlobeDensity } from './types';

/**
 * `<ParticleHalo>` —— 大气环境层原语(Phase D3.3)。
 *
 * 把暗夜地球的两层"环境氛围"——`AtmosphereHalo`(球后辉光圆盘)+
 * `AtmosphereParticles`(缓转尘埃壳)——封装成一个可复用、可微调、可单独
 * 开关的原语。`DarkGlobe` 的内置大气层就是用它渲染的(DRY:一处实现,
 * 内置与自定义共用)。
 *
 * ⚠️ **坐标系契约(关键)**:大气是**环境层**,必须挂在地球的
 * tilt/spin/scale 之外 —— 它**不随地球自转 / 缩放**,只继承外层 X/Y 偏移。
 * `DarkGlobe` 把内置 `<ParticleHalo>` 放在外层 group;消费方要自定义,
 * **必须**通过 `DarkGlobe` 的 `ambient` slot prop 注入(它也渲染在外层
 * group),**绝不能放进 `children`**(children 在最内层 scaleRef 组,会被
 * 卷进自转 / 缩放 → 大气跟着球转,坏掉)。详见 DarkGlobe `ambient` prop 注释。
 *
 * 渲染数学(halo shader / 粒子 shader / 投影 / 尺寸)100% 复用
 * `AtmosphereHalo` + `AtmosphereParticles`;ParticleHalo 不画图,只做
 * "config 数据来源":从 `useDarkGlobeStage()` 取舞台 config 作底,再按
 * props 覆盖纯视觉字段(颜色 / 数量 / 尺寸 / 密度),映射到底层
 * `WebGLGlobeConfig` 的 `halo*` / `particle*` 字段。
 */
export interface ParticleHaloProps {
    /**
     * 单色便捷覆盖:同时染 halo 内外色 + 粒子色。想分别控制用
     * `haloColor` / `particleColor`(它们优先级更高)。
     */
    color?: string;
    /** 仅覆盖 halo 颜色(内外同色)。优先级高于 `color`。 */
    haloColor?: string;
    /** 仅覆盖粒子颜色。优先级高于 `color`。 */
    particleColor?: string;
    /** 粒子数量(覆盖 config.particleCount;也可用 `density` 走预设)。 */
    particleCount?: number;
    /** halo 圆盘相对球半径的大小(覆盖 config.haloSize)。 */
    haloSize?: number;
    /** 视觉密度预设 sparse | dense | immersive —— 只调粒子数量,不碰颜色 / 相机。 */
    density?: GlobeDensity;
    /** 是否渲染 halo 辉光层(默认 true)。 */
    halo?: boolean;
    /** 是否渲染粒子尘埃层(默认 true)。 */
    particles?: boolean;
}

// 密度预设 —— 与 DarkGlobe 的 DENSITY_PRESETS 粒子档位一致(只取 particleCount,
// surfaceDots 属地球本体,不归大气层管)。
const DENSITY_PARTICLE_COUNT: Record<GlobeDensity, number | undefined> = {
    sparse: 1600,
    dense: undefined, // 用底座默认
    immersive: 5400,
};

function resolveAtmosphereConfig(base: WebGLGlobeConfig, props: ParticleHaloProps): WebGLGlobeConfig {
    const cfg: WebGLGlobeConfig = { ...base };

    // density 预设(只动粒子数量)
    if (props.density) {
        const count = DENSITY_PARTICLE_COUNT[props.density];
        if (count != null) cfg.particleCount = count;
    }

    // 颜色:先用单色便捷值铺底,再让分项覆盖
    if (props.color != null) {
        cfg.haloInnerColor = props.color;
        cfg.haloOuterColor = props.color;
        cfg.particleColor = props.color;
    }
    if (props.haloColor != null) {
        cfg.haloInnerColor = props.haloColor;
        cfg.haloOuterColor = props.haloColor;
    }
    if (props.particleColor != null) cfg.particleColor = props.particleColor;

    // 数量 / 尺寸纯视觉覆盖
    if (props.particleCount != null) cfg.particleCount = props.particleCount;
    if (props.haloSize != null) cfg.haloSize = props.haloSize;

    // 子层开关 —— 映射到底层 enabled 标志(渲染组件逐帧读它决定 visible)
    if (props.halo === false) cfg.haloEnabled = false;
    if (props.particles === false) cfg.particlesEnabled = false;

    return cfg;
}

/**
 * `<ParticleHalo>` —— 必须在 `<DarkGlobe>` 子树内(通过 `useDarkGlobeStage()`
 * 取 config 作底)。典型用法是注入 `DarkGlobe` 的 `ambient` slot:
 *
 *     <DarkGlobe atmosphere={false} ambient={<ParticleHalo color="#7cf" />}>
 *       ...children...
 *     </DarkGlobe>
 */
export function ParticleHalo(props: ParticleHaloProps) {
    const { config } = useDarkGlobeStage();
    const cfg = useMemo(
        () => resolveAtmosphereConfig(config, props),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [config, props.color, props.haloColor, props.particleColor, props.particleCount, props.haloSize, props.density, props.halo, props.particles],
    );

    return (
        <>
            <AtmosphereHalo config={cfg} />
            <AtmosphereParticles config={cfg} />
        </>
    );
}
