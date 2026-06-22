# 基于 SuperApp Globe 交付客户大屏的执行 SOP

> ⚠️ **本 SOP 是 v0.1.x 老版，基于"供应链大屏成品模板"叙事写的。**
> **2026-05-25 产品定位重塑为"3D 地球美学层 npm 包"后，本 SOP 部分内容
> （尤其步骤 1 行业边界、步骤 3 危机叙事配置、步骤 5 字段映射）需要重写。**
> **新版 SOP 等 Phase D3（原语组件 + 数据契约去业务化）完成后发布。**
> **当前阶段：核心流程（7 步）仍然适用，只是"行业必须是物流/交通/能源"
> 这条边界作废，客户业务由 props 注入。**

---

> 解决方案工程师 / 客户开发者从售前对齐到 BI 管理中心发布的 7 步标准流程。
> 配套：[SuperApp Globe 架构](../architecture/towerx-template.md)、
> [3D 资产采购 SOP](./3d-asset-sourcing.md)、
> [ADR-001 LARGE_SCREEN 豁免决策](../design/ADR-001-towerx-large-screen-exemption.md)。

---

## 流程概览

```
[售前]
  └─ 步骤 1 · 客户场景对齐
       │
[开发]
  ├─ 步骤 2 · 项目初始化
  ├─ 步骤 3 · 配置 settings.json
  ├─ 步骤 4 · 模型资产准备
  ├─ 步骤 5 · 接 BI 数据
  └─ 步骤 6 · 真机调参
       │
[交付]
  └─ 步骤 7 · 发布到 BI 管理中心
       │
[迭代]
  └─ 反馈循环（M-006 结构化反馈轮）
```

**全流程目标周期**：3 周（标准客户场景）→ 6 周（场景独特 + 美术外包）。

---

## 步骤 1 · 客户场景对齐（售前 / 解决方案工程师）

**谁干**：售前 / 解决方案工程师 + 客户业务方代表 + （可选）设计部门。

**怎么干**：拿着以下决策清单跟客户业务方对一次需求会议，输出"客户需求填报表"。

### 决策清单

