# D3 原语化 —— Claude Code 执行手册

> 本文档是 Phase D3(代码去业务化 + 原语 API + TowerXApp 改名)的执行交接。
> 由 Cowork agent 规划,交给 Claude Code(Mac 本地)实现。
> 配套:[SuperApp Globe 架构](architecture/towerx-template.md)。

## 0. 角色分工

| 角色 | 职责 | 限制 |
|---|---|---|
| **Cowork agent**(规划 + 验证) | 出每步契约、读 diff、跑静态门禁、设计渲染验证清单、判断行为是否保持 | 沙箱不能稳定 commit(`.git` 锁删不掉)、不能渲染(Vite/build 原生二进制平台不匹配 + registry 403) |
| **Claude Code**(实现 + 提交 + 渲染验证) | 写代码、`git commit`、`npm run dev:demo` 实际渲染确认、`npm run build` | —— |

## 1. 当前状态(更新 2026-05-29,git 核实)

- **已 commit(模板 `main`)**:`2afc68e` D3.4 ← `fa1d87d` D3.1-D3.2 ← `7ec11f9` fix(demo) ← `af8700f` D2 ← `8f3c135` D1。
- **已 commit(Studio Startup `master`)**:`610cb91` SKILL(D2)。
- **D3.5 已实现 + 静态通过 + 渲染验证 + Cowork 验证通过,未 commit**(模板工作区):
  - 新增 `src/primitives/`:`darkGlobeContext.ts`、`CityGlow.tsx`、`FlowLine.tsx`;`demo/PrimitivesDemo.tsx`
  - modified:`DarkGlobe.tsx`(加 Context Provider + 自带 fallback overlay ref)、`GlobeWebGL.tsx`(SampleLayers 桥接 context)、`index.ts` ×2、`demo/main.tsx`(`?demo=primitives` 路由)
  - 待 commit(两段):`feat(primitives): DarkGlobe stage context + always-on overlay ref (D3.5 prep)` / `feat(primitives): CityGlow + FlowLine with synthetic pulses + demo (D3.5)`
  - 一个待 Claude Code 肉眼补确认:`?demo=primitives` 里 FlowLine 彗星是否**真的在动**(pulse 逻辑核过是对的,但截图证不了运动)。
- **静态门禁基线**:`tsc` 0;`design:lint` 0;`eslint src` = **29 errors**(全预存,非 D3 引入)。
- **去业务化进度**:原语层(DarkGlobe/CityGlow/FlowLine/LiquidGlassPanel)已干净,接通用 props;`disruption`=旧 critical 渲染;`calm` v1 同 pulse。

### 关于 Tailwind utility(已核实,非风险)
DarkGlobe 用 `fixed inset-0 z-0` 等 utility。打包后 **`dist/index.css` 已内联这些 Tailwind utilities**(消费方 `import '@guandata/superapp-globe/styles'` 即得,**不需要消费方自己配 Tailwind**)。`tailwind.config.js` content 加 `primitives/**` 是为了:① demo dev 时从源码生成;② 重新 build 后 dist 仍包含 primitives 用到的 utility。所以这不是消费方依赖风险,是构建配置配套。

## 2. 验证门禁(每步必过,缺一不可)

```bash
npx tsc --noEmit                 # 必须 0
npx eslint <本步新增/改动文件>     # 必须 0
npx eslint src | grep problems   # 整体 error 数 ≤ 29,不得新增
npm run design:lint              # 必须 0
npm run dev:demo                 # 按下方清单逐项肉眼确认(关键!)
npm run build                    # dist 产出无误(prepare 会自动跑)
```

**渲染清单**(`dev:demo` 必看):暗夜地球出现 → 入场动画(由远及近 + 自旋归位)→ 点右栏 alert 触发电影聚焦推近 → 彗星流光沿航线跑 → bloom 辉光 → 城市点 + 标签。任一项与重构前不一致 = 回退排查。

