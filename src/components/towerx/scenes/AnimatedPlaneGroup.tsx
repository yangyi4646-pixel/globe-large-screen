import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlaneMotion } from '../stage/focusPose';
import { effectiveTurbulence } from './stormDirector';
import { APPROACH_GAP, landingProfile } from './landingProfile';

const CALM_RATE = 1.1; // 每秒趋近速率(≈0.9s 基本平息)
const CALM_Y = 0.34; // calm=1 时机身停的晴空巡航高(同 cruise 基高)

// ─────────────────────────────────────────────────────────────────────
// Plane animation — turbulence delta layer

const _qPitch = new THREE.Quaternion();
const _qRoll = new THREE.Quaternion();
const _axLat = new THREE.Vector3();
const _axNose = new THREE.Vector3();

// 绕机体轴施加俯仰 pitch + 横滚 roll(弧度),写入 group.quaternion。
// yaw = trim.yaw(机头在世界 XZ 的朝向)。绕机体轴而非世界轴 ——
// 故 45° 偏航下抬头是干净抬头、不串成横滚(spec B1)。
// pitch 约定:正值 = 机头上仰。取反原因:Rodrigues 证明绕 _axLat 正转 +θ
// 使机头世界 Y 分量 = −sinθ(即下压),故此处传 −pitch 使符号与调用约定一致。
function applyBodyRotation(
  g: THREE.Object3D,
  yaw: number,
  pitch: number,
  roll: number
) {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  _axLat.set(c, 0, -s);
  _axNose.set(s, 0, c);
  _qPitch.setFromAxisAngle(_axLat, -pitch);
  _qRoll.setFromAxisAngle(_axNose, roll);
  // 组合 qPitch*qRoll = 外旋(先横滚后俯仰);小角(<~5°)耦合误差 <0.1°,
  // 当前三模式均满足。若未来同时大俯仰+大横滚,需改内旋顺序。
  g.quaternion.multiplyQuaternions(_qPitch, _qRoll);
}

