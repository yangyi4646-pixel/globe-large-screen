import { Component, useEffect, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_PLANE_TRIM } from '../stage/focusPose';
import { PALETTE } from '../theme';

// ─────────────────────────────────────────────────────────────────────
// Real-model path

const AIRPLANE_PATH = `${import.meta.env.BASE_URL}models/airplane.glb`;

// R15:模型大小不再硬编码。换模型时大小常需重调,已并入持久化的
// PlaneTrim.scale(详情调焦面板可拖,刷新不丢)。
// R13:模型出厂朝向不水平(机头朝下+微侧),靠猜欧拉修不准。基础
// 朝向改由用户在详情内实时拖、持久化的 PlaneTrim 提供(见
// stage/focusPose.ts、AlertDetail 调焦面板)。此处不再硬编码。
// y=-0.2 sits the plane slightly below the level camera (y=0.4) so
// the silhouette reads as airborne above the data grid (y=-1.0)
// without floating up to the horizon line.
const AIRPLANE_POSITION: [number, number, number] = [0, -0.2, 0];

// R14:线框模型只构建一次,按源 scene 缓存。进详情不再重算(去卡顿)。
const WIREFRAME_CACHE = new WeakMap<THREE.Object3D, THREE.Object3D>();

function buildWireframe(scene: THREE.Object3D): THREE.Object3D {
  const cached = WIREFRAME_CACHE.get(scene);
  if (cached) return cached;
  const cloned = scene.clone(true);
  // R15.3:恢复 R14 之前的「3 层描边 + 8° 细线框」全息结构 —— 半透/
  // 不透明实体单独看都不对(发黑/骨架/发虚/发死),问题不在机体本身
  // 而在描边太稀(R14 为 15.6MB 高模降到 30°/2 层)。现模型 2.76MB
  // 已轻 ~5.6×,且 R14 的真正去卡顿手段是「WeakMap 只构建一次」缓存
  // (保留),与线密度无关 —— 故可放心还原密线框,卡顿不会回来。
  //   实体:R15.6 改用色板 token —— 此前 #2c4f8a 是临场拍的杂色,
  //   不在 theme.ts 七色 token 里、页面别处也没有(theme.ts 明确要求
  //   3D 材质色引用 token 而非另造 hex)。机体取**主强调蓝
  //   PALETTE.blue**(球体大气/光晕/径向背景同色 → 飞机属于同一世界),
  //   再 ×0.2 压暗(R15.8 用户偏深,0.5→0.32→0.2):仍是同一 token、
  //   只是更暗,读作机体而非发亮强调线;仍比 bg0/1/2 深紫底亮、分层。
  //   ⚠️ 改这系数后须**硬刷新**(Cmd+Shift+R):buildWireframe 结果被
  //   useMemo([scene]) + 模块级 WeakMap 缓存(R14 去卡顿),纯改色不
  //   动 scene 依赖、组件不重挂,Vite HMR 会留旧线框 → 看似没变。
  //   3 层**同址**叠加(R15.5 起不再缩放副本,见下方注释):
  //     core  : fg(#eef4ff)近白 —— 锐线
  //     midHalo: blue 主辉光
  //     outerHalo: violet 柔外晕(同球体大气/页面径向背景的蓝→紫)
  // R15.9:消 X 光感。机模是**单层薄壳**,默认 side:FrontSide 会剔除
  // 远半圆(背面三角)→ 那侧不写深度 → 远侧线框无遮挡透出来 = 一团
  // 透视线球。改 DoubleSide:远壳也渲染并写深度,近壳深度把背后所有
  // 远侧线挡掉 → 读作实体机 + 仅正面表面线。polygonOffset 把实体往
  // 后推一丢丢,使**同址近侧线**稳过深度测试不被实体盖住(经典
  // "实体上描线框"配方),远侧线仍被实体挡住。
  // 颜色:PALETTE.blue × bodyShade,初值占位,GltfAirliner 按实时
  // trim.bodyShade mutate 此材质(共享实例)→ 即时、不重建、绕开
  // useMemo/HMR 缓存。bodyMat 挂到 userData 供组件取用。
  const bodyMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(PALETTE.blue).multiplyScalar(
      DEFAULT_PLANE_TRIM.bodyShade
    ),
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  const coreMat = new THREE.LineBasicMaterial({
    color: PALETTE.fg,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const midHaloMat = new THREE.LineBasicMaterial({
    color: PALETTE.blue,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const outerHaloMat = new THREE.LineBasicMaterial({
    color: PALETTE.violet,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  cloned.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.material = bodyMat;
      // 8° 阈值:抓更多边 → 细密线框(轻模型可承受;构建一次缓存)。
      const edges = new THREE.EdgesGeometry(obj.geometry, 8);
      // R15.5:三层**完全重合**(不再 scale.multiplyScalar 放大副本)。
      // 旧做法靠把 halo 副本整体放大 0.8%/1.8% 制造"粗线+辉光",但
      // 放大是绕模型原点的 → 偏移量 ∝ 离原点距离,机鼻/翼尖处分裂成
      // 肉眼可见的平行重影(用户:"描线发虚 / 几层没对齐"),且偏移随
      // SIZE 变。改为三层同址叠加:fg/blue/violet 经 Additive 混色
      // 出一条清晰、略带蓝紫芯辉的锐线,任何 SIZE 都精确对齐、不发虚。
      obj.add(new THREE.LineSegments(edges, coreMat));
      obj.add(new THREE.LineSegments(edges, midHaloMat));
      obj.add(new THREE.LineSegments(edges, outerHaloMat));
    }
  });
  // 共享 bodyMat 实例挂到 userData,供 GltfAirliner 按实时 bodyShade
  // 直接 mutate .color(所有机体网格共用此一实例,改一处即全改)。
  cloned.userData.bodyMat = bodyMat;
  WIREFRAME_CACHE.set(scene, cloned);
  return cloned;
}

export function GltfAirliner({
  rotation,
  scale,
  bodyShade
}: {
  rotation: [number, number, number];
  scale: number;
  bodyShade: number;
}) {
  const { scene } = useGLTF(AIRPLANE_PATH);
  // R14:用模块级缓存,处理结果只构建一次、每次开详情直接复用 ——
  // 之前每次进详情都对 15.6MB 高模重新 clone + 逐网格 EdgesGeometry
  // + 3 层描边复制(主线程跑),所以进详情卡顿。useGLTF 的 scene 引用
  // 稳定,可作 WeakMap key。
  const wireframed = useMemo(() => buildWireframe(scene), [scene]);
  // R15.9:机体明度实时跟随 trim.bodyShade —— 直接 mutate 缓存里
  // 共享的 bodyMat.color(= PALETTE.blue × bodyShade)。不重建线框,
  // 故绕开 useMemo([scene]) / Vite HMR 的旧线框缓存,真机拖即时见。
  useEffect(() => {
    const mat = wireframed.userData.bodyMat as
      | THREE.MeshBasicMaterial
      | undefined;
    if (mat) mat.color.set(PALETTE.blue).multiplyScalar(bodyShade);
  }, [wireframed, bodyShade]);
  return (
    <primitive
      object={wireframed}
      scale={scale}
      rotation={rotation}
      position={AIRPLANE_POSITION}
    />
  );
}



// Preload at module evaluation — fires the network request the first
// time this module is imported (App startup), so by the time the user
// clicks an alert and AlertDetail mounts, the glTF is already cached.
// Eliminates the brief LowPolyPlane flash that the Suspense fallback
// produced when the model loaded on demand.
useGLTF.preload(AIRPLANE_PATH);

// ErrorBoundary catches the throw that useGLTF does on 404/parse error.
// Suspense handles loading-state promises; errors need this — without
// it a missing model file would white-screen the panel.
export class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      console.info(
        `[PlaneInStorm] glTF load failed; using low-poly fallback. Drop a glb at ${AIRPLANE_PATH} to upgrade. (${error.message})`
      );
    }
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Fallback hand-built plane

export function LowPolyPlane({
  rotation = [0, Math.PI * 0.25, 0],
  scale = 0.12
}: {
  rotation?: [number, number, number];
  scale?: number;
}) {
  return (
    <group rotation={rotation} scale={scale} position={[0, 0, 0]}>
      {/* Fuselage */}
      <mesh>
        <boxGeometry args={[0.28, 0.22, 1.4]} />
        <meshStandardMaterial color="#dde6ff" metalness={0.35} roughness={0.4} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 0.4, 16]} />
        <meshStandardMaterial color="#dde6ff" metalness={0.35} roughness={0.4} />
      </mesh>
      {/* Tail cone */}
      <mesh position={[0, 0, -0.78]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.14, 0.18, 12]} />
        <meshStandardMaterial color="#dde6ff" metalness={0.35} roughness={0.4} />
      </mesh>
      {/* Main wings */}
      <mesh position={[0, -0.04, 0.05]}>
        <boxGeometry args={[2.1, 0.05, 0.42]} />
        <meshStandardMaterial color="#aec5ff" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* Vertical stabilizer */}
      <mesh position={[0, 0.22, -0.55]}>
        <boxGeometry args={[0.05, 0.32, 0.32]} />
        <meshStandardMaterial color="#aec5ff" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* Horizontal stabilizers */}
      <mesh position={[0, 0.02, -0.6]}>
        <boxGeometry args={[0.7, 0.04, 0.22]} />
        <meshStandardMaterial color="#aec5ff" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* Engine pods */}
      <mesh position={[-0.62, -0.12, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.32, 12]} />
        <meshStandardMaterial color="#6b7aa6" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0.62, -0.12, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.32, 12]} />
        <meshStandardMaterial color="#6b7aa6" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
}
