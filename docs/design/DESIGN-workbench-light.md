# DESIGN · 浅色数据工作台预设

> BI-native 浅色工作台设计系统。看板 / 经营分析 / 中后台应用类需求的**默认视觉基线**。
> 配套可抄骨架:`docs/design/skeleton-workbench.html`。先抄骨架,再按本文件改 token 和内容。

## 适用 / 不适用

- **适用**:经营分析看板、数据工作台、监控页、管理后台、报表页、表格 + 操作流程混合页。
- **不适用**:对外营销页、活动发布页、产品落地页。那些不用本预设,走 AGENTS.md 里的「营销 / 展示场景」视觉路径。

## 核心立场(一句话)

条理清晰、数据驱动、效率优先的工作空间。**首屏第一视觉位是数据本身,不是 hero、不是大标题、不是装饰**。

---

## 1. Color · 颜色(三层独立 token,禁止混用)

明暗模式:**Light only**。

```css
:root {
  /* 系统色 · UI chrome(导航/按钮/背景/边框/文本) */
  --bg:          #f7f8fa;   /* 顶层页面背景 */
  --surface-1:   #ffffff;   /* 卡片/表格/面板背景 */
  --surface-2:   #f1f3f5;   /* 分组背景/行 hover/强调区 */
  --text-1:      #17202a;   /* 主标题/关键数据/字段值 */
  --text-2:      #3f4b5f;   /* 次标题/标签/正文 */
  --text-3:      #6b778c;   /* 元信息/辅助说明/禁用 */
  --border:      #dfe3ea;   /* 列分隔/行分隔/输入框边框 */
  --accent:      #2563eb;   /* 主按钮/活跃项/focus —— 全页克制使用 */
  --accent-soft: #e8f0ff;   /* 标签背景/高亮行/筛选结果 */

  /* 状态色 · semantic(独立于系统色和图表色) */
  --success: #0f9f6e;
  --warning: #b7791f;
  --danger:  #d64545;
  --info:    #0369a1;

  /* 图表色 · data viz(独立 token,绝不与系统色/状态色同源) */
  --data-1: #2563eb;  --data-2: #0f9f6e;  --data-3: #b7791f;
  --data-4: #7c3aed;  --data-5: #0891b2;  --data-6: #db2777;
  /* sequential 单色梯度(热力/密度/连续值) */
  --seq-1: #e8f0ff;  --seq-2: #b9d4ff;  --seq-3: #7eacff;
  --seq-4: #4581f0;  --seq-5: #1d4ed8;
  /* diverging 双色梯度(目标偏离/涨跌) */
  --div-neg: #d64545;  --div-mid: #f1f3f5;  --div-pos: #0f9f6e;

  /* 圆角 · 阴影 · 间距 */
  --radius-control: 6px;   /* 按钮/输入框/标签 */
  --radius-panel:   8px;   /* 卡片/面板 —— 最大圆角,不超过 8px */
  --shadow-1: 0 1px 2px rgba(23,32,42,0.05);   /* 卡片默认 */
  --shadow-2: 0 2px 8px rgba(23,32,42,0.08);   /* 卡片 hover —— 最重不超过此 */
  --space-1: 8px;  --space-2: 16px;  --space-3: 24px;  --space-4: 32px;
}
```

**硬规则**:
- ❌ `--accent` 不能直接当图表第一根柱子的颜色 —— 图表用 `--data-*`。
- ❌ 状态色(红/绿)不能和 `--data-1/--data-2` 重合。
- ❌ 不允许渐变光晕背景(`radial-gradient` 大面积铺底)、不允许玻璃拟态、不允许紫蓝渐变。
- ❌ `box-shadow` 模糊半径不超过 8px;不堆叠多层投影。

---

## 2. Typography · 字体

应用系统只有 2 个字体载体:一个干净中性 sans + 一个等宽 mono。**没有 "display" 角色** —— 应用系统里最大的字就是页面 title,不存在 hero 大标题那一档。

```css
--font-sans: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, monospace;
```

6 个文字角色(靠字号 / 字重 / 颜色区分,不靠多套字体):

