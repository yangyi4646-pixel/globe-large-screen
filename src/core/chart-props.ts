import type { BIFieldNumberFormat } from '@/vite-env';

type AnyRecord = Record<string, any>;

export enum LineType {
    SOLID = 'solid',
    DASHED = 'dashed',
    DOTTED = 'dotted',
}

export enum AxisTitlePosition {
    OUTSIDE = 'outside',
    TOP = 'top',
}

export type TextStyle = {
    family?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikeThrough?: boolean;
    size?: number;
    color?: string;
};

export type LineStyle = {
    lineType?: LineType;
    lineWidth?: number;
    lineColor?: string;
};

export type ChartThemeColor = {
    tcId: string;
    theme: string;
    colors: string[];
    useSequentialPalette?: boolean;
};

export type PivotAppearance = {
    theme?: 'classic' | 'compact';
    colorType?: 'grey' | 'spring';
    banding?: { enabled: boolean; colors?: string[] };
    border?: { enabled: boolean; colors: string[] };
    divider?: { colors: string[] };
    backgroundColor?: string;
    colWidth?: number;
    fontFamily?: string;
    fontSize?: number;
};

export type ChartAxisTitle = {
    showTitle?: boolean;
    title?: string;
    dvt?: string;
    titleFontSize?: number;
    titleColor?: string;
    titleBold?: boolean;
    titleItalic?: boolean;
    titleUnderline?: boolean;
    unit?: string;
    titlePosition?: AxisTitlePosition;
};

export type ValueAxis = ChartAxisTitle & {
    visible?: boolean;
    min?: number;
    max?: number;
    autoExtremes?: boolean;
    autoTickInterval?: boolean;
    tickInterval?: number;
    showGridLine?: boolean;
    gridLineStyle?: LineStyle;
    reverseValue?: boolean;
    format?: BIFieldNumberFormat;
    formatDefn?: AnyRecord;
    labelFontSize?: number;
    labelColor?: string;
    labelBold?: boolean;
    labelItalic?: boolean;
    labelUnderline?: boolean;
    breaks?: Array<{ start: number; end: number }>;
    unifyAxisRange?: boolean;
};

export type CategoryAxis = Omit<ChartAxisTitle, 'unit'> & {
    visible?: boolean;
    textLength?: number;
    step?: number;
    autoRotate?: number;
    labelFontSize?: number;
    labelColor?: string;
    labelBold?: boolean;
    labelItalic?: boolean;
    labelUnderline?: boolean;
    isFixTop?: boolean;
    showAxisLine?: boolean;
    axisLineStyle?: LineStyle;
};

export type ChartAxis = {
    categoryAxis?: CategoryAxis;
    baseAxis?: ValueAxis;
    mainAxis?: ValueAxis;
    secondaryAxis?: ValueAxis;
    navigator?: { showNavigator?: boolean; fixedValueAxis?: boolean; fixedOnRight?: boolean };
};

export type DataLabel = {
    showSeries?: boolean;
    showCategory?: boolean;
    showNumber?: boolean;
    showConnector?: boolean;
    showPercentage?: boolean;
    showSubPercentage?: boolean;
    showTotal?: boolean;
    showSubTotal?: boolean;
    precision?: string;
    separator?: string;
    fontSize?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    position?: string;
    textOutline?: boolean;
    allowOverlap?: boolean;
};

export type ChartDataLabels = {
    metric: DataLabel & { showTotal?: boolean; position?: string };
    metricAdditional?: DataLabel;
    showNumber?: boolean;
    showCategory?: boolean;
    showSeries?: boolean;
    enabled?: boolean;
    lastMetric?: DataLabel;
    category?: DataLabel;
    conversionRate?: DataLabel;
};

export type ChartLineDisplay = {
    skipNulls?: boolean;
    showArea?: boolean;
    colorType?: string;
    opacity?: number;
    showPoint?: boolean;
    pointShape?: string;
    pointSize?: number;
    showAsSpline?: boolean;
    lineStyle?: string;
    secondSetting?: Partial<ChartLineDisplay>;
};

