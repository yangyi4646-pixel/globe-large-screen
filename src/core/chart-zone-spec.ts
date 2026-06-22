import {
    ChartType,
    ZoneType,
    type AnyZoneField,
    type CardLikeForChartMeta,
    type ChartTypeValue,
    type ZoneData,
    type ZoneTypeValue,
} from './chart-types';

export type ZoneBasicSpec = {
    zoneId: ZoneTypeValue;
    maxCount: number;
    minCount: number;
};

export type ZoneFieldKind =
    | 'dimension'
    | 'metric'
    | 'metricOrDynamicMetric'
    | 'dimensionOrMetric'
    | 'sharedDimension'
    | 'sharedOrDynamicDimension'
    | 'sharedDimensionOrMetric'
    | 'sharedOrDynamicDimensionOrMetricPlaceholder'
    | 'metricPlaceholder'
    | 'any';
export type ZoneValidationSpec = { acceptedKinds: ZoneFieldKind[] };
export type ZoneIndexedValidationSpec = Partial<Record<ZoneTypeValue, ZoneValidationSpec[]>>;

type ZoneEntry = ZoneTypeValue | [ZoneTypeValue, number | Partial<ZoneBasicSpec>];
type ZoneSpecMap = Partial<Record<ChartTypeValue, ZoneEntry[]>>;
type ZoneValidationMap = Partial<Record<ChartTypeValue, Array<[ZoneTypeValue, ZoneValidationSpec[]]>>>;

const z = ZoneType;
const c = ChartType;

const zoneSpecs: ZoneSpecMap = {
    [c.PIVOT_TABLE]: [
        [z.METRIC, { maxCount: 50 }],
        [z.ROW, { maxCount: -1 }],
        [z.COLUMN, { maxCount: -1 }],
        [z.FILTER, { maxCount: -1 }],
        [z.SORT, { maxCount: -1 }],
    ],
    [c.DATA_GRID]: [
        [z.METRIC, { maxCount: 50 }],
        [z.ROW, { maxCount: -1 }],
        [z.FILTER, { maxCount: -1 }],
        [z.SORT, { maxCount: -1 }],
    ],
    [c.PIE]: [
        [z.METRIC, { maxCount: -1 }],
        z.ROW,
        z.COLOR_BY,
        [z.TOOLTIP, { maxCount: -1 }],
        [z.FILTER, { maxCount: -1 }],
        [z.SORT, { maxCount: -1 }],
        z.SPLIT,
    ],
    [c.RISING_SUN]: [
        z.METRIC,
        [z.ROW, { maxCount: 3 }],
        [z.TOOLTIP, { maxCount: -1 }],
        [z.FILTER, { maxCount: -1 }],
        [z.SORT, { maxCount: -1 }],
    ],
    [c.TREEMAP]: [
        z.METRIC,
        [z.ROW, { maxCount: 2 }],
        z.COLOR_BY,
        [z.TOOLTIP, { maxCount: -1 }],
        [z.FILTER, { maxCount: -1 }],
        [z.SORT, { maxCount: -1 }],
    ],
    [c.SINGLE_VALUE]: [z.METRIC, [z.TOOLTIP, { maxCount: -1 }], [z.FILTER, { maxCount: -1 }]],
    [c.KPI_CARD]: [
        [z.METRIC, { maxCount: -1 }],
        [z.TOOLTIP, { maxCount: -1 }],
        [z.FILTER, { maxCount: -1 }],
        [z.SORT, { maxCount: -1 }],
        z.SPLIT,
    ],
    [c.BASIC_BUBBLE]: [
        [z.METRIC, { maxCount: 2, minCount: 2 }],
        z.ROW,
        z.COLOR_BY,
        z.SIZE_BY,
        [z.TOOLTIP, { maxCount: -1 }],
        [z.FILTER, { maxCount: -1 }],
        [z.SORT, { maxCount: -1 }],
    ],
    [c.BASIC_SCATTER_PLOT]: [
        [z.METRIC, { maxCount: 2, minCount: 2 }],
        z.ROW,
        z.COLOR_BY,
        [z.TOOLTIP, { maxCount: -1 }],
        [z.FILTER, { maxCount: -1 }],
        [z.SORT, { maxCount: -1 }],
    ],
    [c.PROGRESS_PIE]: [
        [z.METRIC, { maxCount: 2, minCount: 2 }],
        [z.FILTER, { maxCount: -1 }],
    ],
    [c.PROGRESS_BAR]: [
        [z.METRIC, { maxCount: 2, minCount: 2 }],
        [z.FILTER, { maxCount: -1 }],
    ],
    [c.BOX_PLOT]: [
        [z.METRIC, { maxCount: 1, minCount: 1 }],
        [z.ROW, { maxCount: 2, minCount: 2 }],
        [z.FILTER, { maxCount: -1 }],
        [z.SORT, { maxCount: -1 }],
    ],
    [c.RADAR_LINE]: [
        [z.METRIC, { maxCount: -1, minCount: 1 }],
        [z.ROW, { maxCount: 1, minCount: 1 }],
        [z.COLUMN, { maxCount: 1 }],
        [z.TOOLTIP, { maxCount: -1 }],
        [z.FILTER, { maxCount: -1 }],
        [z.SORT, { maxCount: -1 }],
    ],
    [c.WORLD_MAP_BASIC]: [
        z.ROW,
        z.COLOR_BY,
        [z.TOOLTIP, { maxCount: 20 }],
        [z.FILTER, { maxCount: 20 }],
        [z.SORT, { maxCount: 20 }],
    ],
    [c.CHINA_MAP_BASIC]: [
        z.ROW,
        z.COLOR_BY,
        [z.TOOLTIP, { maxCount: 20 }],
        [z.FILTER, { maxCount: 20 }],
        [z.SORT, { maxCount: 20 }],
    ],
    [c.CHINA_MAP_WITH_BUBBLE]: [
        z.ROW,
        z.METRIC,
        z.COLOR_BY,
        [z.TOOLTIP, { maxCount: 20 }],
        [z.FILTER, { maxCount: 20 }],
        [z.SORT, { maxCount: 20 }],
    ],
    [c.CHINA_MAP_WITH_SYMBOL]: [
        z.ROW,
        [z.METRIC, { maxCount: 20 }],
        z.COLOR_BY,
        [z.TOOLTIP, { maxCount: 20 }],
        [z.FILTER, { maxCount: 20 }],
        [z.SORT, { maxCount: 20 }],
    ],
};

