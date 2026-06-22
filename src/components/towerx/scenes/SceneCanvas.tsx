import { Canvas, useThree, useFrame } from '@react-three/fiber';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../theme';
import { DEFAULT_PLANE_MOTION } from '../stage/focusPose';

type SceneMode = 'storm' | 'cruise' | 'landing';

type Props = {
  children: ReactNode;
  /** Optional className for the host div (sizing comes from outside). */
  className?: string;
  /** 相机视角(deg)。由持久化 PlaneMotion 驱动,长焦默认消透视畸变。 */
  camFov?: number;
  /** 相机距离。fog near/far 随此值推导,确保拉远后数据网格仍可读。 */
  camDist?: number;
  /** 场景模式。仅 landing 时启用相机推进运动(R6)。 */
  mode?: SceneMode;
  /** landing 周期(秒),用于从同一时钟算降落相位驱动镜头推进。 */
  landCycleSecs?: number;
};

// ease-in-out 正弦(与 PlaneInStorm.easeSine 同):峰值加速度最低、
// 首尾零速度,镜头推进用它最丝滑。
function easeSine(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return (1 - Math.cos(Math.PI * c)) / 2;
}

// R9:降落镜头推进系数 d(p)∈[0,1](断点对齐 R9 周期重排;loop-safe,
// p=0 与 p→1 均为 0)。镜头高/远=网格小=「高空」;低/近=网格大=
// 「贴地」—— 用网格大小透视表现高度(仅 landing,不动共享 DataGrid):
//   cruise [0,.04]              d=0   远/高基准位(网格小=高空)
//   approach/flare/td [.04,.47] 0→1   随飞机由高空降下,镜头同步推近压低
//   landed/stopped [.47,.60]    d=1   贴近停住的飞机(「已送达」拍点)
//   takeoff→level [.60,1]       1→0   随起飞爬升拉远回高,网格复小(无缝)
function landingDolly(p: number): number {
  if (p < 0.04) return 0;
  if (p < 0.47) return easeSine((p - 0.04) / (0.47 - 0.04));
  if (p < 0.6) return 1;
  return 1 - easeSine((p - 0.6) / (1 - 0.6));
}

/**
 * CameraSync — R3F child that drives the PerspectiveCamera every frame
 * from props. fov/base position come from persisted PlaneMotion; in
 * landing mode a subtle cinematic push-in is added (camera moves with
 * the plane "由远及近", holds on the stopped plane, pulls back on
 * takeoff) — loop-safe so the cycle is seamless.
 *
 * Per-frame (not useEffect): R3F's <Canvas camera> prop only seeds the
 * camera at mount; driving it each frame also makes live-slider /
 * persisted changes take effect and lets the landing dolly animate.
 */
function CameraSync({
  camFov,
  camDist,
  mode,
  landCycleSecs
}: {
  camFov: number;
  camDist: number;
  mode: SceneMode;
  landCycleSecs: number;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useFrame(({ clock }) => {
    let z = camDist;
    let y = 0.4;
    if (mode === 'landing') {
      const cyc = landCycleSecs;
      const p = (((clock.elapsedTime % cyc) + cyc) % cyc) / cyc;
      const d = landingDolly(p);
      // R7:推进 + 更明显的下沉跟拍 —— 高空时相机高、远(地面网格小、
      // 远 = 读作高空),随飞机下降相机压低拉近(网格变大 = 贴近地面),
      // 用「网格大小/高度透视」呈现降落。幅度按 camDist 比例。
      // R9:加大推进/下沉幅度,让「网格小=高空 ↔ 网格大=贴地」的
      // 高度透视更明显(d=0 高远小网格,d=1 近低大网格)。
      z = camDist - camDist * 0.42 * d;
      y = 0.7 - 0.62 * d;
    }
    if (camera.fov !== camFov) {
      camera.fov = camFov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(0, y, z);
  });
  return null;
}

/**
 * SceneCanvas — generic mini-Canvas for AlertDetail scenes.
 *
 * Pivoted to a "digital twin / data-viz" aesthetic that matches the
 * main globe's wireframe + glow look (instead of fighting endless
 * iterations against photorealism — HDRI, real cloud PNGs, sprite
 * cloud blobs all hit visible-edge / "拉跨" walls). The wireframe
 * style integrates cleanly with the rest of Tower X's visual
 * language.
 *
 * Independent R3F context — does NOT share state, store, or frame
 * loop with the main globe Canvas.
 *
 *   - dpr={1}: cap pixel ratio so retina doesn't double the work
 *   - frameloop="always": needed for plane turbulence + rain animation
 *   - alpha:true: CSS backdrop on the SCENE wrapper shows through,
 *     providing the moody violet gradient backdrop
 *   - No HDRI / Environment / heavy lighting — wireframe materials
 *     are unlit and read against the CSS gradient + scene fog
 *
 * 相机: fov / distance 来自持久化 PlaneMotion (默认长焦 fov=18,
 * camDist=16),拉长焦距令机身透视畸变消失。landing 模式下叠加
 * 丝滑镜头推进(CameraSync.landingDolly)。fog near/far 随 camDist
 * 推导,拉远后数据网格仍可读。
 */
export function SceneCanvas({
  children,
  className,
  camFov = DEFAULT_PLANE_MOTION.camFov,
  camDist = DEFAULT_PLANE_MOTION.camDist,
  mode = 'storm',
  landCycleSecs = DEFAULT_PLANE_MOTION.landCycleSecs
}: Props) {
  // 雾带后推 + 加宽:camDist 最大已扩至 26,旧 (−4/+6) 区间太窄,
  // 远焦时整景落入雾带。新区间 (−8/+12) 保持机体 + 近网格清晰,
  // 只有深远地平线才渐入雾中。
  const fogNear = Math.max(1, camDist - 8);
  const fogFar = camDist + 12;

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={1}
        frameloop="always"
        // 相机初始位由 camDist/camFov prop 播种;CameraSync 子组件在
        // Canvas 内部命令式推送后续变化(R3F camera prop 不响应更新)。
        camera={{ position: [0, 0.4, camDist], fov: camFov }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* CameraSync must be first — drives fov + position imperatively
            so live-slider / persisted PlaneMotion changes take effect. */}
        <CameraSync
          camFov={camFov}
          camDist={camDist}
          mode={mode}
          landCycleSecs={landCycleSecs}
        />
        {/* Fog near/far derived from camDist (range 0-26). Band pushed back
            (−8/+12) so far-telephoto distances keep the plane + near grid
            clear; only the deep horizon fades into fog. */}
        <fog attach="fog" args={[PALETTE.bg0, fogNear, fogFar]} />
        {/* Minimal ambient — most materials in this scene are unlit
            (lineBasicMaterial / wireframe). Ambient just keeps any
            standard-material fallback from going pure black. */}
        <ambientLight intensity={0.6} color="#aec5ff" />
        {children}
      </Canvas>
    </div>
  );
}
