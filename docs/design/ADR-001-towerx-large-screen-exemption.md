# ADR-001 · SuperApp Globe(暗夜美学库)豁免 design:lint

状态：Accepted（草案，待 GuanCLI 团队确认）
日期：2026-05-19（2026-05-25 配合产品定位重塑更新标题与措辞）
决策者：[设计部门 / 你的名字]

> 注：本 ADR 原版面向"TowerX 高端大屏"模板，2026-05-25 产品定位重塑为
> `@guandata/superapp-globe`（3D 地球美学层 npm 包）后，豁免理由依然成立
> ——美学库的核心资产（暗夜 bloom + 玻璃 HUD + 大字号 hero）与 design:lint
> 的 BI 仪表板硬底线天然冲突，需要正式豁免。

## 上下文

观远 SuperApp 模板自带 `scripts/design-lint.mjs`，是 BI 仪表板硬底线的
静态扫描脚本，禁止以下视觉手段：

- `radial-gradient(` 任意径向渐变
- `backdrop-filter: blur` 玻璃拟态
- `border-radius > 8px`（pill ≥ 900px 例外）
- `font-size > 40px`
- `box-shadow blur > 8px`

设计立场用观远脚本注释里的话："这是 BI 看板，不是 SaaS 营销页"。

但 SuperApp Globe（暗夜美学库）基于 16 轮反馈调出的视觉资产，
五条核心规则与上述硬底线直接冲突：

| 观远 design:lint 禁的 | SuperApp Globe 用的 |
|---|---|
| radial-gradient | #005 暗背景由 N 个 radial bloom + 渐变叠加 |
| backdrop-filter:blur | #012 玻璃两档制（blur 8px / 48px）|
| border-radius > 8px | #011 Card 圆角 28px |
| font-size > 40px | Hero 标题 clamp(40px, 4.8vw, 84px) |
| shadow blur > 8px | strong 玻璃 0 28px 70px 阴影 |

## 决策

把使用 SuperApp Globe 的页面定位为 `pgType: LARGE_SCREEN`（与观远默认
PAGE 仪表板并列的独立页面类型），从设计立场上承认"大屏 ≠ 仪表板"，
正式豁免 design:lint 的 BI 仪表板硬底线约束。

具体执行：

1. SuperApp Globe 代码集中在 `src/components/towerx/` 目录下（内部代号 TowerX 保留），
   与观远默认 `src/styles.css` / `src/App.tsx` 等顶层占位文件物理隔离
2. 包的样式不通过 `src/styles.css` 入口注入，改用：
   - Tailwind utility class（首选）
   - 内联 style（含 R3F shader uniform）
   - CSS Modules（如 `src/components/towerx/Globe.module.css`）
3. design:lint 默认扫描的 3 个文件（src/styles.css + docs/design/skeleton-*.html）
   保留观远占位样式，不引入 TowerX 风格 —— design:lint 在这 3 个文件上仍生效
4. 发布时通过 settings.json / manifest 标注 `pgType: 'LARGE_SCREEN'`

## 后果

### 正面

- SuperApp Globe 9 条高端皮肤包规则可完整落地，视觉差异性不妥协
- 与观远"传统 BI 仪表板"视觉语言形成清晰区分，不互相干扰
- 维持 design:lint 对常规 BI 仪表板（PAGE pgType）的硬底线约束

### 负面 / 风险

- 与观远 GuanCLI 团队需正式对齐这个豁免路径（见 §待办）
- 若未来 `guancli app publish` 流程加入强制 design:lint 校验，需提前
  做参数级豁免（见 §待办）
- 设计部门需额外维护"TowerX LARGE_SCREEN 视觉规则"作为独立的设计
  规范文件（已有：`08_skin_pack_premium.md`）

## 待办

1. 与 GuanCLI 工程团队对齐 LARGE_SCREEN pgType 的豁免路径
2. 确认 `guancli app publish` 流程未来是否引入 design:lint 强制校验
3. 长期争取在观远 design-lint.mjs 脚本中加入 `--page-type=LARGE_SCREEN`
   原生豁免参数
4. MVP 送审时，上传 `08_skin_pack_premium.md` 到团队共享盘 / Notion / 飞书，
   并将本 ADR §关联中的文档引用替换为可访问 URL

## 关联

- **TowerX 复盘 v1.0 高端皮肤包 9 条核心规则**
  - 维护方：设计部门
  - 文档：`_retrospective/08_skin_pack_premium.md`
  - 路径说明：设计部门内部资产，项目仓库内不维护副本，以设计部门维护版为准
  - MVP 送审时另行上传至团队共享盘 / Notion / 飞书并替换为 URL
- 观远 SuperApp `src/bi-services/page.ts` 的 `IPageInfo['pgType']` 枚举
- 观远 `scripts/design-lint.mjs` 521 行硬编码规则