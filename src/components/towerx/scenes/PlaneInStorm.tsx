import { Suspense, useRef } from 'react';
import { DEFAULT_PLANE_TRIM, DEFAULT_PLANE_MOTION, type PlaneTrim, type PlaneMotion } from '../stage/focusPose';
import { AnimatedPlaneGroup } from './AnimatedPlaneGroup';
import { GltfAirliner, LowPolyPlane, ModelErrorBoundary } from './AirlinerModel';
import { DataGrid } from './DataGrid';
import { DistantRainCurtain, LightningBolt, RainDrops } from './StormWeather';

type Props = {
  /**
   * Turbulence intensity 0..1 — drives vertical bob + roll amplitude
   * for the plane and drift amplitude for the clouds. Default 0.6 in
   * uncontrolled mode (the panel just opened it, no conductor); R4
   * SceneConductor will pass an external value to choreograph the
   * storm during the alerting → responding phases.
   */
  turbulence?: number;
  /** False pauses all animation. Useful for screenshots / R4 conductor. */
  playing?: boolean;
  /**
   * 场景模式(R12 三态,对应 feed 剧本):
   *  - 'storm'   危机事件:雨/闪电/湍流(原行为)。
   *  - 'cruise'  进行中运输:晴空水平平飞,地面全速向后掠过。
   *  - 'landing' 已闭环/即将:平稳进近下降→接地刹停。
   * cruise/landing 均无雨电(只 storm 有)。
   */
  mode?: 'storm' | 'cruise' | 'landing';
  /** R13:飞机朝向校正(弧度)。修出厂模型不水平;用户详情内拖、
   *  持久化。缺省走 DEFAULT_PLANE_TRIM。 */
  trim?: PlaneTrim;
  /** planeMotion:飞机动画参数。后续任务消费,此次仅透传。 */
  motion?: PlaneMotion;
  /** P-B:人按核按钮后置 true → 风暴平息、飞机冲出(storm 专属)。
   *  默认 false = 原 storm 行为完全不变(零回归);只在 storm 分支
   *  叠 (1-calm) 阻尼 + 雨电淡出,不改 R1–R9 运动结构。 */
  resolving?: boolean;
};

/**
 * PlaneInStorm — airliner drifting through stormy cloud cover.
 *
 * Tries to load `/models/airplane.glb` (Sketchfab Boeing 737 LOT
 * livery in the current build). Falls back to a low-poly hand-built
 * plane via ErrorBoundary if the model is missing or fails.
 *
 * Animation:
 *   - Plane: vertical bob + Z roll + subtle X pitch driven by stacked
 *     sin oscillators of incommensurate frequencies (no obvious
 *     loop point).
 *   - Clouds: each drifts on its own X/Y phase + rotates slowly so
 *     overlapping silhouettes feel organic.
 *
 * Commit 5 will add lightning flashes (ambient intensity spikes).
 */
export function PlaneInStorm({
  turbulence = 0.6,
  playing = true,
  mode = 'storm',
  trim = DEFAULT_PLANE_TRIM,
  motion = DEFAULT_PLANE_MOTION,
  resolving = false
}: Props = {}) {
  const storm = mode === 'storm';
  // P-B:风暴平息度 0→1,单一写者 = AnimatedPlaneGroup 每帧缓动;
  // RainDrops/LightningBolt 只读,据此淡出雨电。
  const calmRef = useRef(0);
  // 模型基础朝向 = 校正值(pitch=X, yaw=Y, roll=Z)。
  const planeRot: [number, number, number] = [trim.pitch, trim.yaw, trim.roll];
  return (
    <group>
      <AnimatedPlaneGroup
        turbulence={turbulence}
        playing={playing}
        mode={mode}
        yaw={trim.yaw}
        motion={motion}
        resolving={resolving}
        calmRef={calmRef}
      >
        <ModelErrorBoundary
          fallback={<LowPolyPlane rotation={planeRot} scale={trim.scale} />}
        >
          <Suspense
            fallback={<LowPolyPlane rotation={planeRot} scale={trim.scale} />}
          >
            <GltfAirliner
              rotation={planeRot}
              scale={trim.scale}
              bodyShade={trim.bodyShade}
            />
          </Suspense>
        </ModelErrorBoundary>
      </AnimatedPlaneGroup>
      <DataGrid mode={mode} motion={motion} />
      {/* 普通物流事件:晴空平稳降落 —— 不渲染雨幕/闪电/暴雨。 */}
      <StormEffects storm={storm} playing={playing} turbulence={turbulence} calmRef={calmRef} />
    </group>
  );
}

function StormEffects({
  storm,
  playing,
  turbulence,
  calmRef
}: {
  storm: boolean;
  playing: boolean;
  turbulence: number;
  calmRef: { current: number };
}) {
  if (!storm) return null;
  return (
    <>
      <DistantRainCurtain />
      <LightningBolt playing={playing} intensity={turbulence} calmRef={calmRef} />
      <RainDrops playing={playing} intensity={turbulence} calmRef={calmRef} />
    </>
  );
}
