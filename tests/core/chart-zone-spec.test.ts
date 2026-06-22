import { describe, expect, it } from 'vitest';
import {
    ChartType,
    getCardCompatibleChartTypes,
    getCardZoneData,
    getCardZoneFields,
    getCompatibleChartTypesByZoneData,
    getZoneIndexedValidationSpecByChartType,
    getZoneSpecArrayByChartType,
    isZoneDataCompatibleWithChartType,
    ZoneType,
    type CardLikeForChartMeta,
    type DimensionZoneField,
    type MetricZoneField,
    type ZoneData,
} from '../../src/core/chart-meta';

function dimension(name: string): DimensionZoneField {
    return {
        fdId: `fd-${name}`,
        key: `key-${name}`,
        name,
        shared: true,
    };
}

function unsharedDimension(name: string): DimensionZoneField {
    return {
        ...dimension(name),
        shared: false,
    };
}

function dynamicDimension(name: string): DimensionZoneField {
    return {
        dzId: `dz-${name}`,
        key: `key-${name}`,
        metaType: 'DIM',
        name,
    };
}

function metric(name: string): MetricZoneField {
    return {
        id: `metric-${name}`,
        key: `key-${name}`,
        name,
    };
}

function dynamicMetric(name: string): MetricZoneField {
    return {
        id: '',
        dzId: `dz-${name}`,
        key: `key-${name}`,
        metaType: 'METRIC',
        name,
    };
}

function cardWithZoneData(zoneData?: ZoneData): CardLikeForChartMeta {
    return {
        content: {
            chartType: ChartType.BASIC_COLUMN,
            meta: {
                chartMain: {
                    zoneData,
                },
            },
        },
    };
}

