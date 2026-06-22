# 实现工艺 · BI 场景

> 本文件是 BI / 数据场景的**实现工艺细节**,按需 1 跳查阅。
> 核心约束在 `AGENTS.md` 正文;三层 token、字号圆角值、布局规格、ECharts 约定、各自 anti-patterns 在 `DESIGN-workbench-light.md` / `DESIGN-dashboard-dark.md`。
> 本文件只补充那两份没讲的:HTML/CSS/React 实现工艺、响应式纪律、六态、动态文本、稳定尺寸、跨页面一致性。**不重复 DESIGN 预设已有内容。**

## 交付格式与依赖

- 默认单文件 HTML(CSS 用 `<style>` inline、JS 用 `<script>` inline),零构建依赖。
- 本仓库走 `src/` 工程时,按 React + TS 实现,仍遵守下面的工艺约束。
- CDN 白名单:Tailwind CDN、ECharts、Chart.js、d3、Plotly。不引入需编译的 npm 包,除非用户明确指示。
- 图标 / 字体优先 CDN 或 inline SVG,不依赖 build 流程产物。

## 必需工艺

- 语义化 HTML 地标:`header` / `nav` / `main` / `section` / `aside` / `footer`。
- 用 CSS custom properties 管理颜色、字体、间距、圆角、阴影、动效(具体 token 见 DESIGN-*.md)。
- 文本自然回流,避免固定高度导致截断。
- 重复控件、网格、tile、计数器、媒体区必须有稳定尺寸。
- 图片 / 媒体 / canvas 用 `width`/`height` 或 `aspect-ratio` 预留空间。
- 正文默认 ≥16px(明确的小标签场景例外)。
- 尊重 `prefers-reduced-motion`。

## 响应式断点纪律

- 适配 375 / 768 / 1024 / 1440px;移动端无横向滚动。
- **移动端按任务优先级重排,不是桌面列机械堆叠**。顺序:① 当前任务和关键状态 → ② 主要操作 → ③ 摘要 / 排行 / 重点明细 → ④ 次级筛选、长表格、历史记录。
- 表格在移动端优先转为摘要卡、分段详情、重点排行或可折叠列表;横向滚动只作兜底。
- sidebar 折叠为顶部 / 底部导航、抽屉或页内锚点。
- 筛选器分层展示,不挤成一排小控件。
- 固定元素避开移动端安全区域,并给内容预留空间。

## 六态:empty / loading / error / success / disabled / permission

- 每个与当前页面相关的状态都要有视觉反馈,不是空白。
- loading:skeleton / spinner / 占位灰块;empty:占位提示组件;error:错误图标 + 提示区。
- 状态文案保留数据语境:"当前筛选无渠道数据",不是"无数据";"暂无权限查看该门店",不是"403"。
- `:focus-visible` / `:hover` / `:active` / `disabled` 状态可见;主要交互触控目标 ≥44px。
- empty / loading / 长文案 / 错误态切换不得造成布局跳动。

## 动态文本回流

默认用语义流 + 自然换行 + 弹性容器。只有在文本可编辑、卡片高度很紧、字体加载影响明显、resize 后易跳动时,才加测量与回流逻辑:

```text
document.fonts.ready  -> measure text -> reserve or update height
ResizeObserver        -> remeasure affected containers
MutationObserver      -> remeasure editable text
```

- 字体加载完成后再确认文本高度,避免首屏跳动。
- 按可用宽度、真实 line-height、内容长度设置 `min-height` 或保留空间。
- 优先浏览器原生能力;只有项目明确提供文本布局引擎时才引入工具。

## 稳定尺寸

- 文本和容器高度由内容自然撑开,少用硬编码高度。
- 重复模块、图表、表格、截图、canvas 要有稳定尺寸或 `aspect-ratio`。
- 按钮不随文案长度变化撑变形;文本能承受最长真实文案,无孤行 / 寡行。
- 动效优先 `transform` / `opacity`,避免宽高 / top / left 驱动布局跳动。

## 跨页面 / 跨区域一致性

- **同名指标颜色一致**:跨页面用同一 `--data-*` token,不漂移。
- **chrome 语气一致**:表头、筛选器、KPI 卡的描边 / 阴影 / 间距 / 字号 / 字重跨页面统一。
- **图表风格一致**:色板、网格密度、轴样式、轴字号、tooltip 形态跨页面 / 跨区域一致(ECharts 配置详见 DESIGN-*.md 第 6 节,所有页面复用同一套封装)。
- **单位风格统一**:`%` / `$` / `CNY` / `万` / `亿` / `次` / `人` 跨页面跨组件统一,不一处带空格一处不带、一处中文一处英文。
- **时间格式统一**:`2026-05-07` 与 `5/7/26` 不混用,中英文不混用。
- **tooltip 与表格格式一致**:相同字段的千分位、小数位、单位完全一致。

## 数据界面专项规则

(token 级的 color.data / typography.data / 数字工艺见 DESIGN-*.md;这里是页面构造层面的规则。)

- 每个核心数字配单位、时间范围、对比基准(同比 / 环比 / 目标 / 阈值)或解释入口。
- 显示数据更新时间、筛选范围、数据状态,不让用户猜数据是否新鲜。
- 首屏必须有一个**主判断**:健康度 / 目标差距 / 异常优先级 / 关键趋势 —— 一句话说清这页此刻的结论。
- 图表标题写业务问题或结论("利润恢复没跟上规模"),不写"趋势分析""数据概览"。
- 一个图只回答一个主要问题;图表不能只靠颜色表达含义,补标签 / 图例 / 文本说明 / 形状 / 直接标注。
- 异常要闭环:是什么 / 影响多少 / 可能原因 / 下一步动作 / 负责人或优先级。
- 漏斗、热力、排行、趋势、分布等图形要与用户决策匹配,不为"丰富视觉"硬塞图。
- 假数据要有业务连续性:KPI、异常、图表、表格、行动建议互相呼应,不自相矛盾。

## 交付前自检清单

纯文字、可逐条自查(不依赖截图)。命中"否"即返工:

- 首页已替换为真实业务体验,不再是模板说明页?`index.html` 的 `title` / `description` / `favicon` 已匹配真实项目?
- 首屏第一视觉位是数据(KPI 或主图表),不是 hero / 大标题 / 装饰?
- 有 sidebar + 多模块栅格的版式节奏,不是单列从上滚到下?
- 图表是真 ECharts,不是 div/span 设 height 堆的假图表?
- 系统色 / 图表色 / 状态色三层独立 token,没有同源?
- 数字用 `tabular-nums` 或 monospace,不会跳动?单位 / 时间格式跨页面统一?
- 六态(empty / loading / error / success / disabled / permission)中与本页相关的都有视觉反馈,且文案带业务上下文?
- 最长真实文案能换行不破坏布局?按钮不被文案撑变形?
- 375px 下页面仍可用、无横向滚动、按任务重排而非桌面缩小?移动端表格已转卡片 / 摘要?
- 去掉装饰性阴影后,设计结构是否仍然成立?
- 多路由应用仍是单 `index.html` 入口的 SPA?
- 未命中 `ai-taste-forbidden.md` 任一禁区?
- 已实际跑过 `npm run dev` 渲染确认 —— 无法渲染不得声称完成。