## 3. 第一步:提交 D3.1–D3.4(D2 / SKILL 已是 HEAD,不用动)

D3.4 渲染已验证。D2(`af8700f`)和 SKILL(`610cb91`)已经提交,**不要重复提**。
只提 D3 这批未提交的工作区改动。注意:不要用早先那套按 D3.1/D3.2/D3.4 拆 3 个
commit 的命令 —— 它们共改 `src/index.ts` / `primitives/index.ts`,拆开会得到跑不起来
的中间 commit(Claude Code 已发现 commit 1 缺 `primitives/index.ts`)。合并为一个
"原语基础层"commit,每个 commit 都能 build。

**模板仓 `superapp-globe-template`(`main`,当前 HEAD `af8700f`):**

```bash
cd "/Users/yangyi/AI/superapp-globe-template"

# ① demo dev server 预存 bug 修复(独立)
git add demo/vite.config.mjs
git commit -m "fix(demo): correct DEV define for vite dev server"

# ② 原语基础层(D3.1 LiquidGlassPanel + D3.2 契约 + D3.4 DarkGlobe + tailwind content 配套)
git add src/primitives src/index.ts src/components/towerx/globe/GlobeWebGL.tsx tailwind.config.js
git commit -m "feat(primitives): LiquidGlassPanel + geo contracts + DarkGlobe container (D3.1-D3.4)"

# ③(可选)D3 执行手册
git add docs/D3-primitives-handoff.md
git commit -m "docs: add D3 primitives handoff plan"
```

**Studio Startup 仓:无需操作**(SKILL 已是 `610cb91`)。

## 4. 待办步骤(推荐顺序 + 契约)

### D3.5 — CityGlow + FlowLine(价值最高,先做)

**目标**:把 `Cities` / `Routes` 从"硬读 mock-data"改成 prop 驱动的点 / 线原语,接通用 `GeoPoint[]` / `GeoArc[]`;crisis / alert / pulse 门控**留在样板**。

**对外契约**(已在 `src/primitives/types.ts` 定好):

```tsx
// 点光:批量或单点
<CityGlow points={GeoPoint[]} intensity?={number} />
<CityGlow position={[lng, lat]} label?="上海" intensity?={number} />

// 流光连线:批量或单线
<FlowLine arcs={GeoArc[]} style?={FlowLineStyle} />
<FlowLine from={[lng,lat]} to={[lng,lat]} style="cinematic" />
```

**约束(红线)**:
- **不要改 `Cities.tsx` / `Routes.tsx` 的渲染数学**(投影、彗星、halo 尺寸都是 16 轮调出来的)。只把"数据来源"从 `import { cities, routes }` 改成 props。
- `FlowLineStyle`('cinematic' | 'pulse' | 'disruption' | 'calm')映射现有 route 视觉:`disruption` = 旧 `status:'critical'` 的危机渲染;其余按 emphasis/常态映射。
- 原语在 `<DarkGlobe>` 的 children 内渲染(共享坐标系)。
- FlowLine 需要 2D 彗星叠层 → 给 `DarkGlobe` 加一个 context 暴露 `overlayCanvasRef`,FlowLine 用 `useContext` 取,**消费方不用手接**(目前样板是手接 `cometCanvasRef`,改 context 后样板也走 context)。
- 样板侧:`GlobeWebGL` 把 mock-data 的 `City`→`GeoPoint`、`Route`→`GeoArc` 做映射后传给原语;`crisisResolving` / `crisisPhase` / `activeCityIds` / alert 门控这些业务逻辑**保留在样板**(可新建一个 sample 适配层组件,把通用原语 + 业务门控组合起来,别把门控塞回原语)。

**风险点**:`Routes` 与 `pulses` / `crisisResolving` / `crisisPhase` 缓动耦合较深。拆分时优先保证样板视觉零回退,通用 props 是叠加的新入口,不是删功能。