const baseSeriesZones: ZoneEntry[] = [
    z.METRIC,
    [z.ROW, { maxCount: -1 }],
    z.COLOR_BY,
    [z.TOOLTIP, { maxCount: -1 }],
    [z.FILTER, { maxCount: -1 }],
    [z.SORT, { maxCount: -1 }],
    z.SPLIT,
];
const stackZones: ZoneEntry[] = [
    [z.METRIC, { maxCount: -1 }],
    [z.ROW, { maxCount: -1 }],
    z.COLUMN,
    z.COLOR_BY,
    [z.TOOLTIP, { maxCount: -1 }],
    [z.FILTER, { maxCount: -1 }],
    z.SORT,
    z.SPLIT,
];
const multiLineZones: ZoneEntry[] = [
    [z.METRIC, { maxCount: -1 }],
    [z.ROW, { maxCount: -1 }],
    z.COLUMN,
    [z.METRIC_ADDITIONAL, { maxCount: -1 }],
    z.COLOR_BY,
    [z.TOOLTIP, { maxCount: -1 }],
    [z.FILTER, { maxCount: -1 }],
    z.SORT,
    z.SPLIT,
];
const multiMetricZones: ZoneEntry[] = [
    [z.METRIC, { maxCount: -1 }],
    z.ROW,
    z.COLUMN,
    [z.METRIC_ADDITIONAL, { maxCount: -1 }],
    z.COLOR_BY,
    [z.TOOLTIP, { maxCount: -1 }],
    [z.FILTER, { maxCount: -1 }],
    [z.SORT, { maxCount: -1 }],
    z.SPLIT,
];
const rowMetricZones: ZoneEntry[] = [
    [z.METRIC, { maxCount: -1 }],
    [z.ROW, { maxCount: 1, minCount: 1 }],
    [z.FILTER, { maxCount: -1 }],
    [z.SORT, { maxCount: -1 }],
];
const bulletZones: ZoneEntry[] = [
    [z.METRIC, { maxCount: 2, minCount: 2 }],
    [z.ROW, { maxCount: -1 }],
    [z.TOOLTIP, { maxCount: -1 }],
    [z.FILTER, { maxCount: -1 }],
    [z.SORT, { maxCount: -1 }],
    z.SPLIT,
];
const waterfallZones: ZoneEntry[] = [
    z.METRIC,
    [z.ROW, { maxCount: -1 }],
    z.COLOR_BY,
    [z.TOOLTIP, { maxCount: -1 }],
    [z.FILTER, { maxCount: -1 }],
    [z.SORT, { maxCount: -1 }],
    z.SPLIT,
];
const paretoZones: ZoneEntry[] = [
    z.METRIC,
    [z.ROW, { maxCount: -1 }],
    [z.TOOLTIP, { maxCount: -1 }],
    [z.FILTER, { maxCount: -1 }],
    [z.SORT, { maxCount: -1 }],
    z.SPLIT,
];
const butterflyZones: ZoneEntry[] = [
    [z.METRIC, { maxCount: 2, minCount: 2 }],
    [z.ROW, { maxCount: 1, minCount: 1 }],
    z.COLOR_BY,
    [z.TOOLTIP, { maxCount: -1 }],
    [z.FILTER, { maxCount: -1 }],
    [z.SORT, { maxCount: -1 }],
];

