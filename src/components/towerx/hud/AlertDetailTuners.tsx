import {
  FOCUS_RANGES,
  PLANE_TRIM_RANGES,
  DEFAULT_PLANE_TRIM,
  DEFAULT_CRISIS_FOCUS,
  DEFAULT_PLANE_MOTION,
  PLANE_MOTION_RANGES,
  type FocusPose,
  type PlaneTrim,
  type PlaneMotion
} from '../stage/focusPose';

/**
 * FocusTuner — 详情内的镜头取景调试面板(R2#5)。本地 preview 截不到
 * WebGL 球画布,取景必须在真实大屏手调,所以把 4 个旋钮直接做成
 * 实时滑块,改动经 App state 即时进 GlobeWebGL 的聚焦 lerp。
 */
export function FocusTuner({
  pose,
  onChange
}: {
  pose: FocusPose;
  onChange: (p: FocusPose) => void;
}) {
  const rows: { key: keyof FocusPose; label: string }[] = [
    { key: 'fov', label: 'FOV' },
    { key: 'posX', label: 'POS X' },
    { key: 'posY', label: 'POS Y' },
    { key: 'radius', label: 'RADIUS' }
  ];
  return (
    <div
      className="mx-3 flex flex-col gap-2.5 rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)'
      }}
    >
      <div
        className="text-meta-ghost flex items-center justify-between"
        style={{ fontSize: '10px', letterSpacing: '0.24em' }}
      >
        <span>镜头取景 · 实时</span>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_CRISIS_FOCUS)}
          className="rounded-full px-2 py-0.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          style={{ fontSize: '9px', letterSpacing: '0.16em' }}
        >
          恢复默认
        </button>
      </div>
      {rows.map(({ key, label }) => {
        const r = FOCUS_RANGES[key];
        return (
          <label key={key} className="flex items-center gap-3">
            <span
              className="text-meta-ghost w-14 shrink-0"
              style={{ fontSize: '11px', letterSpacing: '0.16em' }}
            >
              {label}
            </span>
            <input
              type="range"
              className="globe-slider flex-1"
              min={r.min}
              max={r.max}
              step={r.step}
              value={pose[key]}
              onChange={(e) =>
                onChange({ ...pose, [key]: Number(e.target.value) })
              }
            />
            <span
              className="w-12 shrink-0 text-right tabular-nums text-white/75"
              style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
            >
              {pose[key].toFixed(2)}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * PlaneTrimTuner — 详情内的飞机朝向校正面板(R13)。模型出厂朝向
 * 不水平,猜值修不准、本机截不到 WebGL —— 用户在真机拖 pitch/roll/
 * yaw 直到机身与地面平行,持久化 localStorage,刷新不丢。读数显示
 * 为角度(°)更直观;内部存弧度。
 */
export function PlaneTrimTuner({
  trim,
  onChange
}: {
  trim: PlaneTrim;
  onChange: (p: PlaneTrim) => void;
}) {
  const rows: { key: keyof PlaneTrim; label: string }[] = [
    { key: 'pitch', label: 'PITCH 俯仰' },
    { key: 'roll', label: 'ROLL 横滚' },
    { key: 'yaw', label: 'YAW 航向' },
    { key: 'scale', label: 'SIZE 大小' },
    { key: 'bodyShade', label: 'BODY 机体' }
  ];
  return (
    <div
      className="mx-3 flex flex-col gap-2.5 rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)'
      }}
    >
      <div
        className="text-meta-ghost flex items-center justify-between"
        style={{ fontSize: '10px', letterSpacing: '0.24em' }}
      >
        <span>飞机朝向校正 · 实时</span>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_PLANE_TRIM)}
          className="rounded-full px-2 py-0.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          style={{ fontSize: '9px', letterSpacing: '0.16em' }}
        >
          恢复默认
        </button>
      </div>
      {rows.map(({ key, label }) => {
        const r = PLANE_TRIM_RANGES[key];
        return (
          <label key={key} className="flex items-center gap-3">
            <span
              className="text-meta-ghost w-20 shrink-0"
              style={{ fontSize: '10px', letterSpacing: '0.12em' }}
            >
              {label}
            </span>
            <input
              type="range"
              className="globe-slider flex-1"
              min={r.min}
              max={r.max}
              step={r.step}
              value={trim[key]}
              onChange={(e) =>
                onChange({ ...trim, [key]: Number(e.target.value) })
              }
            />
            <span
              className="w-12 shrink-0 text-right tabular-nums text-white/75"
              style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
            >
              {key === 'scale'
                ? trim[key].toFixed(3)
                : key === 'bodyShade'
                  ? trim[key].toFixed(2)
                  : `${Math.round((trim[key] * 180) / Math.PI)}°`}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function fmtMotion(k: keyof PlaneMotion, v: number): string {
  if (k === 'flarePitchDeg' || k === 'takeoffPitchDeg') return `${Math.round(v)}°`;
  if (k === 'landCycleSecs') return `${v.toFixed(1)}s`;
  if (k === 'camFov') return `${Math.round(v)}`;
  if (k === 'camDist') return `${v.toFixed(2)}`;
  if (k === 'touchY') return `${v.toFixed(2)}`;
  return `×${v.toFixed(2)}`; // stormAmp / stormTempo / cruiseSway
}

const PLANE_MOTION_LABELS: Record<keyof PlaneMotion, string> = {
  stormAmp: 'STORM 振幅',
  stormTempo: 'STORM 节奏',
  cruiseSway: 'CRUISE 起伏',
  landCycleSecs: 'LAND 周期',
  flarePitchDeg: 'FLARE 抬头',
  takeoffPitchDeg: '起飞抬头',
  camFov: '相机 FOV',
  camDist: '相机距离',
  touchY: 'LAND 触地 Y'
};

/**
 * PlaneMotionTuner — 飞机动画手感调试面板(Task 7)。风暴振幅/节奏、
 * 巡航起伏、降落周期、抬头角度、相机 FOV/距离 8 个旋钮实时调整并持久
 * 化到 localStorage(`towerx.planeMotion`),沿用 PlaneTrimTuner 模式。
 */
export function PlaneMotionTuner({
  value,
  onChange
}: {
  value: PlaneMotion;
  onChange: (m: PlaneMotion) => void;
}) {
  return (
    <div
      className="mx-3 flex flex-col gap-2.5 rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)'
      }}
    >
      <div
        className="text-meta-ghost flex items-center justify-between"
        style={{ fontSize: '10px', letterSpacing: '0.24em' }}
      >
        <span>飞机动画手感 · 实时</span>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_PLANE_MOTION)}
          className="rounded-full px-2 py-0.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          style={{ fontSize: '9px', letterSpacing: '0.16em' }}
        >
          恢复默认
        </button>
      </div>
      {(Object.keys(PLANE_MOTION_RANGES) as (keyof PlaneMotion)[]).map((key) => {
        const r = PLANE_MOTION_RANGES[key];
        return (
          <label key={key} className="flex items-center gap-3">
            <span
              className="text-meta-ghost w-20 shrink-0"
              style={{ fontSize: '10px', letterSpacing: '0.12em' }}
            >
              {PLANE_MOTION_LABELS[key]}
            </span>
            <input
              type="range"
              className="globe-slider flex-1"
              min={r.min}
              max={r.max}
              step={r.step}
              value={value[key]}
              onChange={(e) =>
                onChange({ ...value, [key]: Number(e.target.value) })
              }
            />
            <span
              className="w-12 shrink-0 text-right tabular-nums text-white/75"
              style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
            >
              {fmtMotion(key, value[key])}
            </span>
          </label>
        );
      })}
    </div>
  );
}