**验证**:`dev:demo` 对比重构前;`CityGlow` / `FlowLine` 能脱离 mock-data 单独渲染一组测试数据(在 demo 里加个最小用例)。

### D3.3 — ParticleHalo(轻,D3 最后一步)

**目标**:把 `DarkGlobe` 内联的 `<AtmosphereHalo>` + `<AtmosphereParticles>` 抽成一个 `<ParticleHalo>` 组件(DRY),并导出为公开原语,可开关 / 可微调。

**⚠️ 坐标系红线(最容易翻车的点)**:`DarkGlobe` 里大气层(Halo/Particles)挂在**外层 group**(tilt/spin/scale 之外)——它是环境层,**绝不能随地球自转 / 缩放**。但 `DarkGlobe` 的 `children` 插槽在**最内层 scaleRef 组里**(CityGlow/FlowLine 贴在球面上,要跟着转)。所以:
- **不能**让消费方把 `<ParticleHalo>` 放进 `children`(会被卷进 spin/scale,大气跟着球转 = 坏掉)。
- 正确做法:`DarkGlobe` 加 `atmosphere?: boolean`(默认 true)开关内置层;内置层本身就用新抽的 `<ParticleHalo>` 渲染(DRY)。想自定义的人 `atmosphere={false}` 关掉内置,再通过 `DarkGlobe` 的 **`ambient` slot prop**(ReactNode,渲染在**外层 group**)放自定义 `<ParticleHalo .../>`。**不要走 children**。

**ParticleHalo props**:从 `useDarkGlobeStage()` 读 config 作底;可选覆盖 `color` / `particleCount` / `haloSize` / `density`(GlobeDensity)等纯视觉项,映射到底层 `WebGLGlobeConfig` 的 `particle*` / `halo*` 字段。**不改 AtmosphereHalo/Particles 渲染数学**,只换数据来源(config 来自 context + props 覆盖)。

**避免双渲染**:`atmosphere` 默认 true → 内置一套;消费方放自定义前必须 `atmosphere={false}`。文档写清。

**验证**:`dev:demo` 样板 `/` 大气零回退(还是内置那套);`?demo=primitives` 里加一个 `atmosphere={false}` + 自定义 `<ParticleHalo color=...>` 的用例,确认大气**不随球转**、不双渲染。

### D3.6 — 改名 SuperAppGlobeApp + 导出收尾 + 原语 API 清理

> ⚠️ **范围更正(2026-05-29)**:早先写的"mock-data 移入 demo/"**不做**。
> 原因:① `SuperAppGlobeApp` 是 exported 零配置样板(决策 2),必须在 `src/` 内
> 自带默认数据才能渲染;② 原语现在从 mock-data import **类型**(`City`/`Route`/
> `RouteStatus`/`RouteEmphasis`),移到 demo/ 会变成 `src/` 反向 import `demo/`。
> 这两点都要求 mock-data 留在 `src/`。"去业务化"已由干净的原语层达成,样板自带
> 东亚 demo 数据是合理的(它就是 demo)。想要"纯原语、不发样板"的瘦包是另一个
> 独立决策(Option Y / "slim the package"),不在 D3.6。

按这个顺序做(每步可独立 build):

**① 改名(只改 App 组件,内部 TowerX 代号保留)**
- `src/TowerXApp.tsx` → `src/SuperAppGlobeApp.tsx`;组件 `TowerXApp` → `SuperAppGlobeApp`。
- **只改这一个用户面组件**。`useTowerXConfig` / `TowerXConfig` / `TowerXMode` 等内部
  hook / 类型 **保持 TowerX 命名**(memory:内部代号 TowerX 代码保留),不要全仓改名,
  churn 大且无必要。
- `src/index.ts`:`export { SuperAppGlobeApp } from './SuperAppGlobeApp'` +
  `export { SuperAppGlobeApp as TowerXApp } from './SuperAppGlobeApp'`(JSDoc `@deprecated`,
  指向新名),不破坏刚测过的 SKILL/README import。
