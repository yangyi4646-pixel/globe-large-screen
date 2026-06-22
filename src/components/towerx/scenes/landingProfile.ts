import type { PlaneMotion } from '../stage/focusPose';

// ─────────────────────────────────────────────────────────────────────
// Landing choreography (普通物流事件).
//
// R5 结构性重构(根因:旧版进近段 y 竖直下滑 ~0.95u 远大于 16° 抬头
// 的 ~0.12u 机尾位移 ~8–10×,姿态被竖直平移淹没,4 轮调 pitch 都没用)。
// 方案:**全程贴近地面低空进近**(y 基本恒定在 yApproach=touchY+
// APPROACH_GAP,不再爬到 CRUISE_Y),由 **Z 由远及近**(变大/incoming)
// + **接地后地面急刹**(R4)承载「在降落」叙事;**慢抬头 flare→保持→
// derotate 放平** 成为近地唯一主导姿态线索(不再被 1u 下坠盖住)。
// R6:pitch 全程是**单一连续 sine 弧**(见 landingPitch),不再按相位
// 切段各自缓动(接缝速率突变=用户感到的「那一下」)。y/z 仍按 SEGS_V
// 同步分段、全部 easeSine。9 段(p 区间):
//   1 cruise        [.00,.08] 低空远处平飞(y=yApproach),机身水平
//   2 approach      [.08,.30] 不掉高度:y 恒定,Z 由远及近 + 微抬头
//   3 flare         [.30,.54] y 小幅软沉 yApproach→touchY;pitch 弧慢
//                   抬头到 +flare —— 机尾/主轮先沉先触(姿态为主导)
//   4 touchdown     [.54,.62] 贴地,pitch 弧保持 +flare(机尾沉住)
//   5 derotate      [.62,.80] pitch 弧柔和放头→0(与机尾一起水平)
//   6 rollout/stop  [.80,.86] 三点滑行减速到停住
//   7 takeoff-roll  [.86,.90] 地速急加速,机身仍水平
//   8 rotate        [.90,.96] pitch 弧慢抬头到 +takeoffPitch(先机头起)
//   9 climb         [.96,1.0] 小幅离地爬升 y→yApproach、Z 退远、pitch
//                   弧收回 0;末点几何 = cruise 起点 → 无缝衔接。
// 全程 easeSine:峰值加速度最低、接缝零速度 → 一个丝滑过程,无大加速。
//
// y 是 AnimatedPlaneGroup 的 position.y 增量;机身基准 y=-0.2、地面
// 网格 y=-1.0,故触地增量 ≈ -0.78(轮子贴近网格)。
// `groundScroll` 是**绝对累计**的地面位移(对地速按段梯形积分到当前
// p,单调不减,stopped 段斜率 0,仅在模周期回绕时归零)。plane.z 与
// 地面都由同一时钟驱动 → 不再有两套运动模型漂移 (spec A1)。
// R5:低空进近高度 = touchY + 此间隙。全程贴近地面飞,只在 flare 段
// 柔和沉这 APPROACH_GAP 到 touchY → 竖直位移变小,机尾抬头姿态成主导
// 可读线索(不再被大幅下坠淹没)。landing 分支的环境乱流 airK 也按
// 此间隙归一(进近高度满幅、贴地→0)。
export const APPROACH_GAP = 0.28;
// R10:机体停在网格之上贴近地面(网格 y=-1.0,机型基准 y=-0.2),
// 是「落在地面上」非「埋进地里」。宁可略高,绝不穿模。
// R1-F:触地高度(原模块常量 TOUCH_Y=-0.5)已提为旋钮 motion.touchY
// (默认 -0.73,持久化,范围 [-1.0,-0.3]),消除离地间隙。landingProfile
// 内部全部改用 touchY=motion.touchY;模块常量随之删除以避免死代码。
// R11:真正的 3D 进近 —— 机身始终水平(pitch=0,与地面同一 XY 平面),
// 降落由 **Z 轴**驱动:远处(FAR_Z,小)→ 滑向近处(NEAR_Z)同时
// 下沉到 touchY → 滑行减速(ROLL_Z,略近)→ 停住 → 复位回远处。
// 透视上"由远及近 + 下降 + 变大",读作真实降落,而不是原地掉高度。
const FAR_Z = -2.6;
const NEAR_Z = -0.2;
const ROLL_Z = 0.35;

function seg(p: number, a: number, b: number): number {
  return Math.max(0, Math.min(1, (p - a) / (b - a)));
}
// ease-in-out 正弦:常见缓动里**峰值加速度最低**、首尾速度为 0(无拐角
// 抽动),速度呈平滑正弦包络 → 最「丝滑」。R6 降落姿态弧专用。
function easeSine(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return (1 - Math.cos(Math.PI * c)) / 2;
}

