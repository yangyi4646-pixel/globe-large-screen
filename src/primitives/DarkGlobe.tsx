import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import type { Group, PerspectiveCamera as PerspectiveCameraImpl } from 'three';
import { StylizedEarth } from '../components/towerx/globe/StylizedEarth';
import { SurfaceDots } from '../components/towerx/globe/SurfaceDots';
import { armIntro, emergeScale, setIntroParams, spinIntroOffset, travelT } from '../components/towerx/intro/introClock';
import { defaultWebGLConfig, type WebGLGlobeConfig } from '../components/towerx/webglConfig';
import type { GlobeDensity } from './types';
import { DarkGlobeContext, type DarkGlobeStage } from './darkGlobeContext';
import { ParticleHalo } from './ParticleHalo';

/**
 * `<DarkGlobe>` —— 暗夜地球容器原语(Phase D3.4)。
 *
 * 封装了一座完整的"暗夜地球舞台":R3F 画布 + 相机 + 暗夜地球本体
 * (StylizedEarth + 表面流光点)+ 大气光晕 / 粒子 + bloom 后处理 + 入场编排,
 * 并提供地球坐标系的 children 插槽 —— `<CityGlow>` / `<FlowLine>` 等点 / 线
 * 原语挂在这里就能共享同一套 tilt / spin / scale 坐标系。
 *
 * 刻意"去业务化":不含 crisis / focus 业务时序。电影感聚焦是通用能力,通过
 * `focusPose` 注入(样板在危机详情打开时传入);何时聚焦由消费方决定。
 *
 * 配置三层:友好预设(density / camera / bloom)→ 逃生舱(config 覆盖任意底层
 * 字段,样板直接传完整 WebGLGlobeConfig 走这条)。
 */

/** 电影感聚焦目标 pose —— 通用相机姿态(与内部 FocusPose 结构一致)。 */
export type GlobeFocusPose = { fov: number; posX: number; posY: number; radius: number };

type DarkGlobeCamera = { lng?: number; lat?: number; zoom?: number };
type DarkGlobeBloom = boolean | { intensity?: number; threshold?: number };

export interface DarkGlobeProps {
    /** 视觉密度预设 sparse | dense | immersive(默认 dense)。 */
    density?: GlobeDensity;
    /** 相机机位:中心经纬度 + 缩放(zoom 1 = 默认半径)。 */
    camera?: DarkGlobeCamera;
    /** bloom 后处理:true 用默认,{intensity, threshold} 细调,false 关。默认沿用底层 config。 */
    bloom?: DarkGlobeBloom;
    /** 逃生舱:直接覆盖底层视觉 config 任意字段。样板在此传入完整 WebGLGlobeConfig。 */
    config?: Partial<WebGLGlobeConfig>;
    /** 电影感聚焦目标;传入则相机平滑推近到该 pose,null / 不传 = 广角。 */
    focusPose?: GlobeFocusPose | null;
    /** 2D 叠加画布 ref —— 供 FlowLine 流光叠层绘制;一般消费方不需要。 */
    overlayCanvasRef?: RefObject<HTMLCanvasElement>;
    /**
     * 是否渲染内置大气层(halo 辉光 + 粒子尘埃,默认 true)。内置层用
     * `<ParticleHalo>` 原语渲染。要自定义大气(换色 / 调密度 / 单开某层)时,
     * 设 `atmosphere={false}` 关掉内置,再通过 `ambient` 注入自定义
     * `<ParticleHalo .../>`,避免内置 + 自定义两套同时渲染。
     */
    atmosphere?: boolean;
    /**
     * 大气环境层插槽 —— 渲染在**外层 group**(tilt/spin/scale 之外),只继承
     * X/Y 偏移,**不随地球自转 / 缩放**。这是放自定义 `<ParticleHalo>` 的正确
     * 位置;放进 `children` 会被卷进地球坐标系 = 大气跟着球转(坏)。
     * 一般与 `atmosphere={false}` 搭配使用。
     */
    ambient?: ReactNode;
    /** 渲染在地球坐标系内的子节点(CityGlow / FlowLine / 自定义 R3F)。 */
    children?: ReactNode;
}

// 视觉密度预设 —— 只动"点 / 粒子数量",不碰相机 / 颜色。dense = 默认底座。
const DENSITY_PRESETS: Record<GlobeDensity, Partial<WebGLGlobeConfig>> = {
    sparse: { particleCount: 1600, surfaceDotsDensity: 2.2 },
    dense: {},
    immersive: { particleCount: 5400, surfaceDotsDensity: 4.6 },
};

