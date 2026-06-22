/**
 * 镜头聚焦目标(Phase 2)。
 *
 * 聚焦 = base pose 缓动 lerp 到一组**绝对**目标值(SceneLive 里
 * focusF:0→1,ease-out)。只有危机航线会聚焦 —— 其余事件 App 传
 * null,聚焦链路对它们无效,把电影感留给那一个焦点(spec §2/§3.3)。
 *
 * R2:聚焦取景从硬编码常量改为 App 持有的**可实时调**状态,详情页
 * 内嵌滑块面板直接改它(本地 preview 截不到 WebGL 画布,取景必须
 * 在真实大屏上手调 —— 把旋钮交给用户而不是我盲猜)。
 *
 * base pose = { fov:17, posX:-0.65, posY:-1.45, radius:2.0 }
 *   fov    ↓ = 更长焦/更近
 *   posX   右移为正(避开右侧详情面板)
 *   posY   上移为正(base 偏低,聚焦时抬高让华南海岸居中)
 *   radius 放大球体
 */
import { cities, routes } from '../mock-data';
import { AMBIENT } from './ambientConfig';

const CRISIS_ROUTE_ID = AMBIENT.crisisRouteId;

export type FocusPose = {
  /** 聚焦时相机 fov 绝对目标(base 17,越小越近)。 */
  fov: number;
  /** 聚焦时球体 group 绝对世界坐标(base -0.65 / -1.45)。 */
  posX: number;
  posY: number;
  /** 聚焦时球体绝对半径(base 2.0)。 */
  radius: number;
};

/**
 * 首次运行的取景默认值。R5 起:用户在调焦面板拖定的值会持久化到
 * localStorage(`towerx.focusPose`),刷新不丢 —— 不必再改这里。
 * 这组只是没有本地存储时的合理初值(用户真机最近一次表达的偏好)。
 */
// Phase 2: 该值是「无 settings 时的兜底」，客户实际值由 useTowerXConfig().crisis.focusPose
// 派生（如有）。loadFocusPose() / App.tsx 优先消费派生值，没有时才回落到这个 const。
export const DEFAULT_CRISIS_FOCUS: FocusPose = {
  fov: 12,
  posX: -0.94,
  posY: -1.6,
  radius: 2.41
};

/** localStorage 持久化用的 key + 读写助手(R5-1)。 */
export const FOCUS_POSE_STORAGE_KEY = 'towerx.focusPose';

type StoredRecord = Record<string, unknown>;

function readStoredRecord(key: string): StoredRecord | null {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredRecord) : null;
  } catch {
    return null;
  }
}

function hasNumberKeys(record: StoredRecord | null, keys: readonly string[]): record is Record<string, number> {
  return Boolean(record && keys.every((key) => typeof record[key] === 'number'));
}

export function loadFocusPose(): FocusPose {
  const p = readStoredRecord(FOCUS_POSE_STORAGE_KEY);
  if (hasNumberKeys(p, ['fov', 'posX', 'posY', 'radius'])) {
    return { fov: p.fov, posX: p.posX, posY: p.posY, radius: p.radius };
  }
  return DEFAULT_CRISIS_FOCUS;
}

