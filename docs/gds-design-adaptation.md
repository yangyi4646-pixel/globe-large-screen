# GDS 设计规范适配指南

这个项目不强制使用 GDS，也不限制 UI 框架。

如果业务页面已经基于现有 UI 框架或样式方案实现，但又希望视觉上逐步贴近观远设计规范，可以把 GDS token 作为一层“变量映射”来接入，而不是推倒重写现有 UI。

## 适用场景

- 已有页面能正常开发，不希望因为模板默认约束而被迫改用某套组件库
- 需要把现有页面逐步调整到更接近观远视觉规范
- 需要在保留现有 UI 框架的前提下，统一颜色、圆角、间距、阴影、字号

## 原则

- GDS token 是可选参考，不是默认强制规范
- 保留现有 UI 框架和组件体系，优先做变量映射，不要求整站重构
- 优先替换主题变量、设计 token、全局样式入口；不要先逐个组件手改样式
- 允许按页面或按模块渐进迁移，不要求一次性切完

## 推荐接入方式

1. 先保留现有 UI 框架和组件写法
2. 在项目样式入口引入或复制需要的 token 定义
3. 把框架主题变量映射到 GDS token
4. 仅在必要处替换组件内的局部硬编码样式

完整 token 参考见 [`gds-design-tokens.css`](./gds-design-tokens.css)。

## 常用 Token

| Token                        | 用途           |
| ---------------------------- | -------------- |
| `--color-background`         | 页面背景       |
| `--color-background-alt`     | 卡片、浮层背景 |
| `--color-text-body-default`  | 主文本颜色     |
| `--color-text-body-secondly` | 次文本颜色     |
| `--color-border-outline`     | 输入框、描边   |
| `--color-button-primary`     | 主按钮背景     |
| `--space-16`                 | 常规内边距     |
| `--space-24`                 | 区块间距       |
| `--radius-m`                 | 默认圆角       |
| `--shadow-panel-down`        | 卡片/面板阴影  |
| `--font-size-subtitle-14`    | 默认正文大小   |
| `--line-height-subtitle-14`  | 默认正文行高   |

## 映射建议

### 现有样式方案

直接消费 CSS 变量即可：

```css
.card {
    background: var(--color-background-alt);
    color: var(--color-text-body-default);
    border: var(--border-base) solid var(--color-border-outline);
    border-radius: var(--radius-m);
    padding: var(--space-24);
    box-shadow: var(--shadow-panel-down);
}

.description {
    color: var(--color-text-body-secondly);
    font-size: var(--font-size-subtitle-14);
    line-height: var(--line-height-subtitle-14);
}
```

### 组件库主题

如果使用 Ant Design、MUI、Element 等组件库，优先从以下维度做主题映射：

- 主色映射到 `--color-button-primary` / `--color-text-link`
- 背景色映射到 `--color-background` / `--color-background-alt`
- 文本色映射到 `--color-text-body-default` / `--color-text-body-secondly`
- 边框色映射到 `--color-border-outline` / `--color-border-divide`
- 圆角映射到 `--radius-s` / `--radius-m` / `--radius-round`
- 阴影映射到 `--shadow-panel-down` / `--shadow-popover-down` / `--shadow-modal-down`

## 渐进替换建议

- 第一阶段：先统一颜色、圆角、阴影
- 第二阶段：再统一 spacing 和 typography
- 第三阶段：最后处理组件库主题覆盖和深层状态样式

## 不建议的做法

- 把 GDS 当成强制技能，导致所有前端任务都被绑定到同一套规范
- 为了对齐 token，重写已经可用的业务组件
- 在同一个组件里同时混用一套新的硬编码值和一套 GDS token
- 还没建立变量映射，就开始大面积手工改 class 或 selector

## 结论

GDS 在这个项目中应该作为“可选适配文档”存在，而不是默认前端生成约束。需要对齐观远设计规范时，优先做 token 映射和主题替换；不需要时，继续使用现有框架与 UI 方案即可。