const metric = (): ZoneValidationSpec => ({ acceptedKinds: ['metric'] });
const metricOrDynamicMetric = (): ZoneValidationSpec => ({ acceptedKinds: ['metricOrDynamicMetric'] });
const dimensionOrMetric = (): ZoneValidationSpec => ({ acceptedKinds: ['dimensionOrMetric'] });
const sharedDimension = (): ZoneValidationSpec => ({ acceptedKinds: ['sharedDimension'] });
const sharedOrDynamicDimension = (): ZoneValidationSpec => ({ acceptedKinds: ['sharedOrDynamicDimension'] });
const sharedDimensionOrMetric = (): ZoneValidationSpec => ({ acceptedKinds: ['sharedDimensionOrMetric'] });
const sharedOrDynamicDimensionOrMetricPlaceholder = (): ZoneValidationSpec => ({
    acceptedKinds: ['sharedOrDynamicDimensionOrMetricPlaceholder'],
});

const validationSpecs: ZoneValidationMap = {
    [c.PIVOT_TABLE]: [
        [z.METRIC, [metricOrDynamicMetric()]],
        [z.ROW, [sharedOrDynamicDimensionOrMetricPlaceholder()]],
        [z.COLUMN, [sharedOrDynamicDimensionOrMetricPlaceholder()]],
        [z.FILTER, [dimensionOrMetric()]],
        [z.SORT, [sharedDimensionOrMetric()]],
    ],
    [c.DATA_GRID]: [
        [z.METRIC, [metricOrDynamicMetric()]],
        [z.ROW, [sharedOrDynamicDimensionOrMetricPlaceholder()]],
        [z.FILTER, [dimensionOrMetric()]],
        [z.SORT, [sharedDimensionOrMetric()]],
    ],
    [c.SINGLE_VALUE]: [
        [z.METRIC, [metricOrDynamicMetric()]],
        [z.TOOLTIP, [metric()]],
        [z.FILTER, [dimensionOrMetric()]],
    ],
    [c.KPI_CARD]: [
        [z.METRIC, [metricOrDynamicMetric()]],
        [z.TOOLTIP, [metric()]],
        [z.FILTER, [dimensionOrMetric()]],
        [z.SORT, [sharedDimensionOrMetric()]],
        [z.SPLIT, [sharedDimension()]],
    ],
    [c.BASIC_BUBBLE]: [
        [z.METRIC, [metricOrDynamicMetric()]],
        [z.ROW, [sharedOrDynamicDimension()]],
        [z.SIZE_BY, [metric()]],
        [z.COLOR_BY, [metric()]],
        [z.TOOLTIP, [metric()]],
        [z.FILTER, [dimensionOrMetric()]],
    ],
    [c.PROGRESS_PIE]: [
        [z.METRIC, [metricOrDynamicMetric()]],
        [z.FILTER, [dimensionOrMetric()]],
    ],
    [c.TREEMAP]: [
        [z.METRIC, [metric()]],
        [z.ROW, [sharedDimension()]],
        [z.COLOR_BY, [metric()]],
        [z.TOOLTIP, [metric()]],
        [z.SORT, [sharedDimensionOrMetric()]],
    ],
};