- `demo/main.tsx` 默认路由改用 `SuperAppGlobeApp`(别名也行,推荐用新名)。

**② 原语 API 清理(收掉 D3.5 验证发现的毛刺)**
- **删 `CityGlow` 的 `intensity` prop**(类型里删掉 + 去掉 `void intensity`):v1 不实装,
  公开 API 不挂静默无效 prop。等真能接(需 Cities 开 per-point 透明度,属改渲染,谨慎)
  再加回。
- `FlowLineStyle` 的 `calm`:保留,但确保 JSDoc 注明"v1 视觉同 pulse,留作未来低调静线
  档位"(已有,核对一下)。
- 可选:`useMemo(..., [props])` 收窄成具体依赖(纯洁癖,不强制)。

**③ index.ts 导出重排(分层清晰)**
- 样板:`SuperAppGlobeApp`(+ `TowerXApp` deprecated 别名)
- 原语:`DarkGlobe` / `CityGlow` / `FlowLine` / `LiquidGlassPanel`(+ 各自 props 类型)
- 契约:`LngLat` / `GeoPoint` / `GeoArc` / `FlowLineStyle` / `GlobeDensity` / `GlobeFocusPose`
- 既有:`useTowerXConfig` / settings / `CAMERA_PRESETS` / 各 TowerX* 类型(保持)

**④ README + Studio Startup SKILL 对齐**
- `README.md`:形态 A 示例 `TowerXApp` → `SuperAppGlobeApp`;原语示例去掉 "D3 开发中"
  标记,**对齐真实 API**(`CityGlow points/position`、`FlowLine arcs/from-to + style`,
  **删掉示例里的 `intensity={0.8}`**;`ParticleHalo` 仍未做,标注 "D3.3 规划中" 或先撤掉)。
- Studio Startup `SKILL.md`:§3.2 `import { TowerXApp }` → `SuperAppGlobeApp`(注明
  `TowerXApp` 兼容仍可用);顺带把 frontmatter `description` 里 "supply chain / logistics"
  的旧业务定位改成"3D 地球美学层"中性表述(去业务化收尾,SKILL 触发不再绑物流场景)。

**⑤ 验证**:全门禁(tsc 0 / eslint ≤29 / design:lint 0)+ `dev:demo`(样板默认 `/` +
`?demo=primitives` 都不回退)+ **重点验 `TowerXApp` 别名仍能 import 渲染**(兼容性)+
`npm run build` dist 产出。

### D4 — Studio Startup 验证

test 分支重测:原语单用(`DarkGlobe` + `CityGlow` + `FlowLine` + `LiquidGlassPanel`)+ 样板用(`SuperAppGlobeApp`)。peer/install/init/import/build/dev 全链路。

## 5. 给 Claude Code 的总原则

- **增量提取,样板每步都能跑**——别一次性重写核心渲染。
- 单次代码改动 ≤ 800 行(`docs` 不算)。
- **不改 `src/bi-services/`**。
- 视觉数值 / 渲染数学是资产,**只改数据来源,不改渲染**。
- 每步做完通知 Cowork agent 验证(读 diff + 跑门禁 + 核行为保持),再 commit。

## 6. Cowork agent 验证协议(每步收到后)

1. 读 diff,确认只动了"数据来源"没动渲染数学。
2. 核对外契约与本手册一致(props 名 / 类型 / FlowLineStyle 映射)。
3. 跑第 2 节静态门禁(tsc / eslint 计数 / design:lint)。
4. 检查行为保持点:children 坐标系位置、crisis 门控是否仍在样板、原语是否真能脱离 mock-data。
5. 给出渲染验证清单,由 Claude Code 在 Mac 执行。
6. 通过 → 确认可 commit;不通过 → 指出具体回退点。