export type ChartBarDisplay = ChartLineDisplay & {
    swapYShape?: boolean;
    symbols?: string[];
    symbolSize?: number;
    gapBetweenGroup?: number;
    gapInGroup?: number;
    useBarWidth?: boolean;
    barWidth?: number;
    barBorderRadius?: number;
};

export type ChartTooltip = {
    order?: string;
    enabled?: boolean;
    maxNumber?: number;
    onlyTooltipSeries?: boolean;
    hideTooltipColor?: boolean;
    hideTooltipTotal?: boolean;
    style?: { body?: TextStyle; title?: TextStyle; backgroundColor?: string };
    showNumber?: boolean;
};

export type ChartMiscPivotTableSetting = {
    autoAlignment?: boolean;
    pagination?: boolean;
    pageSize?: number;
    showLineNumber?: boolean;
    lineNumberTitle?: string;
    lineNumberType?: string;
    lineNumberStyle?: TextStyle;
    textWrap?: boolean;
    vAlign?: 'MIDDLE' | 'TOP';
    fixedHeaderInfo?: { X?: boolean; Y?: boolean };
    isDefaultExpandedGroupedTable?: boolean;
    defaultExpandCols?: number;
};

export type ChartMapSetting = {
    underColor?: string;
    borderColor?: string;
    region?: 1 | 2 | 3 | 4;
    customRegion?: string;
    province?: { name: string; code: string };
    city?: { name: string; code: string };
    showNullAsZero?: boolean;
    area?: { hover?: { color: string } };
    symbol?: string;
    symbolSize?: number;
};

export type BaiduMapSetting = {
    tileType?: string;
    shape?: string;
    size?: number;
};

export type AuxiliaryLine = {
    mainAxis?: AnyRecord[];
    secondaryAxis?: AnyRecord[];
    baseAxis?: AnyRecord[];
};

export type ChartLegend = {
    showLegend?: boolean;
    legendPosition?: 'top' | 'bottom' | 'left' | 'right';
    legendCrossPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
    invisibleLegends?: number[];
    invisibleLegendKeys?: string[];
    customLegend?: {
        pagination?: boolean;
        showNumber?: boolean;
        showPercentage?: boolean;
        autoAlignment?: boolean;
        legendItemWidth?: number;
    };
} & TextStyle;

export type ChartGroupTotal = { show?: boolean; color?: string };
export type SplitSetting = {
    splitRows?: number;
    splitColumns?: number;
    titleFormat?: TextStyle;
    isolatedChartTooltip?: boolean;
    syncY?: boolean;
};

export type ChartFeedback = { mobileEnable?: boolean; open?: boolean; config?: AnyRecord };
export type ProgressBarSetting = AnyRecord & {
    background?: string;
    color?: string;
    labelPosition?: number;
    showPercent?: boolean;
    height?: number;
    borderRadius?: number;
};
export type ProgressPieSetting = AnyRecord & {
    colorMode?: 'solo' | 'sectional' | 'gradient' | 'interval';
    startAngle?: number;
    showTicks?: boolean;
};

export type LiquidGaugeSetting = AnyRecord & {
    bandedColor?: string;
    liquidColor?: string;
    intervalColors?: Array<{
        key: string;
        color: string;
        interval: [number?, number?];
        type: 'interval' | 'more_than' | 'less_than';
    }> | null;
    showMainLabelName?: boolean;
    mainLabel?: string;
    mainLabelName?: string;
    percentName?: string;
    mainLabelColor?: string;
    mainLabelValueColor?: string;
    mainFontFamily?: string;
    mainLabelFontFamily?: string;
    mainFontSize?: number;
    mainLabelFontSize?: number;
    mainBold?: boolean;
    mainItalic?: boolean;
    mainUnderline?: boolean;
    mainLabelBold?: boolean;
    mainLabelItalic?: boolean;
    mainLabelUnderline?: boolean;
    otherFontFamily?: string;
    otherFontSize?: number;
    otherColor?: string;
    otherBold?: boolean;
    otherItalic?: boolean;
    otherUnderline?: boolean;
    mainSpecifier?: string;
    secondarySpecifier?: string;
    labelPosition?: number;
    showCurrent?: boolean;
    showPercent?: boolean;
    showTarget?: boolean;
};