describe('core/chart-zone-spec', () => {
    it('returns normalized zone specs for chart types with shared base rules', () => {
        expect(getZoneSpecArrayByChartType(ChartType.BASIC_COLUMN)).toEqual([
            { zoneId: ZoneType.METRIC, maxCount: 1, minCount: 0 },
            { zoneId: ZoneType.ROW, maxCount: -1, minCount: 0 },
            { zoneId: ZoneType.COLOR_BY, maxCount: 1, minCount: 0 },
            { zoneId: ZoneType.TOOLTIP, maxCount: -1, minCount: 0 },
            { zoneId: ZoneType.FILTER, maxCount: -1, minCount: 0 },
            { zoneId: ZoneType.SORT, maxCount: -1, minCount: 0 },
            { zoneId: ZoneType.SPLIT, maxCount: 1, minCount: 0 },
        ]);
    });

    it('returns normalized zone specs for chart-specific min and max rules', () => {
        expect(getZoneSpecArrayByChartType(ChartType.BASIC_BUBBLE)).toEqual([
            { zoneId: ZoneType.METRIC, maxCount: 2, minCount: 2 },
            { zoneId: ZoneType.ROW, maxCount: 1, minCount: 0 },
            { zoneId: ZoneType.COLOR_BY, maxCount: 1, minCount: 0 },
            { zoneId: ZoneType.SIZE_BY, maxCount: 1, minCount: 0 },
            { zoneId: ZoneType.TOOLTIP, maxCount: -1, minCount: 0 },
            { zoneId: ZoneType.FILTER, maxCount: -1, minCount: 0 },
            { zoneId: ZoneType.SORT, maxCount: -1, minCount: 0 },
        ]);
    });

    it('indexes validation specs by zone type', () => {
        expect(getZoneIndexedValidationSpecByChartType(ChartType.BASIC_COLUMN)).toMatchObject({
            [ZoneType.METRIC]: [{ acceptedKinds: ['metricOrDynamicMetric'] }],
            [ZoneType.ROW]: [{ acceptedKinds: ['sharedOrDynamicDimension'] }],
            [ZoneType.COLOR_BY]: [{ acceptedKinds: ['metric'] }],
            [ZoneType.SORT]: [{ acceptedKinds: ['sharedDimensionOrMetric'] }],
        });
    });

    it('keeps combo chart row limits aligned with the BI chart editor', () => {
        expect(getZoneSpecArrayByChartType(ChartType.MULTI_LINE)).toContainEqual({
            zoneId: ZoneType.ROW,
            maxCount: -1,
            minCount: 0,
        });
        expect(getZoneSpecArrayByChartType(ChartType.GROUPED_COLUMN_WITH_LINE)).toContainEqual({
            zoneId: ZoneType.ROW,
            maxCount: 1,
            minCount: 0,
        });
    });

    it('does not expose colorBy for Pareto zone specs', () => {
        expect(getZoneSpecArrayByChartType(ChartType.WATERFALL_COLUMN).map((spec) => spec.zoneId)).toContain(
            ZoneType.COLOR_BY,
        );
        expect(getZoneSpecArrayByChartType(ChartType.PARETO).map((spec) => spec.zoneId)).not.toContain(
            ZoneType.COLOR_BY,
        );
    });

    it('keeps Butterfly zone limits aligned with the BI chart editor', () => {
        expect(getZoneSpecArrayByChartType(ChartType.BUTTERFLY)).toMatchObject([
            { zoneId: ZoneType.METRIC, maxCount: 2, minCount: 2 },
            { zoneId: ZoneType.ROW, maxCount: 1, minCount: 1 },
            { zoneId: ZoneType.COLOR_BY, maxCount: 1, minCount: 0 },
            { zoneId: ZoneType.TOOLTIP, maxCount: -1, minCount: 0 },
            { zoneId: ZoneType.FILTER, maxCount: -1, minCount: 0 },
            { zoneId: ZoneType.SORT, maxCount: -1, minCount: 0 },
        ]);
    });

    it('keeps Rising Sun validation independent from base series colorBy rules', () => {
        expect(getZoneIndexedValidationSpecByChartType(ChartType.RISING_SUN)).not.toHaveProperty(ZoneType.COLOR_BY);
        expect(getZoneIndexedValidationSpecByChartType(ChartType.RISING_SUN)).toMatchObject({
            [ZoneType.METRIC]: [{ acceptedKinds: ['metricOrDynamicMetric'] }],
            [ZoneType.ROW]: [{ acceptedKinds: ['sharedOrDynamicDimension'] }],
            [ZoneType.SPLIT]: [{ acceptedKinds: ['sharedDimension'] }],
        });
    });

    it('reads zone data and zone fields from card-like objects', () => {
        const zoneData: ZoneData = {
            [ZoneType.ROW]: [dimension('city')],
            [ZoneType.METRIC]: [metric('sales')],
        };
        const card = cardWithZoneData(zoneData);

        expect(getCardZoneData(card)).toBe(zoneData);
        expect(getCardZoneFields(card, ZoneType.ROW)).toEqual([dimension('city')]);
        expect(getCardZoneFields(cardWithZoneData(), ZoneType.METRIC)).toEqual([]);
    });

    it('accepts compatible zone data for a basic series chart', () => {
        const zoneData: ZoneData = {
            [ZoneType.ROW]: [dimension('city'), dimension('store')],
            [ZoneType.METRIC]: [metric('sales')],
            [ZoneType.COLOR_BY]: [metric('target')],
            [ZoneType.TOOLTIP]: [metric('profit')],
        };

        expect(isZoneDataCompatibleWithChartType(zoneData, ChartType.BASIC_COLUMN)).toBe(true);
    });

    it('rejects zones that are not supported by the target chart type', () => {
        const zoneData: ZoneData = {
            [ZoneType.ROW]: [dimension('city')],
            [ZoneType.COLUMN]: [dimension('year')],
            [ZoneType.METRIC]: [metric('sales')],
        };

        expect(isZoneDataCompatibleWithChartType(zoneData, ChartType.BASIC_COLUMN)).toBe(false);
        expect(isZoneDataCompatibleWithChartType(zoneData, ChartType.GROUPED_COLUMN)).toBe(true);
    });

    it('rejects combo charts whose row fields exceed source max count', () => {
        const zoneData: ZoneData = {
            [ZoneType.ROW]: [dimension('city'), dimension('store')],
            [ZoneType.METRIC]: [metric('sales')],
            [ZoneType.METRIC_ADDITIONAL]: [metric('profit')],
        };

        expect(isZoneDataCompatibleWithChartType(zoneData, ChartType.GROUPED_COLUMN_WITH_LINE)).toBe(false);
        expect(isZoneDataCompatibleWithChartType(zoneData, ChartType.MULTI_LINE)).toBe(true);
    });

    it('rejects Pareto zone data with colorBy fields', () => {
        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.ROW]: [dimension('city')],
                    [ZoneType.METRIC]: [metric('sales')],
                    [ZoneType.COLOR_BY]: [metric('target')],
                },
                ChartType.PARETO,
            ),
        ).toBe(false);
    });

    it('rejects fields that exceed max count or miss min count', () => {
        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.METRIC]: [metric('x')],
                },
                ChartType.BASIC_BUBBLE,
            ),
        ).toBe(false);

        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.METRIC]: [metric('x'), metric('y')],
                },
                ChartType.BASIC_BUBBLE,
            ),
        ).toBe(true);

        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.ROW]: [dimension('x'), dimension('y'), dimension('z')],
                    [ZoneType.METRIC]: [metric('value')],
                },
                ChartType.BOX_PLOT,
            ),
        ).toBe(false);

        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.ROW]: [dimension('category')],
                    [ZoneType.METRIC]: [metric('value')],
                },
                ChartType.BUTTERFLY,
            ),
        ).toBe(false);

        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.ROW]: [dimension('category')],
                    [ZoneType.METRIC]: [metric('left'), metric('right')],
                },
                ChartType.BUTTERFLY,
            ),
        ).toBe(true);
    });

    it('rejects fields that do not match the zone validation kind', () => {
        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.ROW]: [metric('wrong-row-field') as unknown as DimensionZoneField],
                    [ZoneType.METRIC]: [metric('sales')],
                },
                ChartType.BASIC_COLUMN,
            ),
        ).toBe(false);

        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.ROW]: [dimension('city')],
                    [ZoneType.METRIC]: [dimension('wrong-metric-field') as unknown as MetricZoneField],
                },
                ChartType.BASIC_COLUMN,
            ),
        ).toBe(false);
    });

    it('matches source shared and dynamic field validation semantics', () => {
        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.ROW]: [unsharedDimension('city')],
                    [ZoneType.METRIC]: [metric('sales')],
                },
                ChartType.BASIC_COLUMN,
            ),
        ).toBe(false);

        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.ROW]: [dynamicDimension('city')],
                    [ZoneType.METRIC]: [dynamicMetric('sales')],
                },
                ChartType.BASIC_COLUMN,
            ),
        ).toBe(true);

        expect(
            isZoneDataCompatibleWithChartType(
                {
                    [ZoneType.ROW]: [dimension('city')],
                    [ZoneType.METRIC]: [metric('sales')],
                    [ZoneType.COLOR_BY]: [dynamicMetric('target')],
                },
                ChartType.BASIC_COLUMN,
            ),
        ).toBe(false);
    });

    it('filters compatible chart types from explicit candidates', () => {
        const zoneData: ZoneData = {
            [ZoneType.ROW]: [dimension('city')],
            [ZoneType.METRIC]: [metric('sales'), metric('profit')],
        };

        expect(
            getCompatibleChartTypesByZoneData(zoneData, [
                ChartType.BASIC_COLUMN,
                ChartType.MULTI_LINE,
                ChartType.BASIC_BUBBLE,
                'UNKNOWN_CHART',
            ]),
        ).toEqual([ChartType.MULTI_LINE, ChartType.BASIC_BUBBLE]);
    });

    it('filters compatible chart types from a card-like object', () => {
        const card = cardWithZoneData({
            [ZoneType.ROW]: [dimension('city')],
            [ZoneType.METRIC]: [metric('sales')],
        });

        expect(getCardCompatibleChartTypes(card, [ChartType.BASIC_COLUMN, ChartType.BASIC_BUBBLE])).toEqual([
            ChartType.BASIC_COLUMN,
        ]);
    });
});
