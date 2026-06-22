# SuperApp Globe(代号 TowerX)架构

> 本文档定义 `@guandata/superapp-globe` 的产品定位、商业角色、美学边界与分层架构。
> 配套:[设计豁免决策 ADR-001](../design/ADR-001-towerx-large-screen-exemption.md)、
> [客户开发执行 SOP](../sop/build-with-towerx.md)、
> [3D 资产采购 SOP](../sop/3d-asset-sourcing.md)。

## 目录

- [§0 产品定位 · 3D 地球的美学层 npm 包(最顶层,必读)](#0-产品定位--3d-地球的美学层-npm-包最顶层必读)
- [§1 商业角色定位(必读)](#1-商业角色定位必读)
- [§2 美学边界(3 条,不能动,要动新建包)](#2-美学边界3-条不能动要动新建包)
- [§3 5 层 × 4 状态矩阵(包的核心架构)](#3-5-层--4-状态矩阵包的核心架构)
- [§4 视觉密度预设(配置维度,不是边界)](#4-视觉密度预设配置维度不是边界)
- [§5 防错对照表](#5-防错对照表)
- [索引](#索引)

---

## 0. 产品定位 · 3D 地球的美学层 npm 包(最顶层,必读)

**SuperApp Globe 是给观远 SuperApp 用户做 3D 地球可视化时的"美学层 npm 包",
不是大屏成品模板。**

### 0.1 真实痛点(为什么这个包存在)

SuperApp 用户做 3D 地球效果**很差**——因为复杂 R3F + shader + 物理动效
代码 LLM 写不准,而 SuperApp 用户大多走 vibe coding 路线。结果是:

- 走 deck.gl / Cesium / ECharts GL → 工程化 OK,但**视觉平淡**(它们做数据层不做美学)
- 让 AI 从零写 R3F → 大概率崩(暗夜 shader / bloom / 玻璃材质参数 LLM 调不准)
- 自己手写 → 需要 R3F 专家,周期长

**本包填这个空白**:把"暗夜美学 + 玻璃 HUD + 流光连线 + bloom + 粒子"
这套视觉资产封装成可复用的原语组件,SuperApp 用户拿来组装,数据自己接。

### 0.2 跟其他 3D 地球库的分工

| 层 | 谁做 |
|---|---|
| 数据层(算 layer / 接 BI 数据 / 投影计算 / 性能优化)| deck.gl / Cesium / ECharts GL / 客户自己 |
| **美学层 ← 本包** | 暗夜地球材质 + bloom 后处理 + 玻璃 HUD + 流光连线样式 + 粒子粒度 |

**差异化**:deck.gl 是工程化数据库,默认渲染**没有这层美学**。客户用它们
渲染数据,用本包"长得好看"——两者是**分工不是竞争**。

### 0.3 包的边界哲学

**包做**:
- 暗夜 3D 地球(material + shader + atmosphere)
- 玻璃 HUD 容器与组件
- 流光 / 改道 / 脉冲等连线样式
- 城市光晕 / 粒子粒度
- 视觉密度预设(sparse / dense / immersive)

**包不做**(用户想这么干自己去编程解决):
- 数据 layer 引擎(用 deck.gl)
- 跟其他 3D 库同屏互操作(共享 WebGL context / 双 canvas 叠层等)
- 非暗夜风格变体(白昼 / 极简扁平 → 要做请新建包)
- 特定业务叙事("危机"只是 `<FlowLine style="disruption">` 连线样式的一种,
  不是包的特殊功能)

**Why 边界要清晰**:试图覆盖所有场景 = 包臃肿 + 美学失焦。16 轮反馈调出
来的视觉资产是核心价值,不该被业务场景污染。

### 0.4 跟 vibe coding 的关系

**SuperApp Globe = vibe coding 范式下的"美学层底座"**:

- 不是从零生成:复杂 R3F + shader LLM 写不准,所以包**预制**这些
- 不是 SaaS 黑盒:客户拿到完整 npm 包源码,可读可改 props
- 是"3D 地球美学领域的高质量 vibe coding 起点":AI 协助客户**调 props /
  接数据 / 拼 HUD**,**不让 AI 触碰** R3F 内核 + shader

| Vibe Coding 友好性体现 | 怎么做的 |
|---|---|
| AI 可读 / 可改的配置接口 | `settings.json` schema + 原语组件 props |
| AI 写错 settings 不崩 | `useTowerXConfig()` fallback 状态机 |
| 告诉 AI "哪些不能改" | §2 美学边界 + R3F 内核封装在包内 |
| 给 AI 一个"快速切大方向"的杠杆 | §4 视觉密度预设(sparse / dense / immersive)|
| AI 拿到完整起点不是半成品 | 完整保留 16 轮反馈的视觉资产 + 时序系统 |

### 0.5 销售形态

**不卖大屏成品,卖"AI 协作做 3D 地球的能力"**。

推荐演示流程:

1. 打开 SuperApp Globe 默认样板(5 秒看到完整美学,作为参考装配)
2. 销售当场打开 Cursor / Claude Code,跟 AI 协作改:
   - "把品牌色改成 #3FCB95" → 浏览器实时见配色全变
   - "加一个城市光晕在上海" → AI 加 `<CityGlow position={[121, 31]} />`
   - "切到 sparse 密度" → AI 改 `settings.density`
   - "用我们自己的航线数据" → AI 改 `<FlowLine>` 的 props
3. 客户看到"AI 跟工程师协作做 3D 地球"的效率 = 卖点

**这比卖一个固定大屏成品有效 10 倍**——客户看到的是**能力**而非样板。

### 0.6 防错信号

⚠️ 如果未来出现下列措辞 / 工作方式,说明定位漂移:

| 漂移信号 | 修正方向 |
|---|---|
| "v2.0 再做 10 种行业预设大屏" | v2.0 堆原语丰富度(更多连线样式 / 粒子效果),不堆成品数 |
| "把数据层也包进来" | 数据层用 deck.gl / 客户自己;包只做美学 |
| "支持白昼浅色风格" | 不做。要白昼新建包 |
| "客户不该拿到源码"(SaaS 黑盒)| 完整代码是核心 USP |
| "AI 帮客户写 R3F shader / 时序系统" | AI 只动 props / 文案 / HUD 装配,不触碰内核 |
| "做成品大屏放应用中心" | 包是组件库,不是成品 |
| "只服务物流 / 供应链客户" | 服务所有 SuperApp 用户,业务由客户注入 |

---

## 1. 商业角色定位(必读)

**SuperApp Globe 是观远 SuperApp 框架的视觉美学锚点
(产品定位见 [§0](#0-产品定位--3d-地球的美学层-npm-包最顶层必读)),不作为独立商品销售。**

### 商业链条

```
观远 BI(主营商品,按席位 / 数据规模付费)
  └─ SuperApp 框架(增值模块,扩展可视化与嵌入式应用能力)
       └─ GuanCLI 工具链(开发者工具,免费随 SuperApp 提供)
            └─ @guandata/superapp-globe(SuperApp 内的 3D 地球美学库,
                内部资产,不计价)
```

### 目标客户

**所有使用 SuperApp 的用户**(不再限于物流 / 供应链客户)。包是中性的美学
组件,任何需要在 SuperApp 应用里做 3D 地球可视化的场景都能用——物流监控、
电网拓扑、人口流动、卫星轨迹、网络流量,业务由客户用 props 注入。

### 客户使用路径

1. 客户购买**观远 BI 含 SuperApp 版本**(合同主体)
2. 解决方案工程师 / 客户开发者在客户的 Studio Startup 项目里 `npm install`
   本包 + peer 依赖(详见 SOP)
3. 客户开发者按自己业务需求,用本包的原语组件组装 3D 地球场景,接客户的
   BI 数据(deck.gl / bi-services / 自己 fetch)
4. 部署到客户的观远 BI 实例 → 加深观远 BI 使用粘性

### 谁付钱给谁

| 角色 | 付费对象 | 付费内容 |
|---|---|---|
| 终端客户(业务方)| 观远公司 | 观远 BI + SuperApp 许可 |
| 终端客户(业务方)| 集成商 / 设计部门 | 大屏定制开发服务 |
| 集成商 / 设计部门 | 无人 | SuperApp Globe / GuanCLI 是免费资产 |

### 防错信号

⚠️ 漂移信号:

| 错误措辞 | 修正方向 |
|---|---|
| "SuperApp Globe 售价 ¥X 万 / 套" | 不计价,定价是观远 BI + 定制服务 |
| "SuperApp Globe 是观远的可视化产品" | 是 SuperApp 框架的视觉美学锚点 |
| "只服务物流 / 供应链客户" | 服务所有 SuperApp 用户,业务由客户注入 |
| "和 DataV / Quick BI 一样卖大屏模板" | 不卖大屏成品,卖美学层组件库 |

---

## 2. 美学边界(3 条,不能动,要动新建包)

每条都是**包的硬边界**,不在客户配置 / props / 二次开发可控范围内。
想要其他风格,**新起一个包**(如 `@guandata/light-globe` / `@guandata/flat-dashboard`)。

| 维度 | 固定形态 | 想要别的就 |
|---|---|---|
| **视觉范式** | 暗黑色基底 + 冷色调(PALETTE.bg0/bg1/bg2 + blue + violet)| 新建"白昼仪表板包"(光底 + 暖色调 / 中性灰)|
| **主视觉类型** | 3D 地球 / 地图(StylizedEarth + 国家线 + 城市点 + 航线弧)| 新建"建筑沙盘包"(园区 / 厂房 BIM)或"抽象数据流包"(粒子流 / 几何抽象)|
| **HUD 风格** | 玻璃质感(liquid-glass)+ 大字号 hero(≥ 80px)+ 渐变焦点 span | 新建"扁平极简包"(无玻璃、纯色块、小字号、信息密度优先)|

### 为什么是硬边界

#### 视觉范式 —— 暗黑底冷色调

视觉系统贯穿 7 色 PALETTE、country / route / halo shader uniforms、textShadow
legibility halo、bloom 后处理参数、玻璃材质 alpha。**一套完整暗夜视觉体系
的搭建经历了 16 轮反馈轮**,切到白昼模式不是改几个 hex 能完成的——所有
shader 的 limb darkening、fresnel rim、additive blending 都要重新设计。

保留为硬边界是出于**成本** + **品质**考虑。

#### 主视觉类型 —— 地球 / 地图

地球的几何契约(GLOBE_RADII 同心壳、latLngToVector3 投影、tilt/spin/scale
group 父子层级)是所有上层视觉原语的共同坐标系。切换到建筑沙盘,整个 R3F
树的 props 接口、相机控制都要重写。

保留为硬边界是出于**一致性**考虑——同一个包里混搭会让"什么是 SuperApp
Globe 风格"这个问题失焦。

#### HUD 风格 —— 玻璃 + 大字号 hero + 渐变焦点

玻璃 HUD 是 SuperApp Globe 区别于普通 BI 仪表板的核心 USP。backdrop-filter:blur、
超 8px box-shadow、84px hero、sanctioned 焦点渐变——这些全部被
[ADR-001 LARGE_SCREEN 豁免决策](../design/ADR-001-towerx-large-screen-exemption.md)
正式豁免。

保留为硬边界是出于 **USP 差异化**考虑——把玻璃换成扁平就等于把
SuperApp Globe 的辨识度抹平。

### 注意:不再有"行业范畴"边界

老版本 TowerX 有"物流 / 交通 / 能源"行业范畴边界。**美学库重塑后,这条边界
作废**——包只关心视觉范式,不关心业务行业。物流飞机、电网线路、人口流动、
卫星轨迹,都用同样的 `<FlowLine />`、`<CityGlow />` 等原语组件渲染,业务
语义由客户用 props 注入。

特定的"危机叙事"也不再是包的特殊功能,只是 `<FlowLine style="disruption">`
连线样式的一种。

---

## 3. 5 层 × 4 状态矩阵(包的核心架构)

### L0 战略层(不进矩阵)

包内置 5 条战略原则与 4 条反例:

**5 原则**(任何客户化不能违反):
1. 一屏一焦点 —— 永远只有一条品红警示线,红色不是普遍状态
2. AI 自主优先 —— 不让用户做选择题,AI 已经决策完了
3. 数据稀缺感 —— 不堆数字,金额拍点全屏只出现 1 次
4. 视觉一致性 —— 蓝色 = 基建 / 进行中,品红 = 警示,紫色 = AI,金色 = 价值
5. 暗夜沉浸感 —— 不允许任何亮色背景方案,HUD 必须能与地球氛围共存

**4 反例**(典型踩坑,客户化禁止重蹈):
1. ❌ 把所有点全染红 —— 红色失去焦点功能
2. ❌ 在地球上同时画多条警示线 —— 视觉破窗
3. ❌ 加多个金额数字 —— 价值拍点稀释
4. ❌ 把玻璃 HUD 改成不透明卡片 —— 失去与 3D 场景的视觉融合

### 矩阵(5 层 × 4 状态)

|  | **L1 视觉 token** | **L2 地球主视觉** | **L3 视觉原语(点/线/粒子)** | **L4 HUD 容器与组件** | **L5 数据契约** |
|---|---|---|---|---|---|
| **A 包预设** | `theme.ts` 的 PALETTE 7 色 + STATUS 3 档 + EVENT 4 状态色 | `<DarkGlobe />` 暗夜地球(material + shader + bloom) | 默认连线样式(cinematic / disruption / pulse)+ 默认 `<CityGlow />` / `<ParticleHalo />` | `<LiquidGlassPanel />` + 默认 `<Header />` / `<Telemetry />` / `<AlertFeed />` 示例 HUD | 默认 mock 数据(供样板用) |
| **B 客户实例化** | `settings.brand.primaryColor` 覆盖 PALETTE.blue;其余 4 色保持包默认 | `<DarkGlobe />` props 调相机机位 / 旋转 / 球体半径 | `<FlowLine style="..." from={...} to={...} />` / `<CityGlow position={...} />` 客户传数据 | 客户用 `<LiquidGlassPanel />` 自己拼 HUD,或复用包内示例组件 | 客户接自己的 BI 数据,转成原语组件需要的 props |
| **C 调整入口** | `public/settings.json` 的 `brand.*` 字段 | `<DarkGlobe />` 组件 props 或 `settings.scene.*` | 原语组件 props(`from / to / style / intensity` 等)| 组件 props + 自由组合(自己写 HUD)| 数据由客户代码注入(deck.gl / bi-services / 自己 fetch)|
| **D 数据来源** | 设计师从客户品牌手册取色 → `settings.brand` | world-atlas 预制 + 客户城市表覆盖 | 客户 BI 数据集 → 转 props | 客户自己定 | `bi-services/` / deck.gl / 客户自己 |

### 矩阵阅读规则

- **横向看(同层 A→D)**:包自带什么 → 客户能配什么 → 在哪里改 → 数据从哪来
- **纵向看(同状态跨层)**:A 列 = `npm install` + `import { TowerXApp }` 后开箱看到的样板;B 列 = 客户用原语组件 + 数据组装出的客户版
- **不在矩阵的内容**:§2 美学边界已经约束的硬约束(暗黑、地球、玻璃),A/B/C/D 都不可变更

### L7 基础设施层(不进矩阵)

**技术栈**:
- React 18 + TypeScript 严格模式
- Vite 5 + tsup(库 build,ESM-only)+ ESLint 9
- @react-three/fiber v8 + @react-three/drei v9 + @react-three/postprocessing v2 + three.js 0.184
- d3-geo + topojson-client + world-atlas(地图数据源)
- vitest

**工程反模式守门**:
- R3F 内核 + shader 在 `src/components/towerx/` 内,客户不直接改(改了等于反包)
- 包不持有客户业务数据(所有 cities / routes / events 由客户 props 注入)
- 包不暴露非美学辅助函数(数据处理 / fetch / 业务逻辑都在客户侧)
- ESM-only:消费方必须是现代 ESM 项目(Vite / 模态打包工具,Studio Startup 已是)

---

## 4. 视觉密度预设(配置维度,不是边界)

视觉密度是客户配置项(`settings.density` 或 `<TowerXApp density="..." />` props),
不构成包的形态边界。

| 密度 | L2 地球 | L3 视觉原语密度 | L4 HUD 元素密度 | 适合场景 |
|---|---|---|---|---|
| **sparse**(稀疏)| 相机拉远 / FOV 小 / bloom 弱 / 地球退为背景 | 少量光晕 + 弱粒子 + 单线 | 一个 Hero + 少量遥测 | 季度复盘 / KPI dashboard / 地球作背景的场合 |
| **dense**(标准,默认)| 标准视角 / 标准 bloom / 地球作主视觉 | 中等城市光晕 + 标准连线 + 中粒子 | Header + 单 AlertFeed + Telemetry | 路演 / 客户接待 / 媒体展示(默认)|
| **immersive**(沉浸)| 相机近 / FOV 大 / bloom 强 / 地球填屏 | 高密度光晕 + 多线流光 + 强粒子 | 多 AlertFeed + 指标卡 + Telemetry 加密 | NOC 监控大屏 / 应急指挥中心 / 7×24 值守 |

**与老版本三模式的关系**:老版 demo / monitor / bi 是按"叙事场景"分类,
绑死供应链业务。重塑后改为按"视觉密度"分类,中性化,客户业务由 props 注入。
代码层面 cameraPresets 等资产基本保留,只是语义改名。

**v0.1.x 范围**:dense 完整实现;sparse / immersive 提供最小切换版(主要切
相机机位 + bloom 强度),后续完整化。

---

## 5. 防错对照表

| 错误倾向 | 正确做法 | 对照章节 |
|---|---|---|
| ❌ "给客户做大屏成品" | ✅ 包是组件库,客户自己组装;成品不卖,卖能力 | §0 产品定位 |
| ❌ "补 DataV / Quick BI 的功能广度" | ✅ 保持包内美学深度,不追广度;数据层用 deck.gl 等 | §0.2 跟其他库分工 |
| ❌ "把 SuperApp Globe 当商品卖" | ✅ 是 SuperApp 能力锚点,不计价 | §1 商业角色定位 |
| ❌ "做白昼版 / 浅色变体" | ✅ 暗夜是硬边界,要白昼新建包 | §2 美学边界 |
| ❌ "把数据层也包进来" | ✅ 数据用 deck.gl / 客户自己;包只做美学 | §0.3 边界哲学 |
| ❌ "做 deck.gl 同屏共存方案" | ✅ 不做。客户想同屏自己编程解决 | §0.3 边界哲学 |
| ❌ "AI 直接生成 R3F + shader 代码" | ✅ AI 只改 props / HUD 装配,内核包封装 | §0.4 vibe coding 关系 |
| ❌ "限制只服务物流 / 供应链客户" | ✅ 服务所有 SuperApp 用户,业务由客户注入 | §1 目标客户 |
| ❌ "把'危机叙事'当成包的特殊功能" | ✅ 危机只是 `<FlowLine style="disruption">` 连线样式之一 | §2 注意 |

---

## 索引

- 设计豁免决策:[ADR-001 LARGE_SCREEN](../design/ADR-001-towerx-large-screen-exemption.md)
- 客户开发执行 SOP:[build-with-towerx.md](../sop/build-with-towerx.md)
- 3D 资产采购 SOP:[3d-asset-sourcing.md](../sop/3d-asset-sourcing.md)
- 运行时配置:[`public/settings.json`](../../public/settings.json) + Schema:[`public/settings.schema.json`](../../public/settings.schema.json)
- 类型定义:[`src/services/settings.ts`](../../src/services/settings.ts) 中的 `AppSettings`
- 主组件:`<TowerXApp />` (一站式样板,D3 后改名 `<SuperAppGlobeApp />`)+ 原语 `<DarkGlobe />` / `<FlowLine />` / `<CityGlow />` / `<ParticleHalo />` / `<LiquidGlassPanel />`(D3 实现后开放)