| 角色 | 字体 | 字号 / 字重 | 用途 |
|---|---|---|---|
| **title** | sans | `22 / 600`(页面标题);`15 / 600`(分组·卡片·面板标题) | 标题层级,无更大档 |
| **body** | sans | `13 / 400`,行高 1.5 | 正文、段落、表格文本 |
| **data** | mono | KPI 主值 `28–32 / 600`;表格·图表轴值 `13 / 500` | 所有数值,`tabular-nums`,绝不用比例字宽 |
| **label** | sans | `12–13 / 500` | 字段名、KPI 标签、按钮文字、表头、tag |
| **meta** | sans | `11 / 500`,可 uppercase + `letter-spacing: 0.08em` | 时间戳、kicker、面包屑、脚注 |
| **mono** | mono | `13 / 400` | ID、编码、技术串(非数值的等宽场景) |

`data` 与 `mono` 共用等宽字体,但语义不同:`data` 是数值(要 `tabular-nums`、要对齐、有字号纪律),`mono` 是技术串。

**硬规则**:
- ⭐ `data` 角色一律 `--font-mono` 或 `font-variant-numeric: tabular-nums`,避免数字跳动。
- ❌ 单个数字字号**不超过 40px**。KPI 主值 28–32px,不存在巨型数字。
- ❌ 一个字号字重跑全页 —— 必须有 title / body / data / label / meta 的角色分层。
- ❌ 衬线字体用于 UI 或数值。干净中性 sans(如 Inter)当 UI 字体是对的,不是问题。
- 文本颜色至少 3 档:`--text-1 / --text-2 / --text-3`,不全用一种灰。

---

## 3. Layout · 布局(App Shell,固定桌面优先)

**整体结构 = 左侧 sidebar + 右侧 main(topbar + content)**。这是工作台的骨架,不是单列滚动页。

```
┌─────────┬──────────────────────────────────────┐
│ sidebar │ topbar (面包屑 + 视图切换 + 操作)      │
│ 232px   ├──────────────────────────────────────┤
│         │ content (max 1480px, padding 24/28)  │
│ brand   │   page-head (h1 + lead + meta-row)   │
│ nav     │   kpi-grid (4 列 KPI)                 │
│ ...     │   section (sec-head + panel + chart) │
│ foot    │   section (table / insight ...)      │
└─────────┴──────────────────────────────────────┘
```

- **sidebar**:`232px` 固定宽,`position: sticky; top:0; height:100vh`。含 brand + 分组 nav + 底部数据状态卡。
- **topbar**:`sticky`,含面包屑(当前在哪)、视图切换 seg、主操作按钮。高度约 `52px`。
- **content**:`max-width: 1480px`,桌面 `padding: 24px 28px`。
- **page-head**:`h1` + 一句话 `lead`(说明这页回答什么经营问题)+ `meta-row`(统计周期 / 数据更新 / 口径)。
- **kpi-grid**:`grid-template-columns: repeat(4, 1fr)`,4 个核心指标。
- **section**:每个 `sec` 含 `sec-head`(`01 / 02` 编号 + 标题 + 右侧说明)+ 内容(panel / chart / table / insight)。
- **断点**:`1024px` 以下 sidebar 收成顶部抽屉;`768px` 以下 kpi-grid 转 2 列、表格转分组卡片。**移动端按任务重排,不是桌面等比缩小**。

**硬规则**:
- ⭐ 首屏第一视觉位必须是数据(KPI 或主图表),**不允许 hero 区、不允许大标题占首屏、不允许装饰球/渐变 banner**。
- ❌ 不允许"单列从上滚到下"。必须有 sidebar + 多模块栅格的版式节奏。
- ❌ 不允许同权重 4/6/9 卡墙当页面主体;KPI 卡是辅助,主体是图表 + 表格。
- 固定桌面宽度优先,不做"什么都往手机塌"的响应式。

---

## 4. Components · 组件