- [ ] **客户使用场景是？** 演示 / 监控 / BI
      → 决定 [`settings.mode`](../../public/settings.json)（A/B/C），见 [towerx-template.md § 4](../architecture/towerx-template.md#4-三种叙事密度模式配置维度不是边界)
- [ ] **客户行业是？** 物流 / 交通运输 / 能源
      → **如果非这三类**，TowerX 不适合，建议等 v2.0 行业特化模板（医疗 / 金融 / 政务）；勉强套会触发 [§2 模板形态边界](../architecture/towerx-template.md#2-模板形态边界4-条不能动要动换模板)
- [ ] **客户品牌主色 hex**？（一个值，会覆盖 PALETTE.blue）
- [ ] **客户业务地理范围**：东亚 / 全球 / 一带一路 / 自定义（如"长三角"）
      → 决定 `settings.scene.cameraLngDeg / cameraLatDeg / earthVariant`
- [ ] **客户 BI 系统 URL** + 是否已有观远 BI 含 SuperApp 版本
      → 如果没有 SuperApp 版本，需要先升级合同，不能跳过
- [ ] **客户的危机故事内容**（最关键，决定 `settings.crisis.story` 四拍）：
    - 哪条业务线断了？（具体到航线 / 干线）
    - 影响哪些下游节点？（2-4 行极短）
    - 推理过程（4-6 个推理碎片）
    - 改道方案（备用航线 + 成本增量 + 规避损失金额）

### 输出物

**客户需求填报表**（一份 Markdown 或飞书文档），结构如下：

```markdown
# [客户名] 大屏需求填报表

## 1. 基本信息
- 客户名称：
- 行业：物流 / 交通运输 / 能源 / 【其他 → 终止】
- 使用场景：演示 / 监控 / BI
- 目标受众：

## 2. 视觉
- 品牌主色 hex：#______
- 地理范围：

## 3. BI 集成
- BI URL：
- SuperApp 版本：是 / 否

## 4. 危机叙事
- 危机航线：
- 受影响下游：
- 推理碎片：
- 改道方案：
- 规避损失金额：
```

---

## 步骤 2 · 项目初始化

**谁干**：客户开发者 / 解决方案工程师。

**前置**：本机已装 Node.js 20+ / 22+，[GuanCLI 已登录](../../README.md)。

### 操作

```bash
# 1. 从 TowerX 模板创建客户项目
guancli app create --template towerx-premium --path ./acme-dashboard --name acme

# 2. 进入项目并准备环境
cd acme-dashboard
cp .env.template .env
# 编辑 .env：填入客户的 VITE_BI_HOST + 鉴权信息

# 3. 装依赖
npm install

# 4. 跑通模板默认状态
npm run dev
# → 浏览器看到默认 TowerX 大屏（东亚 / 香港危机 / 演示模式）
```

### 验证

- [ ] `npm run dev` 启动无报错，浏览器看到地球 + HUD
- [ ] `npx tsc --noEmit` 通过（0 错误）
- [ ] `npm run design:lint:strict` 通过（0 error，警告维持模板默认状态）

### 输出物

- 一个本地可跑的 `acme-dashboard/` 项目
- 一份 commit 历史的起点 root commit（建议执行 `git init` + 首次 `git commit`）

---

## 步骤 3 · 配置 `settings.json`

**谁干**：客户开发者，对照步骤 1 的"客户需求填报表"逐项填。

**位置**：[`public/settings.json`](../../public/settings.json) （编辑时 IDE 会按 [`settings.schema.json`](../../public/settings.schema.json) 校验）。

### 必填字段（v1.0 已支持）

```jsonc
{
    "$schema": "./settings.schema.json",
    "name": "acme",
    "title": "ACME 全球供应链作战中心",
    "page": {
        "pgType": "LARGE_SCREEN",
        "exemptDesignLint": true,
        "exemptReason": "docs/design/ADR-001-towerx-large-screen-exemption.md"
    }
}
```

### 客户配置字段（v2.0 起逐步开放）

```jsonc
{
    "mode": "演示",
    "brand": {
        "primaryColor": "#4d8bff",
        "heroFocalPhrase": "East Asia"
    },
    "scene": {
        "cameraLngDeg": 110,
        "cameraLatDeg": 20,
        "earthVariant": "stylized-dark"
    },
    "crisis": {
        "routeId": "hongkong-shanghai",
        "story": {
            "downstream": ["..."],
            "reasoning": ["..."],
            "plan": { "route": "...", "costDelta": "...", "avoidedLoss": "...", "confidence": 0.92 }
        }
    },
    "data": {
        "useMockData": true
    },
    "assets": {
        "baseUrl": "https://cdn.acme.com/towerx/",
        "ships": "ships.glb"
    }
}
```

### 关键决策点

- **`data.useMockData = true`**：本步骤先用 `mock-data.ts` 跑通画面，**不要在这一步就接 BI 数据**——会把"画面问题"和"数据问题"混在一起调，难定位。
- **不要直接改 [`src/components/towerx/`](../../src/components/towerx/) 里的任何文件**：模板代码层不应被客户化数据污染，所有客户差异通过 `settings.json` 表达。

### 输出物

- `public/settings.json` 填到至少 5 个字段（`mode` / `brand.primaryColor` / `scene.cameraLngDeg` / `crisis.routeId` / `data.useMockData`）
- IDE 编辑时无 schema 警告

---

## 步骤 4 · 模型资产准备（按 [3d-asset-sourcing.md](./3d-asset-sourcing.md) SOP）

**谁干**：客户开发者 + （可选）外包美术 / 内部美术。

**前置**：步骤 1 的"客户行业 + 地理范围"已确定，知道需要哪些资产。

### 流程

1. **决定资产清单**：根据客户场景列出需要的 3D 物体（如能源行业要油轮 / 输油管 / 钻井平台 / 储油罐）
2. **按路径采购**：详见 [3d-asset-sourcing.md § 1](./3d-asset-sourcing.md#1-三条路径并列)
   - 路径 1 模型社区：1-3 天
   - 路径 2 美术外包：5-15 天
   - 路径 3 AI 文生 3D：当天
3. **筛选标准过滤**：详见 [3d-asset-sourcing.md § 2](./3d-asset-sourcing.md#2-模型筛选标准所有路径适用)
4. **预处理压缩**：详见 [3d-asset-sourcing.md § 3](./3d-asset-sourcing.md#3-模型预处理工具链)
5. **上传 CDN**：客户私有云 / 阿里云 OSS / Cloudflare R2 / Vercel Blob
6. **填入 [`settings.assets.*`](./3d-asset-sourcing.md#4-settingsassets-字段使用)**：只填 URL，**不要把 .glb 文件 commit 到 git**

### 决策清单

- [ ] 资产清单 ≤ 10 项（超过说明场景过载，回 §1 与客户对齐取舍）
- [ ] 总资产体积 ≤ 15 MB
- [ ] 所有资产协议商用清晰（CC / 客户买断 / 内部产出）
- [ ] CDN 跨域配置正确（`Access-Control-Allow-Origin` 允许客户 BI 域名）

### 输出物

- 一个 CDN URL 列表 → 已填入 `settings.assets`
- 资产清单与协议归档（项目 `docs/customer-assets.md` 由客户开发者自行维护）

---

## 步骤 5 · 接 BI 数据（用 `bi-services`）

**谁干**：客户开发者 + 客户 BI 管理员（提供数据集 ID / 字段映射）。

**前置**：步骤 3 已跑通 mock 状态，步骤 4 已上线静态资产。

### 流程

1. **用 [`src/bi-services/dataset.ts`](../../src/bi-services/dataset.ts) 拉客户数据集**：
   - 城市表：`getDatasetDetail(citiesDsId)` → 字段 `id / name / latDeg / lngDeg / nodeType / status`
   - 航线表：`getDatasetDetail(routesDsId)` → 字段 `id / source / target / status / emphasis`
   - Alert 表：`bi-services/form.ts` 走表单填报，或 `dataset.ts` 走数据集
2. **字段映射**（客户字段名 ≠ TowerX 期望字段）：
   - 客户的"门店编号" → TowerX 的 `id`
   - 客户的"经度" → TowerX 的 `lngDeg`
   - 客户的"风险等级 P0/P1/P2" → TowerX 的 `status: critical/responding/closed`
   - 映射逻辑放在 `src/components/towerx/data-adapters/` 下（v2.0 起规范的目录）
3. **切换数据源**：`settings.data.useMockData = false`，组件内部读真实数据

### 决策清单

- [ ] 客户数据集字段已与 TowerX 期望字段一一映射
- [ ] 异常 / 空数据有 fallback（不能让画面崩）
- [ ] BI Token 走 `.env` 不走代码 hardcode
- [ ] 至少跑通一次完整数据流（城市表 + 航线表 + alert 表全到位）

### 输出物

- 一个真实数据驱动的大屏画面
- 一份字段映射文档（项目 `docs/customer-field-mapping.md` 自行维护）

---

## 步骤 6 · 真机调参（用调参面板）

**谁干**：售前 / 设计师 + 客户开发者陪同。

**为什么必须真机**：客户接待用的笔记本 / 客户值班室的 LED 拼接屏 / 客户高管会议室的 4K 投影——三种设备的色彩 / 亮度 / 分辨率差异极大，本机调好的不代表真机看着对。

### 流程

1. **打包带调参面板的开发版**（v2.0 起 GuanCLI 会内置"--with-tuner"标志）
2. **真机连接客户网络** → 浏览器打开开发版
3. **拖滑块调**：
   - `GlobeEditor3D` —— 相机角度 / 球体半径 / 颜色 / 国家线密度
   - `HUDTuner`（v2.0）—— 字号 / 玻璃透明度 / pill 间距
   - `PlaneMotionTuner`（v2.0）—— 飞机 / 船 / 卡车的速度 / 高度 / 轨迹曲率
4. **客户业务方现场确认** → "复制为默认值" 按钮 → 粘回 `settings.json`

### 决策清单

- [ ] 真机至少调过一次（不能仅在本机调好就交付）
- [ ] 客户业务方在场签字确认（书面 / 飞书 / 邮件留痕）
- [ ] 调参结果回填 `settings.json` 并 commit

### 输出物

- 客户真机上确认的 `settings.json`
- 现场截图 / 录屏归档

---

## 步骤 7 · 发布到 BI 管理中心

**谁干**：客户开发者。

**前置**：步骤 1-6 全部完成，本机 `npm run dev` 在真实数据下表现稳定。

### 操作

```bash
# 1. 构建生产包
npm run build
# → 生成 dist/，含 index.html + assets/*.js + assets/*.css + settings.json

# 2. 跑发布前体检
npm run design:lint:strict
# → 必须 0 error（warning 维持模板默认状态）
npx tsc --noEmit
# → 必须 0 error

# 3. 发布到客户 BI 实例
guancli app publish
# → 上传 dist/ 到客户 BI 的扩展应用
```

### 客户在 BI 管理中心怎么用

- **路径**：BI 管理中心 → 扩展应用 → [应用名] → 查看 / 分享 / 在线改 `settings.json`
- **权限**：客户 BI 管理员可以授权特定角色查看；嵌入 BI 看板时也可以作为一个卡片
- **更新**：客户业务方可以在线改 `settings.json`（如改 hero 标题、危机故事内容），不需要重新打包；只有改组件结构 / 接入新数据源时才走步骤 2-6 重新打包发布

### 决策清单

- [ ] `npm run build` 通过，dist 体积 ≤ 5 MB（资产走 CDN 不入包）
- [ ] `design:lint:strict` 0 error
- [ ] `tsc --noEmit` 0 error
- [ ] `guancli app publish` 成功，客户 BI 管理中心可见
- [ ] 客户业务方在 BI 管理中心打开大屏，画面正常

### 输出物

- 一个上线的 BI 扩展应用
- 一条交付记录（项目名 / 客户 / 版本号 / 发布时间 / commit SHA）

---

## 反馈循环（按 M-006 结构化反馈轮）

**每次客户提出问题**（合同期内的运维 / 续约前的体验调整 / 新需求），按以下结构归档一轮反馈：

```markdown
## 反馈轮 #N · YYYY-MM-DD

### 客户反馈（原话）
> ____

### 根因分析
- 是模板的 bug，还是配置问题？
- 是 v1.0 范围外的功能，还是范围内的实现瑕疵？
- 是客户业务理解差异，还是技术约束？

### 处置方案
- 配置层修复（改 settings.json）→ 客户自助 / 售前协助
- 数据层修复（改 bi-services 映射）→ 客户开发者
- 模板层修复（改 src/components/towerx/）→ 上升到模板维护团队，进入 v1.x patch
- 形态层修复（违反 [§2 边界](../architecture/towerx-template.md#2-模板形态边界4-条不能动要动换模板)）→ 拒绝接单，告知客户走 v2.0 新模板

### 反哺到本 SOP
- 哪一步骤的执行细节有遗漏？
- 哪个决策清单需要新增检查项？
- 哪个输出物模板需要更新？
```

**目标**：每轮反馈都让本 SOP 增量演进，不再让同一个坑栽两次。

---

## 角色 RACI 矩阵

| 阶段 | 售前 / 解决方案 | 客户开发者 | 设计师 | 美术 | 客户业务方 | 客户 BI 管理员 |
|---|---|---|---|---|---|---|
| 步骤 1 场景对齐 | **A R** | C | C | — | **R** | I |
| 步骤 2 项目初始化 | — | **A R** | — | — | — | I |
| 步骤 3 配置 settings | C | **A R** | C | — | C | — |
| 步骤 4 模型资产 | — | **A** | C | **R** | C | — |
| 步骤 5 接 BI 数据 | — | **A R** | — | — | I | **R** |
| 步骤 6 真机调参 | **A R** | R | **R** | — | **R** | — |
| 步骤 7 发布 | I | **A R** | — | — | I | **R** |

R = Responsible（干活）; A = Accountable（拍板）; C = Consulted（咨询）; I = Informed（告知）

---

## 索引

- 模板架构理论基础：[towerx-template.md](../architecture/towerx-template.md)
- 3D 资产采购：[3d-asset-sourcing.md](./3d-asset-sourcing.md)
- 设计豁免决策：[ADR-001](../design/ADR-001-towerx-large-screen-exemption.md)
- 运行时配置：[`public/settings.json`](../../public/settings.json) + Schema：[`public/settings.schema.json`](../../public/settings.schema.json)
- BI 集成 API：[`src/bi-services/`](../../src/bi-services/)
- 模板代码层（请勿直接改）：[`src/components/towerx/`](../../src/components/towerx/)