export type PieSetting = {
    innerSize?: number;
    showAsRing?: boolean;
    mergeOther?: boolean;
    mergeSize?: number;
    mergeColor?: string;
    size?: number;
    centerDisplay?: boolean;
};

export type CenterTextSetting = {
    showCenterText?: boolean;
    valueType?: 'percent' | 'number';
    valueFont?: TextStyle;
    textFont?: TextStyle;
};

export type SingleValueSetting = {
    fontStyle?: TextStyle;
    labelStyle?: TextStyle & { show: boolean };
    alignment?: string;
    icon?: AnyRecord & { show?: boolean };
    labelPosition?: string;
    kpiAlignment?: string;
    labelMaxWidth?: number;
};

export type MainKpiSetting = {
    value?: TextStyle;
    label?: TextStyle & { show: boolean };
    icon?: AnyRecord & { show?: boolean };
};

export type SecondKpiSetting = {
    layout: string;
    alignment?: string;
    dividingLineColor?: string;
    value?: TextStyle;
    label?: TextStyle;
    iconStyle: string;
    iconShowMap?: Record<number, false>;
};

export type ChartProps = {
    themeColor?: ChartThemeColor;
    pivot_appearance?: PivotAppearance;
    axes?: ChartAxis;
    dataLabels?: ChartDataLabels;
    miscLineSetting?: ChartLineDisplay;
    miscBarSetting?: ChartBarDisplay;
    auxiliaryLine?: AuxiliaryLine;
    chartLegend?: ChartLegend;
    tooltip?: ChartTooltip;
    splitSetting?: SplitSetting;
    stackSplitSetting?: { mode?: string };
    miscPivotTableSetting?: ChartMiscPivotTableSetting;
    groupTotal?: ChartGroupTotal;
    sizePivotTable?: any;
    feedback?: ChartFeedback;
    cardResultStore?: { open: boolean; actionName: string };
    highmapSetting?: ChartMapSetting;
    baiduMapSetting?: BaiduMapSetting;
    grandTotal?: {
        grandtotalStyle?: AnyRecord & { showDetail: boolean; alias: string };
        subtotalStyle?: AnyRecord & { showDetail: boolean; alias: string };
        onRow?: { position: 'TOP' | 'BOTTOM' | 'HIDE' };
        onColumn?: { position: 'LEFT' | 'RIGHT' | 'HIDE' };
    };
    pieSetting?: PieSetting;
    centerTextSetting?: CenterTextSetting;
    singleValueSetting?: SingleValueSetting;
    mainKpiSetting?: MainKpiSetting;
    secondKpiSetting?: SecondKpiSetting;
    bubbleSetting?: { minScale?: number; maxScale?: number };
    progressBarSetting?: ProgressBarSetting;
    specialValue?: { specialValue: string };
    chartState?: { min: number; max: number };
    dsAutoCarouselSetting?: { interval?: number; isAutoCarouselOpen?: boolean };
    dsTooltipStyle?: { style: 'default' | 'style_1' | 'style_2' | 'style_3' | 'style_4' | 'style_5' };
    progressPieSetting?: ProgressPieSetting;
    activityGaugeSetting?: AnyRecord;
    liquidGaugeSetting?: LiquidGaugeSetting;
    paretoSetting?: { paretoName?: string; format?: { decimalPlaces: number; divideDataBy: number; formatType: string } };
    boxPlotSetting?: AnyRecord & { themeStyle?: 'CLASSIC'; lineColor?: string; fillColor?: string; dataPointColor?: string; showAll?: boolean };
    autoCarouselSetting?: { enabled: boolean; type: string; duration?: number; speed?: number };
    autoScroll?: { enabled: boolean; type: string; duration: number };
    heatMapSetting?: { startColor?: string; endColor?: string; gridColor?: string; dataLabel?: boolean };
    fontSetting?: { first: DataLabel; second: DataLabel };
    miscRadarSetting?: AnyRecord & { showPoint?: boolean; showSolidFill?: boolean; showAsSpline?: boolean; drawByMetric?: boolean; opacity?: number };
    miniChart?: Record<string, any>;
};
