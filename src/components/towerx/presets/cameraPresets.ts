/**
 * 三种叙事密度模式（演示 / 监控 / BI）对应的相机机位预设。
 *
 * `settings.scene.preset` 选其一，运行时由 useTowerXConfig() 把预设覆盖
 * 到 defaultWebGLConfig 之上得到最终 cameraConfig。客户在 `settings.json`
 * 里也可以 override 单个字段（如只改 cameraLngDeg），preset 提供基线。
 *
 * 与三种叙事密度模式的对应关系：
 * - 'east-asia-focus'      → '演示' 模式（A），路演 / 客户接待场景
 * - 'globe-overview'       → '监控' 模式（B），7×24 监控大屏 / NOC
 * - 'background-decoration'→ 'BI' 模式（C），季度复盘 / 业务分析
 *
 * 详见 docs/architecture/towerx-template.md §4 三种叙事密度模式。
 */
import type { WebGLGlobeConfig } from '../webglConfig';

export type CameraPresetName = 'east-asia-focus' | 'globe-overview' | 'background-decoration';

export const CAMERA_PRESETS: Record<CameraPresetName, Partial<WebGLGlobeConfig>> = {
    // 演示模式默认：原 TowerX 东亚特写
    'east-asia-focus': {
        cameraZ: 4.5,
        cameraFov: 50,
        cameraLngDeg: 119,
        cameraLatDeg: 32,
        radius: 1.4,
        positionX: -0.3,
        positionY: -0.6,
    },
    // 监控模式默认：Day 2 调出的看球（从 webglConfig.slim-day2.ts.bak 迁过来）
    'globe-overview': {
        cameraZ: 8.4,
        cameraFov: 17,
        cameraLngDeg: 110,
        cameraLatDeg: 25,
        radius: 2.0,
        positionX: -0.65,
        positionY: -1.45,
    },
    // BI 模式默认：地图作装饰
    'background-decoration': {
        cameraZ: 12,
        cameraFov: 14,
        cameraLngDeg: 100,
        cameraLatDeg: 20,
        radius: 1.6,
        positionX: -1.2,
        positionY: -1.8,
    },
};
