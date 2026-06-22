# DESIGN · 深色高密度 Dashboard 预设

> BI-native 深色高密度看板设计系统。实时监控 / 经营驾驶舱 / 异常优先 dashboard 类需求的**深色视觉基线**。
> 配套可抄骨架:`docs/design/skeleton-dashboard.html`。先抄骨架,再按本文件改 token 和内容。
> 与 `DESIGN-workbench-light.md` 是姊妹件:同结构、同纪律,只是明暗模式与信息密度不同。

## 适用 / 不适用

- **适用**:实时经营监控、全渠道实时看板、运营驾驶舱、异常 / 告警队列页、长时间值守的监控大屏、高密度数据 dashboard。
- **不适用**:对外营销页、活动发布页、产品落地页;低密度、轻交互的浅色工作台(那些走 `DESIGN-workbench-light.md`)。营销类不用本预设,走 AGENTS.md 里的「营销 / 展示场景」视觉路径。

## 核心立场(一句话)

冷峻、高密度、异常优先的监控空间。**首屏第一视觉位是数据本身,不是 hero、不是大标题、不是装饰**。深色是为了长时间值守不疲劳,不是为了炫酷 —— **分层深色 + 一个克制 accent,不是纯黑 + 霓虹**。

---

## 1. Color · 颜色(三层独立 token,禁止混用)

明暗模式:**Dark only**。深色最容易翻车的两点 ——「纯黑 #000 铺底」和「彩虹 accent」—— 本预设明确禁止。

```css
:root {
  /* 系统色 · UI chrome(导航/按钮/背景/边框/文本) */
  --bg:          #0b0b10;   /* 顶层页面背景 —— 是深墨,不是纯黑 #000 */
  --surface-1:   #111218;   /* 卡片/表格/面板背景 */
  --surface-2:   #181923;   /* 分组背景/行 hover/强调区 */
  --surface-3:   #1f2030;   /* 进度槽/嵌套块/tooltip 底 */
  --text-1:      #f5f6fb;   /* 主标题/关键数据/字段值 */
  --text-2:      #c5c7d3;   /* 次标题/标签/正文 */
  --text-3:      #858999;   /* 元信息/辅助说明/禁用 */
  --border:      rgba(255,255,255,0.08);  /* 列分隔/行分隔/卡片边框 —— 用半透明白,不用实色 */
  --border-strong: rgba(255,255,255,0.16);/* 强调容器边框 */
  --accent:      #8b5cf6;   /* 主按钮/活跃项/focus —— 全页只有这一个 accent,克制使用 */
  --accent-soft: rgba(139,92,246,0.14);   /* 标签背景/高亮行/选中态 */

  /* 状态色 · semantic(独立于系统色和图表色) */
  --success: #34d399;
  --warning: #f5a524;
  --danger:  #ff5c7a;
  --info:    #60a5fa;

  /* 图表色 · data viz(独立 token,绝不与系统色/状态色同源) */
  --data-1: #8b5cf6;  --data-2: #06b6d4;  --data-3: #34d399;
  --data-4: #f5a524;  --data-5: #ff5c7a;  --data-6: #ec4899;  --data-7: #60a5fa;
  /* sequential 单色梯度(热力/密度/连续值)—— 深色下从深到亮 */
  --seq-1: #2a1a4a;  --seq-2: #4d2c80;  --seq-3: #7140b8;
  --seq-4: #9258e0;  --seq-5: #b88aff;
  /* diverging 双色梯度(目标偏离/涨跌) */
  --div-neg: #ff5c7a;  --div-mid: #2a2c3a;  --div-pos: #34d399;

  /* 圆角 · 阴影 · 间距 */
  --radius-control: 6px;   /* 按钮/输入框/标签 */
  --radius-panel:   8px;   /* 卡片/面板 —— 最大圆角,不超过 8px */
  --shadow-1: 0 1px 0 0 rgba(255,255,255,0.03) inset, 0 2px 8px rgba(0,0,0,0.3);  /* 卡片默认 —— 深色下靠 inset 高光 + 极淡投影 */
  --shadow-2: 0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 8px rgba(0,0,0,0.4);  /* 卡片 hover —— 模糊仍不超过 8px */
  --space-1: 8px;  --space-2: 16px;  --space-3: 24px;  --space-4: 32px;
}
```