function applyCamera(cfg: WebGLGlobeConfig, camera?: DarkGlobeCamera): WebGLGlobeConfig {
    if (!camera) return cfg;
    const next = { ...cfg };
    if (camera.lng != null) next.cameraLngDeg = camera.lng;
    if (camera.lat != null) next.cameraLatDeg = camera.lat;
    if (camera.zoom != null) next.radius = defaultWebGLConfig.radius * camera.zoom;
    return next;
}

function applyBloom(cfg: WebGLGlobeConfig, bloom?: DarkGlobeBloom): WebGLGlobeConfig {
    if (bloom == null) return cfg;
    if (bloom === false) return { ...cfg, bloomEnabled: false };
    if (bloom === true) return { ...cfg, bloomEnabled: true };
    const next = { ...cfg, bloomEnabled: true };
    if (bloom.intensity != null) next.bloomIntensity = bloom.intensity;
    if (bloom.threshold != null) next.bloomLuminanceThreshold = bloom.threshold;
    return next;
}

function resolveGlobeConfig(props: DarkGlobeProps): WebGLGlobeConfig {
    let cfg: WebGLGlobeConfig = { ...defaultWebGLConfig };
    if (props.density) cfg = { ...cfg, ...DENSITY_PRESETS[props.density] };
    cfg = applyCamera(cfg, props.camera);
    cfg = applyBloom(cfg, props.bloom);
    if (props.config) cfg = { ...cfg, ...props.config };
    return cfg;
}

type StagePose = { posX: number; posY: number; radius: number; fov: number };

// 把"基础入场 pose"与"聚焦目标 pose"按 ff(0→1)线性混合。抽成纯函数,
// 让 useFrame 回调保持低复杂度。
function blendStagePose(c: WebGLGlobeConfig, t: number, ff: number, pose: GlobeFocusPose | null): StagePose {
    const baseX = c.positionX * t;
    const baseY = c.positionY * t;
    if (!pose) {
        return { posX: baseX, posY: baseY, radius: c.radius, fov: c.cameraFov };
    }
    return {
        posX: baseX + (pose.posX - baseX) * ff,
        posY: baseY + (pose.posY - baseY) * ff,
        radius: c.radius + (pose.radius - c.radius) * ff,
        fov: c.cameraFov + (pose.fov - c.cameraFov) * ff,
    };
}

type SceneStageProps = {
    config: WebGLGlobeConfig;
    focusPose: GlobeFocusPose | null;
    atmosphere: boolean;
    ambient?: ReactNode;
    children?: ReactNode;
};

/**
 * SceneStage —— R3F 场景根,逐帧驱动入场编排 + 空闲漂移 + 可选电影聚焦 + 相机。
 * 与旧 GlobeWebGL 的 SceneLive 行为一致,仅去掉 crisis 业务 props(那些由样板
 * 透传给 children 组件,SceneStage 不感知)。
 */
function SceneStage({ config, focusPose, atmosphere, ambient, children }: SceneStageProps) {
    const cfgRef = useRef(config);
    cfgRef.current = config;

    const focusPoseRef = useRef<GlobeFocusPose | null>(focusPose);
    focusPoseRef.current = focusPose;
    const focusFRef = useRef(0);
    const activePoseRef = useRef<GlobeFocusPose | null>(null);

    const groupRef = useRef<Group>(null);
    const tiltRef = useRef<Group>(null);
    const spinRef = useRef<Group>(null);
    const scaleRef = useRef<Group>(null);

    // 入场时钟在 MOUNT layout-effect 里 arm + 播种参数(不能放 useFrame,
    // 否则子层第 1 帧会先读到未 arm 的状态)。
    useLayoutEffect(() => {
        setIntroParams(cfgRef.current);
        armIntro();
    }, []);

    useFrame((state, delta) => {
        const c = cfgRef.current;
        setIntroParams(c);

        const t = travelT();
        const emerge = emergeScale();

        const fp = focusPoseRef.current;
        if (fp) activePoseRef.current = fp;
        const focusTarget = fp ? 1 : 0;
        focusFRef.current += (focusTarget - focusFRef.current) * (1 - Math.exp(-delta * 6));
        const ff = focusFRef.current;

        const p = blendStagePose(c, t, ff, activePoseRef.current);

        if (groupRef.current) {
            groupRef.current.position.x = p.posX;
            groupRef.current.position.y = p.posY;
        }
        if (tiltRef.current) {
            tiltRef.current.rotation.x = (c.cameraLatDeg * Math.PI) / 180;
        }
        if (spinRef.current) {
            const baseSpinY = -Math.PI / 2 - (c.cameraLngDeg * Math.PI) / 180;
            spinRef.current.rotation.y =
                baseSpinY + Math.sin(state.clock.elapsedTime * c.driftSpeed) * c.driftAmplitude - spinIntroOffset();
        }
        if (scaleRef.current) {
            scaleRef.current.scale.setScalar(p.radius * emerge);
        }

        const cam = state.camera as PerspectiveCameraImpl;
        if (cam.position.z !== c.cameraZ) cam.position.z = c.cameraZ;
        if (Math.abs(cam.fov - p.fov) > 1e-3) {
            cam.fov = p.fov;
            cam.updateProjectionMatrix();
        }
    });

    return (
        <group ref={groupRef} position={[config.positionX, config.positionY, 0]}>
            {/* 大气环境层(halo 辉光 + 粒子尘埃)故意在 tilt/spin/scale 之外:
                它们是环境层,只继承外层 X/Y 偏移,不随地球自转 / 缩放(见 globeConfig
                几何契约)。内置层用 <ParticleHalo> 原语渲染(DRY,与消费方自定义同源);
                ambient slot 同在此外层 group,所以自定义大气也不随球转。 */}
            {atmosphere ? <ParticleHalo /> : null}
            {ambient}

            {/* 地球坐标系组:地球本体 + 表面点 + children(点 / 线原语)共享一套
                tilt → spin → scale 变换。 */}
            <group ref={tiltRef}>
                <group ref={spinRef}>
                    <group ref={scaleRef}>
                        <Suspense fallback={null}>
                            <StylizedEarth config={config} />
                            <SurfaceDots config={config} />
                        </Suspense>
                        {children}
                    </group>
                </group>
            </group>
        </group>
    );
}