const DEG = Math.PI / 180;
// R7:landing 满速段地速 = storm/cruise 的 GRID_SPEED(三场景初始地速
// 一致,用户反馈降落初速明显偏慢)。地速系数不再是写死常量,而是
// 每次按 `GRID_SPEED * cycle` 算 —— groundScroll 对 t 的导数在 v=1
// 段 = (1/cycle)·(GRID_SPEED·cycle) = GRID_SPEED,与 `-GRID_SPEED·t`
// 的 storm/cruise 完全相等,且与 landCycleSecs 无关(改周期不影响初速)。
// R7:从高空起降——cruise/approach 在高空(yApproach + CRUISE_ALT),
// 仅在 approach 段(flare 之前)降到 yApproach;flare 起 y 几乎恒定,
// 故抬头姿态在近地仍是主导(R5 根因不复发)。「起始在高空」靠此 +
// Z 由远及近 + 镜头推进的透视共同呈现。
const CRUISE_ALT = 1.4;

// 地速分段表:[pStart, pEnd, vStart, vEnd]。梯形积分给出 groundScroll。
// !! 不变量: SEGS_V 的断点必须与下方 landingProfile 的 if 链断点保持同步;
// 两者一旦错位,地面速度与机身姿态将静默漂移(地面跑太快/太慢)。
// R9 周期重排:起飞段太短(原 ~14% vs 降落 ~70%,用户:起飞太快)。
// 现降落机动(approach→derotate ≈ .04–.47 ≈43%)与起飞机动
// (roll→level ≈ .52–1.0 ≈48%)时长**差不多**;起飞拆成 加速→机头
// 拉升→平滑升空→平飞 四段,不再仓促。地速仍按真实物理(进近/拉平
// 高速飞行,接地后 derotate 急刹到 0,起飞 roll 从 0 急加速)。
// 10 段;断点与下方 landingProfile if 链 + landingPitch 严格一致。
const SEGS_V: Array<[number, number, number, number]> = [
  [0.0, 0.04, 1, 1], // 1 cruise 高速
  [0.04, 0.2, 1, 0.95], // 2 approach 仍在飞,几乎不减速
  [0.2, 0.34, 0.95, 0.85], // 3 flare 贴地仍快
  [0.34, 0.38, 0.85, 0.8], // 4 touchdown 主轮触地,仍快
  [0.38, 0.47, 0.8, 0], // 5 derotate 急刹(强、短)→ 0
  [0.47, 0.52, 0, 0], // 6 rollout/stopped
  [0.52, 0.66, 0, 1], // 7 takeoff-roll 从 0 急加速
  [0.66, 0.78, 1, 1], // 8 rotate 高速(机头拉升)
  [0.78, 0.93, 1, 1], // 9 climb 高速(平滑升空)
  [0.93, 1.0, 1, 1] // 10 level 高速飞离 → 平飞
];
// G_FULL:单个完整周期的梯形积分总量(Σ ((va+vb)/2)*(b-a))。
// 从 SEGS_V 推导而非硬编码,SEGS_V 改动时自动同步,不会漂移。
const G_FULL = SEGS_V.reduce((s, [a, b, va, vb]) => s + ((va + vb) / 2) * (b - a), 0);

// R6:整段俯仰是**一条连续 sine 弧**(不再按相位切成 3 段各自缓动 ——
// 那样每个接缝都有速率突变,用户感到机尾「那一下」太快)。全程 easeSine
// (峰值加速度最低、接缝处速度均为 0 → C¹ 平滑无抽动):
//   微抬到进近姿态 → 慢抬头到 +flare → 短暂保持(机尾沉、主轮触地)
//   → 柔和放头到 0(机头落、与机尾一起水平)→ 地面段 0
//   → 起飞慢抬头 +toff → 爬升收回 0。各段端点值与零速度都衔接,
//   是「一个丝滑过程」,无大加速。pitch 是纯 p 函数,与 SEGS_V 断点
//   无关(只 y/z/groundScroll 需对齐 SEGS_V)。
function landingPitch(
  p: number,
  approachPitch: number,
  flare: number,
  toff: number
): number {
  if (p < 0.04) return 0; // cruise 水平
  if (p < 0.2) return approachPitch * easeSine(seg(p, 0.04, 0.2)); // 微抬进近
  if (p < 0.34)
    return approachPitch + (flare - approachPitch) * easeSine(seg(p, 0.2, 0.34)); // 慢抬头 flare
  if (p < 0.4) return flare; // 保持(机尾沉、主轮接地)
  if (p < 0.47) return flare * (1 - easeSine(seg(p, 0.4, 0.47))); // 柔和放头→水平
  if (p < 0.66) return 0; // rollout/stop/takeoff-roll 水平
  if (p < 0.78) return toff * easeSine(seg(p, 0.66, 0.78)); // 机头拉升(rotate)
  if (p < 0.93) return toff; // 保持爬升姿态(平滑升空)
  return toff * (1 - easeSine(seg(p, 0.93, 1))); // 收平 → 平飞(末点=cruise)
}

type LandingFrame = { y: number; z: number; pitch: number; groundScroll: number };