export function AnimatedPlaneGroup({
  children,
  turbulence,
  playing,
  mode,
  yaw,
  motion,
  resolving,
  calmRef
}: {
  children: ReactNode;
  turbulence: number;
  playing: boolean;
  mode: 'storm' | 'cruise' | 'landing';
  yaw: number;
  motion: PlaneMotion;
  resolving: boolean;
  calmRef: { current: number };
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!ref.current || !playing) return;
    const t = state.clock.elapsedTime;
    // P-B:单一写者 —— 每帧把 calm 朝 resolving?1:0 缓动(此组件
    // 任何 mode 都跑,RainDrops/LightningBolt 只读 calmRef 淡出雨电)。
    calmRef.current +=
      ((resolving ? 1 : 0) - calmRef.current) *
      Math.min(1, delta * CALM_RATE);
    const calm = calmRef.current;

    if (mode === 'cruise') {
      // 进行中运输:正常巡航 —— 缓慢起伏(heave) + 轻高频抖动(jit) + 稍大俯仰/侧倾;
      // 三者均 ×cruiseSway,故 cruiseSway=0 → 完全水平、无起伏(spec §4.2)。
      const S = motion.cruiseSway;
      const jit = Math.sin(t * 2.3) * 0.012 + Math.sin(t * 3.7 + 0.5) * 0.008;
      const bob =
        ((Math.sin(t * 0.55) * 0.045 + Math.sin(t * 0.33 + 1.1) * 0.028) + jit) * S;
      ref.current.position.y = 0.34 + bob;
      ref.current.position.z = 0;
      const cPitch =
        (Math.sin(t * 0.21) * 0.6 + Math.sin(t * 0.13 + 0.7) * 0.4) * 0.026 * S;
      const cRoll =
        (Math.sin(t * 0.17 + 1.3) * 0.6 + Math.sin(t * 0.11) * 0.4) * 0.030 * S;
      applyBodyRotation(ref.current, yaw, cPitch, cRoll);
      return;
    }

    if (mode === 'landing') {
      // 普通物流:被编排的 9 段低空进近→接地→停住→真起飞(见 landingProfile)。
      const lp = landingProfile(t, motion);
      // R1-F:在编排层之外叠加一层轻微「环境乱流」——用户反馈「太平稳了,
      // 正常飞行都不会这么平稳」。此层与编排(lp)相互独立,且按离地高度
      // 自动归零:进近高度(y→yApproach)满幅,接近/停在地面(y→touchY)→0,
      // 故「停在地面」仍读作完全停住、爬升时乱流再次回来。
      // R5:按低空进近间隙归一(进近高度满幅、贴地 y→touchY 时 0,
      // 故停在地面仍读作完全静止)。
      const airK = Math.min(1, Math.max(0,
        (lp.y - motion.touchY) / APPROACH_GAP));
      const aBob = (Math.sin(t * 1.3) * 0.5 + Math.sin(t * 2.1 + 0.7) * 0.5) * 0.025 * airK;
      const aPit = Math.sin(t * 1.7 + 0.3) * 0.018 * airK;
      const aRol = Math.sin(t * 1.1 + 1.2) * 0.022 * airK;
      ref.current.position.y = lp.y + aBob;
      ref.current.position.z = lp.z; // R11:Z 轴进近(由远及近)
      applyBodyRotation(ref.current, yaw, lp.pitch + aPit, aRol);
      return;
    }

    // storm:快速抖动 + 慢速大起伏 + 慢速侧倾阵风 = 真实乱流(非节拍器摆动)。
    // 快抖(三个不可公度频率)叠加:
    //   bobY  振幅基准 0.14;rollZ 振幅基准 0.09;pitchX 振幅 0.05。
    // 慢速叠加(R1-D):
    //   慢起伏 ~28s/T 周期 ×0.20 → 穿越上升/下沉气流的长波浮沉;
    //   慢侧倾 ~35s/T 周期 ×0.16 → 偶发压坡阵风叠在快抖上,不是匀速摆。
    // 全部 ×stormAmp / ×stormTempo / ×dyn → 用户旋钮与风暴导演循环仍有效。
    const dyn = effectiveTurbulence(t, turbulence);
    const T = motion.stormTempo;
    const A = motion.stormAmp;
    let bobY =
      (Math.sin(t * 1.7 * T) * 0.5 +
        Math.sin(t * 3.1 * T) * 0.3 +
        Math.sin(t * 5.7 * T) * 0.2) *
      0.14 * dyn * A;
    // 慢速大幅起伏(周期 ~28s/T):像穿过上升下沉气流,而非原地抖
    bobY += Math.sin(t * 0.22 * T + 0.6) * 0.20 * dyn * A;
    let rollZ =
      (Math.sin(t * 1.3 * T + 0.5) * 0.5 + Math.sin(t * 2.7 * T + 1.2) * 0.3) *
      0.09 * dyn * A;
    // 慢速侧倾阵风(周期 ~35s/T):叠在快抖上 → 偶发压坡而非匀速摆
    rollZ += Math.sin(t * 0.18 * T + 2.1) * 0.16 * dyn * A;
    const pitchX = Math.sin(t * 2.1 * T) * 0.05 * dyn * A;
    // P-B:R1–R9 storm 式子原样不动;仅末端叠 (1-calm) 阻尼 + 基高
    // lerp 到晴空巡航高 → calm=1(已实施)时机身水平、静、冲出风暴。
    // calm=0(默认/未 resolving)→ k=1,完全等价原 storm,零回归。
    const k = 1 - calm;
    ref.current.position.y = bobY * k + CALM_Y * calm;
    ref.current.position.z = 0; // storm 不用 Z 进近,复位防残留
    applyBodyRotation(ref.current, yaw, pitchX * k, rollZ * k);
  });
  return <group ref={ref}>{children}</group>;
}