export function DarkGlobe(props: DarkGlobeProps) {
    const { focusPose = null, overlayCanvasRef: externalOverlayRef, atmosphere = true, ambient, children } = props;
    const config = useMemo(
        () => resolveGlobeConfig(props),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.density, props.camera, props.bloom, props.config],
    );

    // D3.5: always own an overlay canvas ref so FlowLine works out of the box.
    // If the consumer also passed `overlayCanvasRef` (sample uses this to keep
    // its own reference for non-primitive Routes rendering), the external ref
    // is the source of truth and the canvas DOM element binds to it. Either
    // way, the Context-published ref is the same ref FlowLine reads via
    // `useDarkGlobeStage()`, so callers never have to thread it manually.
    const internalOverlayRef = useRef<HTMLCanvasElement | null>(null);
    const overlayCanvasRef = externalOverlayRef ?? internalOverlayRef;

    // 每个 <FlowLine> 往这个宿主 div 里挂一块自己的叠层画布(各画各的彗星,
    // 互不 clearRect 清除)。host div 不渲染 React children,所以 FlowLine
    // append 的 DOM canvas 不会被 React 协调掉。
    const overlayHostRef = useRef<HTMLDivElement | null>(null);

    const stage = useMemo<DarkGlobeStage>(
        () => ({ config, overlayCanvasRef, overlayHostRef }),
        [config, overlayCanvasRef],
    );

    return (
        <div className="fixed inset-0 z-0">
            <Canvas
                camera={{ position: [0, 0, config.cameraZ], fov: config.cameraFov }}
                dpr={[1, 1.5]}
                gl={{ antialias: false, alpha: true }}
                // frameloop 常驻:表面点呼吸 / 地球微旋靠 clock.elapsedTime 驱动,缺省帧循环入场后会停摆 → 动画冻住(与 SceneCanvas 同)
                frameloop="always"
            >
                {/* Provider 必须放在 Canvas 内 —— R3F 默认不向 3D 子树穿透 React Context
                    (见 darkGlobeContext.ts 顶部注释)。Provider 在外就读不到。 */}
                <DarkGlobeContext.Provider value={stage}>
                    <SceneStage config={config} focusPose={focusPose} atmosphere={atmosphere} ambient={ambient}>
                        {children}
                    </SceneStage>
                </DarkGlobeContext.Provider>

                {config.bloomEnabled ? (
                    <EffectComposer multisampling={4}>
                        <Bloom
                            intensity={config.bloomIntensity}
                            luminanceThreshold={config.bloomLuminanceThreshold}
                            luminanceSmoothing={0.5}
                            mipmapBlur
                        />
                    </EffectComposer>
                ) : null}
            </Canvas>
            {/* 共享 2D 叠层画布 —— 样板 GlobeWebGL(单 Routes)用。pointer-events:none,
                城市点击仍落到 GL 画布。 */}
            <canvas ref={overlayCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
            {/* 多 FlowLine 叠层宿主 —— 每个 FlowLine 在此挂自己的 canvas(见 darkGlobeContext)。
                无 React children,React 不会动 FlowLine append 进来的 DOM。 */}
            <div ref={overlayHostRef} className="pointer-events-none absolute inset-0" />
        </div>
    );
}