const baseValidation: Array<[ZoneTypeValue, ZoneValidationSpec[]]> = [
    [z.METRIC, [metricOrDynamicMetric()]],
    [z.ROW, [sharedOrDynamicDimension()]],
    [z.COLOR_BY, [metric()]],
    [z.TOOLTIP, [metric()]],
    [z.FILTER, [dimensionOrMetric()]],
    [z.SORT, [sharedDimensionOrMetric()]],
    [z.SPLIT, [sharedDimension()]],
];
const risingSunValidation: Array<[ZoneTypeValue, ZoneValidationSpec[]]> = [
    [z.METRIC, [metricOrDynamicMetric()]],
    [z.ROW, [sharedOrDynamicDimension()]],
    [z.TOOLTIP, [metric()]],
    [z.FILTER, [dimensionOrMetric()]],
    [z.SORT, [sharedDimensionOrMetric()]],
    [z.SPLIT, [sharedDimension()]],
];
const multiValidation: Array<[ZoneTypeValue, ZoneValidationSpec[]]> = [
    [z.METRIC, [metricOrDynamicMetric()]],
    [z.ROW, [sharedOrDynamicDimension()]],
    [z.COLUMN, [sharedOrDynamicDimension()]],
    [z.COLOR_BY, [metric()]],
    [z.METRIC_ADDITIONAL, [metricOrDynamicMetric()]],
    [z.TOOLTIP, [metric()]],
    [z.FILTER, [dimensionOrMetric()]],
    [z.SORT, [sharedDimensionOrMetric()]],
    [z.SPLIT, [sharedDimension()]],
];
const mapValidation: Array<[ZoneTypeValue, ZoneValidationSpec[]]> = [
    [z.ROW, [sharedDimension()]],
    [z.METRIC, [metric()]],
    [z.COLOR_BY, [metric()]],
    [z.TOOLTIP, [metric()]],
    [z.SORT, [sharedDimensionOrMetric()]],
];

function genZoneBasicSpec(zoneId: ZoneTypeValue, maxCountOrSpec?: number | Partial<ZoneBasicSpec>): ZoneBasicSpec {
    const spec = typeof maxCountOrSpec === 'number' ? { maxCount: maxCountOrSpec } : (maxCountOrSpec ?? {});
    return { zoneId, maxCount: 1, minCount: 0, ...spec };
}

function toZoneSpecs(zones: ZoneEntry[]): ZoneBasicSpec[] {
    return zones.map((zone) => (Array.isArray(zone) ? genZoneBasicSpec(zone[0], zone[1]) : genZoneBasicSpec(zone)));
}

function toIndexedValidationSpec(entries: Array<[ZoneTypeValue, ZoneValidationSpec[]]>): ZoneIndexedValidationSpec {
    return entries.reduce<ZoneIndexedValidationSpec>((acc, [zoneId, specs]) => ({ ...acc, [zoneId]: specs }), {});
}

function includesChartType(chartTypes: readonly string[], chartType: string): boolean {
    return chartTypes.includes(chartType);
}