- **KPI 卡**:`--surface-1` 背景,`1px --border`,`--radius-panel`,`--shadow-1`。含 label + 方向标签(↑↓→/异常)+ mono 大数(28–32px)+ 同环比对比行。
- **panel / section 容器**:`--surface-1`,`1px --border`,`--radius-panel`,`padding: 16–20px`。`panel-head` = 标题 + 右侧 sub 说明。
- **表格**:行高 36px(紧凑)/ 44px(宽松)。首列是主对象名。数值列右对齐 + mono。行 hover 转 `--surface-2`。表头 `--text-3` 小字。
- **图表**:用 **ECharts**(CDN 白名单)。**绝不用 div/span 设 height 堆假图表**。轴/tooltip/网格统一(见第 6 节)。
- **insight 洞察块**:`--surface-2` 或带 `--accent` 左边框,放一句关键结论 + 支撑数据。用于把"图表说明了什么"显性化。
- **状态标签 pill**:低饱和背景(`--success-soft` 等)+ 深色文字,`padding: 2px 8px`,`--radius-control`。
- **按钮**:Primary = `--accent` 底白字;Secondary = `--surface-1` 底 + `--border`;Danger = `--danger`。
- **六态**:empty / loading / error / success / disabled / permission 都要有视觉反馈,文案带业务上下文("当前筛选无门店数据",不是"无数据")。

**硬规则**:
- ❌ 不用统一大圆角 + 统一阴影 + 统一 emoji 图标做"模板感"。
- ❌ 不用彩色左边框承担主要信息分区(insight 块的左边框是例外,克制使用)。
- ❌ 不出现营销 CTA 按钮("立即体验""一键生成""导出巡检清单"这类与页面任务无关的按钮)。

---

## 5. 数据界面专项规则

- 每个核心数字配**单位 + 时间范围 + 对比基准**(同比/环比/目标)。
- page-head 或 topbar 显示**数据更新时间、筛选范围**,不让用户猜数据是否新鲜。
- ⭐ 首屏要有一个**主判断**:健康度 / 目标差距 / 异常优先级 / 关键趋势 —— 一句话说清这页此刻的结论。
- 图表标题写**业务问题或结论**("利润恢复没跟上规模"),不写"趋势分析""数据概览"这类空标题。
- 一个图只回答一个主要问题。异常要闭环:是什么 / 影响多少 / 可能原因 / 下一步。
- 单位、时间格式跨页面跨组件统一(不能一处"万"一处"w",一处 `2026-05-07` 一处 `5/7`)。
- 假数据要有业务连续性:KPI、异常、图表、表格、行动建议互相呼应,不自相矛盾。

---

## 6. ECharts 统一约定

所有图表共用一套配置,保证跨页面一致。骨架文件里有现成的 `axisX()` / `axisY()` / `tooltipStyle()` / `gridDefault()` 封装,直接复用。

- **色板**:categorical 用 `--data-1..6`;热力/密度用 `--seq-*`;涨跌/偏离用 `--div-*`。
- **轴**:`axisLine` 用 `--border`,`axisLabel` 用 `--text-3` + mono 11px,`splitLine` 虚线 `--border`。
- **tooltip**:`--surface-1` 背景,`1px --border`,`--radius-control`,轻阴影,文本 `--text-1`。
- **网格**:`containLabel: true`,留白克制。
- **数值格式**:与表格中同字段的千分位、小数位、单位完全一致。
- 折线不堆 fill + 渐变 + 圆点 + tooltip 多重装饰;饼图不做 3D / 玫瑰图。

---

## 7. Anti-patterns · 本预设禁区(命中即返工)

- ❌ 首屏是 hero / 大标题 / 渐变 banner / 装饰球,真实数据被推到第二屏。
- ❌ 巨型数字(>40px)、超大圆角(>8px)、重阴影(模糊 >8px)、渐变光晕底。
- ❌ div/span 堆出来的假图表。
- ❌ 同权重 KPI 卡墙当页面主体,没有主判断、没有图表表格承担。
- ❌ 英文 eyebrow / 营销 CTA / "Generated by" footer 占视觉重心。
- ❌ 系统色 / 图表色 / 状态色用同一组颜色跑完。
- ❌ 单列从上滚到下,没有 sidebar、没有版式节奏。
- ❌ 移动端是桌面等比缩小,而不是按任务重排。