function landingPosition({
  p,
  pitch,
  groundScroll,
  touchY,
  yApproach,
  cruiseHighY
}: {
  p: number;
  pitch: number;
  groundScroll: number;
  touchY: number;
  yApproach: number;
  cruiseHighY: number;
}): LandingFrame {
  if (p < 0.04) return { y: cruiseHighY, z: FAR_Z, pitch, groundScroll };
  if (p < 0.2) {
    const e = easeSine(seg(p, 0.04, 0.2));
    return {
      y: cruiseHighY + (yApproach - cruiseHighY) * e,
      z: FAR_Z + (NEAR_Z - FAR_Z) * e,
      pitch,
      groundScroll
    };
  }
  if (p < 0.34) {
    const k = seg(p, 0.2, 0.34);
    return {
      y: yApproach + (touchY - yApproach) * easeSine(k),
      z: NEAR_Z + (0 - NEAR_Z) * easeSine(k),
      pitch,
      groundScroll
    };
  }
  if (p < 0.38) return { y: touchY, z: 0 + 0.1 * seg(p, 0.34, 0.38), pitch, groundScroll };
  if (p < 0.47) {
    const k = seg(p, 0.38, 0.47);
    return {
      y: touchY,
      z: 0.1 + (ROLL_Z - 0.1) * easeSine(k),
      pitch,
      groundScroll
    };
  }
  if (p < 0.78) return { y: touchY, z: ROLL_Z, pitch, groundScroll };
  if (p < 0.93) {
    const k = seg(p, 0.78, 0.93);
    return {
      y: touchY + (cruiseHighY - touchY) * easeSine(k),
      z: ROLL_Z + (FAR_Z - ROLL_Z) * easeSine(k),
      pitch,
      groundScroll
    };
  }
  return { y: cruiseHighY, z: FAR_Z, pitch, groundScroll };
}

export function landingProfile(
  elapsedSec: number,
  motion: PlaneMotion
): LandingFrame {
  const cycle = motion.landCycleSecs;
  const p = (((elapsedSec % cycle) + cycle) % cycle) / cycle;
  const flare = motion.flarePitchDeg * DEG;
  const toff = motion.takeoffPitchDeg * DEG;
  // R1-F:触地高度旋钮(替代原模块常量 TOUCH_Y)。R5 起所有 y 关键值
  // (yApproach、touchY)都由 touchY 派生(yApproach=touchY+APPROACH_GAP),
  // 故 cruise(p=0)与 climb 末(p→1)同为 (yApproach,FAR_Z,0),循环
  // 连续性对任意 touchY 恒成立。
  const touchY = motion.touchY;

  // groundScroll:跨周期累计的地面位移,单调不减,wrapMod 真正无缝。
  // 原理:gs 是当前周期内 p∈[0,1) 的梯形积分(within-cycle 部分,
  // 与 p 一同在每个周期末尾归零);completedCycles 记整数完成周期数;
  // 两者之和 completedCycles*G_FULL+gs 在周期边界处连续:
  //   左极限 = N·G_FULL + G_FULL = (N+1)·G_FULL
  //   右值   = (N+1)·G_FULL + 0  = (N+1)·G_FULL  ← 相等 ✓
  // 故 groundScroll 永远单调不减;per-cycle-reset 版会在周期末尾产生
  // 非 GRID_SECTION 整数倍的突跳(地面瞬移)——累计式消除该视觉跳变。
  const completedCycles = Math.floor(elapsedSec / cycle);
  let gs = 0;
  for (const [a, b, va, vb] of SEGS_V) {
    if (p <= a) break;
    const q = Math.min(p, b);
    const f = (q - a) / (b - a);
    const vAtQ = va + (vb - va) * f;
    gs += ((va + vAtQ) / 2) * (q - a);
    if (p < b) break;
  }
  // R7:满速段地速锚定 GRID_SPEED(= storm/cruise 的 `-GRID_SPEED·t`),
  // 三场景初始地速一致且与 cycle 无关:d(groundScroll)/dt 在 v=1 段
  // = (1/cycle)·(GRID_SPEED·cycle) = GRID_SPEED。(GRID_SPEED 为模块常量,
  // 在文件后方声明;此函数仅在 useFrame 运行期调用,引用安全。)
  const groundTravel = GRID_SPEED * cycle;
  const groundScroll = (completedCycles * G_FULL + gs) * groundTravel;

  // R5/R7:近地仍是低空进近(flare 起 y 几乎恒定 → 抬头姿态主导,R5
  // 根因不复发);但 cruise/approach 在**高空** cruiseHighY,仅在
  // approach 段(flare 之前)降到 yApproach —— 既「起始在高空」又不
  // 让大幅下坠与 flare 抬头争夺可读性。
  const approachPitch = flare * 0.15;
  const yApproach = touchY + APPROACH_GAP;
  const cruiseHighY = yApproach + CRUISE_ALT;

  // pitch 全程走单一连续 sine 弧(见 landingPitch);y/z/groundScroll
  // 仍按 SEGS_V 同步的相位分段(断点不变,A1 不漂)。所有缓动统一
  // easeSine → 丝滑、无大加速、接缝零速度。
  const pitch = landingPitch(p, approachPitch, flare, toff);

  return landingPosition({ p, pitch, groundScroll, touchY, yApproach, cruiseHighY });
}


export const GRID_SECTION = 1.6;
export const GRID_SPEED = 2.4;
