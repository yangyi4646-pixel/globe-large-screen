# @guandata/superapp-globe(代号 TowerX)

观远 SuperApp 框架内的 **3D 地球美学层 npm 包**。给 SuperApp 用户做 3D 地球
可视化时的"暗夜美学 + 玻璃 HUD + 流光连线 + bloom + 粒子"视觉资产。

> **不是大屏成品模板。** 是给客户用 props 注入业务数据的"美学层组件库"。
> 数据层用 deck.gl / ECharts GL / 客户自己;本包只负责"长得好看"。
> 详见 [架构文档](docs/architecture/towerx-template.md)。

## 安装

```bash
# 从 GitHub 安装(装最新默认分支)
npm install github:yangyi4646-pixel/globe-large-screen
# 锁定版本(推荐;需仓库已打对应 tag,如 v0.1.0)
npm install github:yangyi4646-pixel/globe-large-screen#v0.1.0
# 等价完整写法:
# npm install git+https://github.com/yangyi4646-pixel/globe-large-screen.git
# 若之后发布到 npm 远端:npm install @guandata/superapp-globe
```

> 用 `git` 方式安装时,npm 会自动跑本包的 `prepare`(`tsup` 构建 `dist/`),
> 消费侧无需手动 build;但安装环境需能联网拉取并完成构建。

peer 依赖(消费者项目需自带):

```bash
npm install react react-dom @react-three/fiber @react-three/drei @react-three/postprocessing three
```

## 三步上手(开箱看到样板)

```bash
# 1. 安装(见上)
# 2. 拷贝配置模板到你的 public/
npx superapp-globe-init
```

```tsx
// 3. 在 App.tsx 渲染一站式样板
import { SuperAppGlobeApp } from '@guandata/superapp-globe';
import '@guandata/superapp-globe/styles';

export default function App() {
    return <SuperAppGlobeApp />;
}
```

> 旧名 `TowerXApp` 作为 `@deprecated` 别名仍可 import(指向 `SuperAppGlobeApp`),
> 不破坏既有代码;新代码请用 `SuperAppGlobeApp`。

跑 `npm run dev`,首屏应见**暗黑底默认大屏**(东亚相机 + 玻璃 HUD + 流光连线
+ bloom 后处理)作为样板。

## 三种使用形态

### 形态 A:一站式样板(快速预览,推荐起步)

`<SuperAppGlobeApp />` 一站式组件,5 秒看到完整美学。改 `settings.json` 调品牌色 /
布局 / 文案。**适合销售演示或快速 PoC**。

### 形态 B:用原语组件自由组装(推荐生产)

```tsx
import {
    DarkGlobe,         // 暗夜地球容器(画布 + 地球本体 + 大气 + bloom + 入场 + 坐标系)
    ParticleHalo,      // 大气环境层(halo 辉光 + 粒子尘埃,可开关 / 微调)
    FlowLine,          // 流光连线(style: cinematic | pulse | disruption | calm)
    CityGlow,          // 城市点光(halo + 核心点 + 标签)
    LiquidGlassPanel,  // 玻璃 HUD 容器
} from '@guandata/superapp-globe';
import '@guandata/superapp-globe/styles';

export default function App() {
    return (
        <>
            <DarkGlobe density="dense" camera={{ lng: 121, lat: 31 }}>
                {/* 批量传点 / 弧;也支持单点 position / 单线 from-to 便捷形式 */}
                <CityGlow points={[
                    { id: 'sh', position: [121, 31], label: '上海' },
                    { id: 'hk', position: [114, 22], label: '香港' },
                ]} />
                <FlowLine from={[114, 22]} to={[121, 31]} style="cinematic" />
                {/* disruption = 品红危机视觉 */}
                <FlowLine arcs={[{ id: 'a', from: [114, 22], to: [121, 31] }]} style="disruption" />
            </DarkGlobe>

            <LiquidGlassPanel as="aside" style={{ position: 'fixed', top: 24, left: 24 }}>
                {/* 你自己的标题 / 数据 / 指标卡 */}
            </LiquidGlassPanel>
        </>
    );
}
```

> **大气是环境层,不随地球自转。** `DarkGlobe` 默认内置 `ParticleHalo`(halo 辉光
> + 粒子,`atmosphere` 默认 true)。要换色 / 调密度 / 单开某层,设
> `atmosphere={false}` 关掉内置,再通过 `ambient` slot 注入自定义版本——
> **不要放进 `children`**(children 在地球坐标系内会被卷进自转):
>
> ```tsx
> <DarkGlobe atmosphere={false} ambient={<ParticleHalo color="#7cc6ff" density="immersive" />}>
>     <CityGlow points={[...]} />
> </DarkGlobe>
> ```

**关键**:数据(`from / to / position` 等)是你传的,业务语义是你定义的。
包负责把它们渲染成"好看的 3D 地球"。`CityGlow` / `FlowLine` 必须作为
`<DarkGlobe>` 的 children(共享地球坐标系 + 2D 流光叠层)。

### 形态 C:跟 deck.gl 共存

包**不支持**跟 deck.gl 同屏互操作(共享 WebGL context / 双 canvas 叠层等)。
你想这么干,自己编程解决。详见 [架构文档 §0.3 边界哲学](docs/architecture/towerx-template.md#03-包的边界哲学)。

## 客户化范围

**可以改**:品牌色 / 视觉密度 / 相机机位 / 布局(改 `public/settings.json`,参见 `public/settings.schema.json`)、原语组件 props、用 `<LiquidGlassPanel />` 自由拼 HUD。

**不能改(硬边界)**:视觉范式必须暗黑、主视觉必须 3D 地球、HUD 必须玻璃 + 大字号 hero。要别的请新建包。

详见 [架构文档 §2 美学边界](docs/architecture/towerx-template.md#2-美学边界3-条不能动要动新建包)。

## 3D 模型资产(可选)

包内**不带** 3D 模型资产(飞机 / 船 / 卡车等 glb)。需要时按
[`docs/sop/3d-asset-sourcing.md`](docs/sop/3d-asset-sourcing.md) 自备,放到
你的 `public/models/`。**缺失有兜底,不影响大屏运行**(useGLTF + ErrorBoundary)。

## 视觉密度预设

`settings.density` 切换三档视觉密度:

| 密度 | 适合场景 |
|---|---|
| `sparse` | 地球作背景 / KPI dashboard / 季度复盘 |
| `dense`(默认)| 路演 / 客户接待 / 媒体展示 |
| `immersive` | NOC 监控大屏 / 应急指挥中心 |

详见 [架构文档 §4](docs/architecture/towerx-template.md#4-视觉密度预设配置维度不是边界)。

## 跟其他 3D 地球库的分工

包**只做美学层**(暗夜地球 + bloom + 玻璃 HUD + 流光连线 + 粒子),数据层用 deck.gl / Cesium / ECharts GL / 客户自己。两者是**分工不是竞争**。

详见 [架构文档 §0.2](docs/architecture/towerx-template.md#02-跟其他-3d-地球库的分工)。

## 完整文档

- [架构定位 / 商业角色 / 美学边界 / 矩阵](docs/architecture/towerx-template.md)
- [客户开发执行 SOP](docs/sop/build-with-towerx.md)
- [3D 资产采购 SOP](docs/sop/3d-asset-sourcing.md)
- [设计豁免决策 ADR-001](docs/design/ADR-001-towerx-large-screen-exemption.md)

## 版本

v0.1.0(MVP,已通过 Studio Startup 集成测试)
