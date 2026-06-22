import type { BIFieldNumberFormat, BIFieldType, BIGranularity } from '@/vite-env';
import type { ChartProps } from './chart-props';

// Keep this list aligned with the chart types supported by the BI open chart renderer.
export const ChartType = {
    BASIC_COLUMN: 'BASIC_COLUMN',
    GROUPED_COLUMN: 'GROUPED_COLUMN',
    STACKED_COLUMN: 'STACKED_COLUMN',
    STACKED_SPLIT_COLUMN: 'STACKED_SPLIT_COLUMN',
    PERCENT_STACKED_COLUMN: 'PERCENT_STACKED_COLUMN',
    GROUPED_COLUMN_WITH_LINE: 'GROUPED_COLUMN_WITH_LINE',
    STACKED_COLUMN_WITH_LINE: 'STACKED_COLUMN_WITH_LINE',
    GROUPED_COLUMN_WITH_SYMBOL: 'GROUPED_COLUMN_WITH_SYMBOL',
    STACKED_COLUMN_WITH_SYMBOL: 'STACKED_COLUMN_WITH_SYMBOL',
    WATERFALL_COLUMN: 'WATERFALL_COLUMN',
    PARETO: 'PARETO',
    BASIC_BAR: 'BASIC_BAR',
    GROUPED_BAR: 'GROUPED_BAR',
    STACKED_BAR: 'STACKED_BAR',
    STACKED_SPLIT_BAR: 'STACKED_SPLIT_BAR',
    PERCENT_STACKED_BAR: 'PERCENT_STACKED_BAR',
    BASIC_LINE: 'BASIC_LINE',
    MULTI_LINE: 'MULTI_LINE',
    RADAR_LINE: 'RADAR_LINE',
    STACKED_AREA: 'STACKED_AREA',
    PERCENT_STACKED_AREA: 'PERCENT_STACKED_AREA',
    PIE: 'PIE',
    RISING_SUN: 'RISING_SUN',
    BULLET_BAR: 'BULLET_BAR',
    BULLET_COLUMN: 'BULLET_COLUMN',
    BASIC_SCATTER_PLOT: 'BASIC_SCATTER_PLOT',
    BASIC_BUBBLE: 'BASIC_BUBBLE',
    WORLD_MAP_BASIC: 'WORLD_MAP',
    CHINA_MAP_BASIC: 'BASIC_MAP',
    CHINA_MAP_WITH_BUBBLE: 'BUBBLE_MAP',
    CHINA_MAP_WITH_SYMBOL: 'POINT_MAP',
    PROGRESS_BAR: 'PROGRESS_BAR',
    PROGRESS_PIE: 'PROGRESS_PIE',
    ACTIVITY_GAUGE: 'ACTIVITY_GAUGE',
    KPI_CARD: 'KPI_CARD',
    SINGLE_VALUE: 'SINGLE_VALUE',
    FUNNEL: 'FUNNEL',
    HORIZONTAL_FUNNEL: 'HORIZONTAL_FUNNEL',
    PIVOT_TABLE: 'PIVOT_TABLE',
    HEAT_MAP: 'HEAT_MAP',
    TREEMAP: 'TREE_MAP',
    BOX_PLOT: 'BOX_PLOT',
    DATA_GRID: 'DATA_GRID',
    BUTTERFLY: 'BUTTERFLY',
} as const;

export type ChartTypeValue = (typeof ChartType)[keyof typeof ChartType];

export const ZoneType = {
    ROW: 'row',
    COLUMN: 'column',
    METRIC: 'metric',
    METRIC_ADDITIONAL: 'metric_additional',
    FILTER: 'filters',
    SORT: 'sorting',
    COLOR_BY: 'colorBy',
    SIZE_BY: 'sizeBy',
    TOOLTIP: 'tooltip',
    SPLIT: 'split',
} as const;

export type ZoneTypeValue = (typeof ZoneType)[keyof typeof ZoneType];
export type AnyRecord = Record<string, any>;

export type ChartFieldFormat = {
    numberFormat?: BIFieldNumberFormat;
    headerFormat?: AnyRecord;
    conditionFormat?: AnyRecord;
    itemSetting?: AnyRecord;
};

export type BaseZoneField = {
    id?: string;
    key?: string;
    fdId?: string;
    dsId?: string;
    name?: string;
    title?: string;
    alias?: string;
    fdType?: BIFieldType;
    metaType?: string;
    granularity?: BIGranularity;
    formula?: string;
    fieldFormat?: ChartFieldFormat;
    subZoneId?: string;
    dzId?: string;
    shared?: boolean;
    isStatic?: boolean;
    isHidden?: boolean;
    isDrill?: boolean;
} & AnyRecord;

export type DimensionZoneField = BaseZoneField & {
    zoneId?: typeof ZoneType.ROW | typeof ZoneType.COLUMN | typeof ZoneType.SPLIT;
};

export type MetricZoneField = BaseZoneField & {
    id: string;
    zoneId?: typeof ZoneType.METRIC | typeof ZoneType.METRIC_ADDITIONAL | typeof ZoneType.COLOR_BY | typeof ZoneType.SIZE_BY | typeof ZoneType.TOOLTIP;
    advCalc?: AnyRecord;
    miniChart?: AnyRecord;
    subtotalSetting?: AnyRecord;
};

export type FilterZoneField = BaseZoneField & {
    zoneId?: typeof ZoneType.FILTER;
    filterType?: string;
    filterValue?: Array<string | null>;
    filterLevel?: string;
    refKey?: string;
};

export type SortingZoneField = BaseZoneField & {
    zoneId?: typeof ZoneType.SORT;
    aggrType?: string;
    ordering?: string;
    refKey?: string;
};

export type AnyZoneField = DimensionZoneField | MetricZoneField | FilterZoneField | SortingZoneField | BaseZoneField;

export type ZoneData = {
    [ZoneType.ROW]?: DimensionZoneField[];
    [ZoneType.COLUMN]?: DimensionZoneField[];
    [ZoneType.SPLIT]?: DimensionZoneField[];
    [ZoneType.METRIC]?: MetricZoneField[];
    [ZoneType.METRIC_ADDITIONAL]?: MetricZoneField[];
    [ZoneType.COLOR_BY]?: MetricZoneField[];
    [ZoneType.SIZE_BY]?: MetricZoneField[];
    [ZoneType.TOOLTIP]?: MetricZoneField[];
    [ZoneType.FILTER]?: FilterZoneField[];
    [ZoneType.SORT]?: SortingZoneField[];
};

export type ChartMainMeta = {
    zoneData: ZoneData;
    props?: ChartProps;
    zoneInfo?: AnyRecord;
    [key: string]: any;
};

export type OpenChartMeta = {
    chartMain: ChartMainMeta;
    [key: string]: any;
};

export type CardLikeForChartMeta = {
    content: {
        chartType: string;
        meta?: {
            chartMain?: {
                zoneData?: ZoneData;
            };
        };
    };
};