const zoneSpecGroups: Array<[readonly string[], ZoneEntry[]]> = [
    [[c.BASIC_COLUMN, c.BASIC_BAR, c.BASIC_LINE], baseSeriesZones],
    [
        [
            c.STACKED_BAR,
            c.PERCENT_STACKED_BAR,
            c.STACKED_SPLIT_BAR,
            c.STACKED_SPLIT_COLUMN,
            c.PERCENT_STACKED_COLUMN,
            c.STACKED_COLUMN,
        ],
        stackZones,
    ],
    [[c.MULTI_LINE], multiLineZones],
    [
        [
            c.STACKED_COLUMN_WITH_LINE,
            c.STACKED_COLUMN_WITH_SYMBOL,
            c.GROUPED_COLUMN_WITH_LINE,
            c.GROUPED_COLUMN_WITH_SYMBOL,
        ],
        multiMetricZones,
    ],
    [[c.GROUPED_COLUMN, c.GROUPED_BAR, c.STACKED_AREA, c.PERCENT_STACKED_AREA], stackZones],
    [[c.ACTIVITY_GAUGE, c.FUNNEL, c.HORIZONTAL_FUNNEL], rowMetricZones],
    [[c.BULLET_BAR, c.BULLET_COLUMN], bulletZones],
    [[c.WATERFALL_COLUMN], waterfallZones],
    [[c.PARETO], paretoZones],
    [[c.BUTTERFLY], butterflyZones],
];

function getZoneSpecEntries(chartType: string): ZoneEntry[] {
    return (
        zoneSpecGroups.find(([chartTypes]) => includesChartType(chartTypes, chartType))?.[1] ??
        zoneSpecs[chartType as ChartTypeValue] ?? [z.METRIC, z.ROW, z.FILTER, z.SORT]
    );
}

export function getZoneSpecArrayByChartType(chartType: string): ZoneBasicSpec[] {
    return toZoneSpecs(getZoneSpecEntries(chartType));
}

function getValidationEntries(chartType: string): Array<[ZoneTypeValue, ZoneValidationSpec[]]> {
    if (includesChartType([c.BASIC_LINE, c.BASIC_COLUMN, c.BASIC_BAR, c.PIE], chartType)) return baseValidation;
    if (chartType === c.RISING_SUN) return risingSunValidation;
    if (
        includesChartType(
            [
                c.STACKED_SPLIT_COLUMN,
                c.PERCENT_STACKED_COLUMN,
                c.STACKED_COLUMN_WITH_LINE,
                c.STACKED_COLUMN_WITH_SYMBOL,
                c.BASIC_SCATTER_PLOT,
                c.FUNNEL,
                c.HORIZONTAL_FUNNEL,
                c.BULLET_BAR,
                c.BULLET_COLUMN,
                c.WATERFALL_COLUMN,
                c.PARETO,
                c.STACKED_COLUMN,
                c.STACKED_BAR,
                c.PERCENT_STACKED_BAR,
                c.STACKED_SPLIT_BAR,
                c.RADAR_LINE,
                c.MULTI_LINE,
                c.GROUPED_COLUMN,
                c.GROUPED_COLUMN_WITH_LINE,
                c.GROUPED_COLUMN_WITH_SYMBOL,
                c.GROUPED_BAR,
            ],
            chartType,
        )
    )
        return multiValidation;
    if (includesChartType([c.ACTIVITY_GAUGE, c.HEAT_MAP, c.BOX_PLOT], chartType)) {
        return [
            [z.METRIC, [metricOrDynamicMetric()]],
            [z.ROW, [sharedOrDynamicDimension()]],
            [z.FILTER, [dimensionOrMetric()]],
            [z.SORT, [sharedDimensionOrMetric()]],
        ];
    }
    if (
        includesChartType(
            [c.WORLD_MAP_BASIC, c.CHINA_MAP_BASIC, c.CHINA_MAP_WITH_BUBBLE, c.CHINA_MAP_WITH_SYMBOL],
            chartType,
        )
    )
        return mapValidation;
    return validationSpecs[chartType as ChartTypeValue] ?? [];
}

export function getZoneIndexedValidationSpecByChartType(chartType: string): ZoneIndexedValidationSpec {
    return toIndexedValidationSpec(getValidationEntries(chartType));
}

export function getCardZoneData(card: CardLikeForChartMeta): ZoneData {
    return card.content.meta?.chartMain?.zoneData ?? {};
}

export function getZoneFields<T extends ZoneTypeValue>(zoneData: ZoneData, zoneType: T): NonNullable<ZoneData[T]> {
    return (zoneData[zoneType] ?? []) as NonNullable<ZoneData[T]>;
}

export function getCardZoneFields<T extends ZoneTypeValue>(
    card: CardLikeForChartMeta,
    zoneType: T,
): NonNullable<ZoneData[T]> {
    return getZoneFields(getCardZoneData(card), zoneType);
}

