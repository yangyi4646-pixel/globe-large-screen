import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import './primitives.css';

export type LiquidGlassVariant = 'panel' | 'pill';

export type LiquidGlassPanelProps = HTMLAttributes<HTMLElement> & {
    /**
     * 视觉变体:
     *  - `panel`(默认)= 大圆角玻璃卡,用作 HUD 容器(右栏 / 详情 / 自定义指标面板)。
     *  - `pill` = 小尺寸玻璃胶囊,用作状态标签(LIVE / 异常 / AI 等)。
     */
    variant?: LiquidGlassVariant;
    /** 毛玻璃模糊半径(px)。默认 14(16 轮视觉反馈基准值)。 */
    blur?: number;
    /** 圆角(数字按 px 处理,或传任意 CSS 长度)。panel 默认 28,pill 默认全圆角。 */
    radius?: number | string;
    /** 渲染的 HTML 标签,默认 `div`。可传 `section` / `aside` 等做语义化。 */
    as?: ElementType;
    children?: ReactNode;
};

/**
 * `<LiquidGlassPanel>` —— 玻璃拟态 HUD 容器原语。
 *
 * 把暗夜大屏标志性的"漂浮玻璃面板"封装成可复用组件:消费方用它包裹自己的
 * 业务标题 / 指标 / 内容,无需重写 backdrop-filter + 内侧亮带 + 大柔和阴影
 * 这套手感参数。视觉数值来自 16 轮反馈,与样板(SuperAppGlobeApp)一致。
 *
 * 样式随 `@guandata/superapp-globe/styles` 一起发布;`blur` / `radius` 通过
 * CSS 变量覆盖,其余视觉走 `className` / `style` 增量叠加。
 */
export function LiquidGlassPanel({
    variant = 'panel',
    blur,
    radius,
    as,
    className,
    style,
    children,
    ...rest
}: LiquidGlassPanelProps) {
    const Tag = (as ?? 'div') as ElementType;

    const cssVars: Record<string, string> = {};
    if (blur != null) cssVars['--sag-glass-blur'] = `${blur}px`;
    if (radius != null) {
        cssVars['--sag-glass-radius'] = typeof radius === 'number' ? `${radius}px` : radius;
    }

    const classNames = ['sag-glass-panel'];
    if (variant === 'pill') classNames.push('sag-glass-panel--pill');
    if (className) classNames.push(className);

    const mergedStyle = { ...cssVars, ...style } as CSSProperties;

    return (
        <Tag className={classNames.join(' ')} style={mergedStyle} {...rest}>
            {children}
        </Tag>
    );
}