export function saveFocusPose(p: FocusPose): void {
  try {
    localStorage.setItem(FOCUS_POSE_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** 调焦滑块范围(详情页面板用)。 */
export const FOCUS_RANGES = {
  fov: { min: 6, max: 17, step: 0.5 },
  posX: { min: -1.3, max: 0.5, step: 0.01 },
  posY: { min: -1.6, max: -0.3, step: 0.01 },
  radius: { min: 1.6, max: 2.8, step: 0.01 }
} as const;

// ───────────────────────────────────────────────────────────────────
// R13:飞机朝向校正(trim)。glb 模型出厂朝向不水平(机头朝下+微侧),
// 单凭欧拉猜值修不准、本机又截不到 WebGL 校验 —— 故做成详情内可实时
// 拖、持久化 localStorage 的旋钮(同相机取景那套已验证有效的模式),
// 用户真机拖到与地面平行即可,刷新不丢。pitch/roll/yaw 单位:弧度。
// R15:加 scale —— 换模型时大小也常要调,做成同一持久化旋钮,
// 以后换模型(朝向+大小)都不用改代码。
export type PlaneTrim = {
  pitch: number;
  roll: number;
  yaw: number;
  scale: number;
  /**
   * R15.9:机体明度 = PALETTE.blue 的乘数(0..1)。机体始终是主强调
   * 蓝同一 token(不破色板),滑块只调它有多暗。本机截不到 WebGL +
   * 密线框下颜色变化难判 → 同取景/朝向那套,做成真机实时拖+持久化。
   */
  bodyShade: number;
};

// 初值:航向 π/4、俯仰/横滚 0;scale 0.13(用户真机定档)。
// 用户真机拖动覆盖并持久化;面板「恢复默认」按钮回到这组。
// Phase 2: 该值是「无 settings 时的兜底」，客户实际值由 useTowerXConfig().crisis.planeTrim 派生。
export const DEFAULT_PLANE_TRIM: PlaneTrim = {
  pitch: 0,
  roll: 0,
  yaw: Math.PI * 0.25,
  scale: 0.13,
  bodyShade: 0.1
};

export const PLANE_TRIM_STORAGE_KEY = 'towerx.planeTrim';

export function loadPlaneTrim(): PlaneTrim {
  const p = readStoredRecord(PLANE_TRIM_STORAGE_KEY);
  if (hasNumberKeys(p, ['pitch', 'roll', 'yaw'])) {
    return {
      pitch: p.pitch,
      roll: p.roll,
      yaw: p.yaw,
      // 向后兼容旧存档(无 scale / bodyShade 时回落默认)。
      scale: typeof p.scale === 'number' ? p.scale : DEFAULT_PLANE_TRIM.scale,
      bodyShade: typeof p.bodyShade === 'number' ? p.bodyShade : DEFAULT_PLANE_TRIM.bodyShade
    };
  }
  return DEFAULT_PLANE_TRIM;
}

export function savePlaneTrim(p: PlaneTrim): void {
  try {
    localStorage.setItem(PLANE_TRIM_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* non-fatal */
  }
}

/** 飞机校正滑块范围(角度够覆盖出厂内置倾角;scale 覆盖常见模型)。 */
export const PLANE_TRIM_RANGES = {
  pitch: { min: -0.44, max: 0.44, step: 0.005 },
  roll: { min: -0.35, max: 0.35, step: 0.005 },
  yaw: { min: -Math.PI, max: Math.PI, step: 0.01 },
  scale: { min: 0.03, max: 0.3, step: 0.005 },
  bodyShade: { min: 0.05, max: 0.8, step: 0.01 }
} as const;

// ───────────────────────────────────────────────────────────────────
// R11-5b:通用机位算法 —— 普通事件也聚焦,机位不再是固定一处。
//
// 思路:危机机位(base,用户在调焦面板调定并持久化)已把 HK↔SHA
// 中点取景好。对任意航线,保持同样的 fov/radius(同一推近档),只
// 按「该航线地理中点 vs 危机航线中点」的经纬差,平移 posX/posY 把
// 它带到同一屏上位置。东亚锁定相机下,可视帽近似切平面,经纬差 ≈
// 线性映射到屏幕位移,故按比例因子换算即可。
//
// ⚠️ 比例因子/符号是对真实大屏的取景近似(本机截不到 WebGL 校准);
// 方向正确、量级合理,精调留真机。危机航线返回 base 原值不变。
const CITY_LL: Record<string, { lat: number; lng: number }> = (() => {
  const out: Record<string, { lat: number; lng: number }> = {};
  for (const c of cities) out[c.id] = { lat: c.latDeg, lng: c.lngDeg };
  return out;
})();
const ROUTE_MID: Record<string, { lat: number; lng: number }> = (() => {
  const out: Record<string, { lat: number; lng: number }> = {};
  for (const r of routes) {
    const a = CITY_LL[r.source];
    const b = CITY_LL[r.target];
    if (a && b) out[r.id] = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  }
  return out;
})();
// 每「度」对应的世界平移量(经度→x,纬度→y)。真机精调这两个值。
const FOCUS_DEG_TO_X = 0.022;
const FOCUS_DEG_TO_Y = 0.02;

/**
 * 给定 routeId + 用户调定的危机锚点 base,返回该航线的聚焦机位。
 * 危机航线原样返回 base;其余航线同 zoom、按经纬差平移。
 */
export function focusPoseForRoute(
  routeId: string,
  base: FocusPose
): FocusPose {
  const crisisMid = ROUTE_MID[CRISIS_ROUTE_ID];
  const mid = ROUTE_MID[routeId];
  if (!mid || !crisisMid || routeId === CRISIS_ROUTE_ID) return base;
  const dLng = mid.lng - crisisMid.lng;
  const dLat = mid.lat - crisisMid.lat;
  return {
    fov: base.fov,
    radius: base.radius,
    // 该点更偏东(dLng>0)→ 把球向西移(posX 减)使其回到屏上同位;
    // 更偏北(dLat>0)→ 把球向下移(posY 减)。比例可真机调。
    posX: base.posX - dLng * FOCUS_DEG_TO_X,
    posY: base.posY - dLat * FOCUS_DEG_TO_Y
  };
}

// ── 飞机运动手感(实时持久化滑块,沿用 PlaneTrim 模式)──────────────
export type PlaneMotion = {
  stormAmp: number;      // storm 抖动总振幅倍率
  stormTempo: number;    // storm 振荡频率倍率
  cruiseSway: number;    // cruise 起伏+角度总振幅倍率(0=完全水平)
  landCycleSecs: number; // landing 整周期时长(秒)
  flarePitchDeg: number; // flare 抬头度数(屁股先下幅度)
  takeoffPitchDeg: number; // 起飞抬头度数
  camFov: number;        // 场景相机 FOV(越小越长焦)
  camDist: number;       // 相机后撤距离(position.z)
  touchY: number;        // landing 触地高度(机体停在地面的世界 Y;消除离地间隙)
};

// Phase 2: 该值是「无 settings 时的兜底」，客户实际值由 useTowerXConfig().crisis.planeMotion 派生。
export const DEFAULT_PLANE_MOTION: PlaneMotion = {
  stormAmp: 1.4,
  stormTempo: 0.7,
  cruiseSway: 1.6,
  landCycleSecs: 30,
  flarePitchDeg: 16,
  takeoffPitchDeg: 16,
  camFov: 18,
  camDist: 16,
  touchY: -0.3
};

export const PLANE_MOTION_STORAGE_KEY = 'towerx.planeMotion';

export function loadPlaneMotion(): PlaneMotion {
  const p = readStoredRecord(PLANE_MOTION_STORAGE_KEY);
  if (hasNumberKeys(p, Object.keys(DEFAULT_PLANE_MOTION))) {
    return {
      stormAmp: p.stormAmp,
      stormTempo: p.stormTempo,
      cruiseSway: p.cruiseSway,
      landCycleSecs: p.landCycleSecs,
      flarePitchDeg: p.flarePitchDeg,
      takeoffPitchDeg: p.takeoffPitchDeg,
      camFov: p.camFov,
      camDist: p.camDist,
      touchY: p.touchY
    };
  }
  return { ...DEFAULT_PLANE_MOTION };
}

export function savePlaneMotion(m: PlaneMotion): void {
  try {
    localStorage.setItem(PLANE_MOTION_STORAGE_KEY, JSON.stringify(m));
  } catch {
    /* non-fatal */
  }
}

/** 飞机运动手感滑块范围。 */
export const PLANE_MOTION_RANGES = {
  stormAmp: { min: 0.3, max: 3.0, step: 0.05 },
  stormTempo: { min: 0.4, max: 2.0, step: 0.05 },
  cruiseSway: { min: 0, max: 2.5, step: 0.05 },
  landCycleSecs: { min: 10, max: 34, step: 0.5 },
  flarePitchDeg: { min: 0, max: 30, step: 0.5 },
  takeoffPitchDeg: { min: 0, max: 30, step: 0.5 },
  camFov: { min: 10, max: 80, step: 1 },
  camDist: { min: 4, max: 26, step: 0.25 },
  touchY: { min: -1.2, max: 0.5, step: 0.01 }
} as const;