function hasValue(value: any): boolean {
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

function isMetricField(field: AnyZoneField): boolean {
    return hasValue(field.id) && !hasValue(field.fdId);
}

function isDimensionField(field: AnyZoneField): boolean {
    return hasValue(field.fdId);
}

function isDynamicZoneField(field: AnyZoneField): boolean {
    return Boolean(field.isStatic) || (hasValue(field.dzId) && !hasValue(field.fdId) && !field.isStatic);
}

function isDynamicMetricField(field: AnyZoneField): boolean {
    return field.metaType === 'METRIC' && isDynamicZoneField(field);
}

function isDynamicDimensionField(field: AnyZoneField): boolean {
    return (field.metaType === 'DIM' || field.metaType === 'DIMENSION') && isDynamicZoneField(field);
}

function isSharedDimensionField(field: AnyZoneField): boolean {
    return isDimensionField(field) && field.shared === true;
}

function isMetricPlaceholder(field: AnyZoneField): boolean {
    return field.metaType === 'MPH' || field.metaType === 'METRICS_PLACEHOLDER' || 'isMPH' in field;
}

const fieldKindValidators: Record<ZoneFieldKind, (field: AnyZoneField) => boolean> = {
    any: () => true,
    metric: isMetricField,
    metricOrDynamicMetric: (field) => isMetricField(field) || isDynamicMetricField(field),
    dimension: isDimensionField,
    dimensionOrMetric: (field) => isDimensionField(field) || isMetricField(field),
    sharedDimension: isSharedDimensionField,
    sharedOrDynamicDimension: (field) => isSharedDimensionField(field) || isDynamicDimensionField(field),
    sharedDimensionOrMetric: (field) => isSharedDimensionField(field) || isMetricField(field),
    sharedOrDynamicDimensionOrMetricPlaceholder: (field) => {
        return isSharedDimensionField(field) || isDynamicDimensionField(field) || isMetricPlaceholder(field);
    },
    metricPlaceholder: isMetricPlaceholder,
};

function validateFieldKind(field: AnyZoneField, acceptedKinds: ZoneFieldKind[]): boolean {
    return acceptedKinds.some((kind) => fieldKindValidators[kind](field));
}

function validateFieldOnValidationSpec(field: AnyZoneField, validationSpecs?: ZoneValidationSpec[]): boolean {
    if (!validationSpecs?.length) return true;
    return validationSpecs.every((spec) => validateFieldKind(field, spec.acceptedKinds));
}

export function isZoneDataCompatibleWithChartType(zoneData: ZoneData, chartType: string): boolean {
    const zoneSpecsForChart = getZoneSpecArrayByChartType(chartType);
    const validationSpec = getZoneIndexedValidationSpecByChartType(chartType);
    const supportedZones = new Set(zoneSpecsForChart.map((spec) => spec.zoneId));
    const hasOnlySupportedZones = Object.values(ZoneType).every(
        (zoneType) => supportedZones.has(zoneType) || getZoneFields(zoneData, zoneType).length === 0,
    );

    return (
        hasOnlySupportedZones &&
        zoneSpecsForChart.every((spec) => {
            const fields = getZoneFields(zoneData, spec.zoneId);
            const withinMin = fields.length >= spec.minCount;
            const withinMax = spec.maxCount < 0 || fields.length <= spec.maxCount;
            const fieldsValid = fields.every((field) =>
                validateFieldOnValidationSpec(field, validationSpec[spec.zoneId]),
            );
            return withinMin && withinMax && fieldsValid;
        })
    );
}

export function getCompatibleChartTypesByZoneData(
    zoneData: ZoneData,
    candidates: readonly string[] = Object.values(ChartType),
): ChartTypeValue[] {
    return candidates.filter((chartType): chartType is ChartTypeValue => {
        return (
            (Object.values(ChartType) as string[]).includes(chartType) &&
            isZoneDataCompatibleWithChartType(zoneData, chartType)
        );
    });
}

export function getCardCompatibleChartTypes(
    card: CardLikeForChartMeta,
    candidates?: readonly string[],
): ChartTypeValue[] {
    return getCompatibleChartTypesByZoneData(getCardZoneData(card), candidates);
}