**硬规则**:
- ❌ `--bg` 不是纯黑 `#000`,`--surface-*` 必须形成 2–3 级可辨识的深色梯度,不允许一片死黑。
- ❌ 全页只有**一个** `--accent`;不允许第二个高饱和强调色当 UI 主色,不允许彩虹按钮 / 彩虹导航。
- ❌ `--accent` 不能直接当图表第一根柱子的颜色 —— 图表用 `--data-*`(即使数值相同也是不同 token)。
- ❌ 状态色(红/绿/黄)不能和 `--data-*` 重合语义:状态色表达"好/坏/警",图表色只表达"维度区分"。
- ❌ 不允许霓虹发光(`box-shadow` 大范围彩色光晕)、不允许玻璃拟态、不允许紫蓝渐变大面积铺底、不允许装饰球。
- 深色下分组优先靠 `--border` + `--surface` 层级,不靠重阴影;`box-shadow` 模糊半径不超过 8px,深色阴影通常很淡或用 `inset` 高光替代。

---

## 2. Typography · 字体

应用系统只有 2 个字体载体:一个干净中性 sans + 一个等宽 mono。**没有 "display" 角色** —— 监控台里最大的字就是页面 title,不存在 hero 大标题那一档。

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
- ⭐ `data` 角色一律 `--font-mono` 或 `font-variant-numeric: tabular-nums`,高密度 / 实时刷新场景尤其关键 —— 避免数字跳动。
- ❌ 单个数字字号**不超过 40px**。KPI 主值 28–32px,主判断区可到 36–40px 但不再大;不存在巨型数字大屏。
- ❌ 一个字号字重跑全页 —— 必须有 title / body / data / label / meta 的角色分层。
- ❌ 衬线字体用于 UI 或数值。干净中性 sans(如 Inter)当 UI 字体是对的,不是问题。
- 文本颜色至少 3 档:`--text-1 / --text-2 / --text-3`,深色下尤其要拉开 —— 不全用一种灰,否则高密度页面糊成一片。

---

## 3. Layout · 布局(App Shell,固定桌面优先)

**整体结构 = 左侧 sidebar + 右侧 main(topbar + content)**。这是监控台的骨架,不是单列滚动页。深色高密度场景信息密度倾向 **compact**,一屏内尽量看到更多。

```
┌─────────┬──────────────────────────────────────┐
│ sidebar │ topbar (面包屑 + 视图切换 + 操作)      │
│ 232px   ├──────────────────────────────────────┤
│         │ content (max 1480px, padding 24/28)  │
│ brand   │   page-head (h1 + lead + meta-row)   │
│ nav     │   kpi-grid (4 列 KPI)                 │
│ ...     │   section (sec-head + panel + chart) │
│ foot    │   section (insight / table ...)      │
└─────────┴──────────────────────────────────────┘
```

- **sidebar**:`232px` 固定宽,`position: sticky; top:0; height:100vh`。`--surface-1` 底 + 右 `--border`。含 brand + 分组 nav + 底部数据状态卡(带实时刷新戳)。
- **topbar**:`sticky`,含面包屑(当前在哪)、视图切换 seg、主操作按钮、刷新状态。高度约 `52px`。
- **content**:`max-width: 1480px`,桌面 `padding: 24px 28px`。
- **page-head**:`h1` + 一句话 `lead`(说明这页此刻的主判断)+ `meta-row`(时间窗口 / 数据更新 / 口径)。
- **kpi-grid**:`grid-template-columns: repeat(4, 1fr)`,4 个核心指标。
- **section**:每个 `sec` 含 `sec-head`(`01 / 02` 编号 + 标题 + 右侧说明)+ 内容(panel / chart / table / insight)。
- **断点**:`1024px` 以下 sidebar 收成顶部抽屉、栅格转单列;`768px` 以下 kpi-grid 转 2 列、表格转分组卡片。**移动端按任务重排,不是桌面等比缩小**。

**硬规则**:
- ⭐ 首屏第一视觉位必须是数据(KPI 或主判断 / 主图表),**不允许 hero 区、不允许大标题占首屏、不允许装饰球 / 渐变 banner**。
- ❌ 不允许"单列从上滚到下"。必须有 sidebar + 多模块栅格的版式节奏。
- ❌ 不允许同权重 4/6/9 卡墙当页面主体;KPI 卡是辅助,主体是图表 + 表格 + 异常队列。首屏要通过尺寸 / 颜色 / 位置差异化表达优先级。
- 固定桌面宽度优先,不做"什么都往手机塌"的响应式。

---

## 4. Components · 组件

- **KPI 卡**:`--surface-1` 背景,`1px --border`,`--radius-panel`,`--shadow-1`。含 label + 方向标签(↑↓→/异常)+ mono 大数(28–32px)+ 同环比对比行;可带 mini sparkline。
- **panel / section 容器**:`--surface-1`,`1px --border`,`--radius-panel`,`padding: 16–20px`。`panel-head` = 标题 + 右侧 sub 说明。
- **表格**:行高 36px(紧凑)/ 40px(常规)。首列是主对象名。数值列右对齐 + mono。行 hover 转 `--surface-2`。表头 `--text-3` 小字。
- **图表**:用 **ECharts**(CDN 白名单)。**绝不用 div/span 设 height 堆假图表**。轴/tooltip/网格统一(见第 6 节)。
- **insight 洞察块**:`--surface-2` 或带状态色左边框(`--accent` / `--warning` / `--info`),放一句关键结论 + 支撑数据。用于把"图表说明了什么"显性化。
- **状态标签 pill**:低饱和背景(状态色 12–14% 透明)+ 状态色文字,`padding: 2px 8px`,`--radius-control`。
- **按钮**:Primary = `--accent` 底 + `--text-1` 字;Secondary = `--surface-2` 底 + `--border`;Danger = `--danger`。
- **六态**:empty / loading / error / success / disabled / permission 都要有视觉反馈,文案带业务上下文("当前筛选无告警",不是"无数据")。

**硬规则**:
- ❌ 不用统一大圆角 + 统一阴影 + 统一 emoji 图标做"模板感"。
- ❌ 不用彩色左边框承担主要信息分区(insight 块的左边框是例外,克制使用)。
- ❌ 不出现营销 CTA 按钮("立即体验""一键生成""导出巡检清单"这类与页面任务无关的按钮)。
- ❌ 深色下不堆重阴影把卡片"浮"起来 —— 靠 `--surface` 层级 + `--border` 分组。

---

## 5. 数据界面专项规则

- 每个核心数字配**单位 + 时间范围 + 对比基准**(同比/环比/目标/阈值)。
- page-head 或 topbar 显示**数据更新时间、筛选范围、刷新频率**,不让用户猜数据是否新鲜 —— 实时监控场景尤其要明确"距上次刷新多久"。
- ⭐ 首屏要有一个**主判断**:健康度 / 目标差距 / 异常优先级 / 关键趋势 —— 一句话说清这页此刻"最严重的问题是什么、影响谁、下一步"。
- 图表标题写**业务问题或结论**("加购后流失约 4 成是漏斗最薄弱节点"),不写"趋势分析""数据概览"这类空标题。
- 一个图只回答一个主要问题。异常要闭环:是什么 / 影响多少 / 可能原因 / 下一步。
- 单位、时间格式跨页面跨组件统一(不能一处"万"一处"w",一处 `2026-05-07` 一处 `5/7`)。
- 假数据要有业务连续性:KPI、异常、图表、表格、行动建议互相呼应,不自相矛盾。

---

## 6. ECharts 统一约定

所有图表共用一套配置,保证跨页面一致。骨架文件里有现成的 `axisStyleX()` / `axisStyleY()` / `tooltipStyle()` / `gridDefault()` 封装,直接复用。

- **色板**:categorical 用 `--data-1..7`;热力/密度用 `--seq-*`(深色下从深紫到亮紫);涨跌/偏离用 `--div-*`。
- **轴**:`axisLine` 用 `--border`,`axisLabel` 用 `--text-3` + mono 10–11px,`splitLine` 虚线 `--border`;深色下网格线 4–5 条即可,过密显乱。
- **tooltip**:`--surface-3` 背景,`1px --border-strong`,`--radius-control`,文本 `--text-1`;深色背景下阴影可有可无,克制。
- **网格**:`containLabel: true`,留白克制(高密度场景)。
- **数值格式**:与表格中同字段的千分位、小数位、单位完全一致。
- 折线不堆 fill + 渐变 + 圆点 + tooltip 多重装饰;饼图不做 3D / 玫瑰图;area 渐变仅用于 sparkline 这类小图,且单色低透明。

---

## 7. Anti-patterns · 本预设禁区(命中即返工)

- ❌ 首屏是 hero / 大标题 / 渐变 banner / 装饰球,真实数据被推到第二屏。
- ❌ `--bg` 用纯黑 `#000`、surface 层级不分、全页一片死黑;或反过来用霓虹发光 / 彩色光晕铺底。
- ❌ 多个高饱和强调色当 UI 主色(彩虹导航 / 彩虹按钮);accent 不止一个。
- ❌ 巨型数字(>40px)、超大圆角(>8px)、重阴影(模糊 >8px)、紫蓝渐变铺底、玻璃拟态。
- ❌ div/span 堆出来的假图表。
- ❌ 同权重 KPI 卡墙当页面主体,没有主判断、没有图表表格 / 异常队列承担优先级。
- ❌ 数字没用 tabular-nums / mono,实时刷新或长列表滚动时数字跳动。
- ❌ 英文 eyebrow / 营销 CTA / "Generated by" footer 占视觉重心。
- ❌ 系统色 / 图表色 / 状态色用同一组颜色跑完。
- ❌ 单列从上滚到下,没有 sidebar、没有版式节奏。
- ❌ 移动端是桌面等比缩小,而不是按任务重排。
