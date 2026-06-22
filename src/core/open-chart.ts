import { type ICardInfo, type IStandardCardData } from '@/bi-services/card';
import { getCardZoneFields, type MetricZoneField, type OpenChartMeta, ZoneType } from '@/core/chart-meta';
import { buildUrl, getBIWebRouteUrl } from '@/core/url';
import type { BIFieldNumberFormat } from '@/vite-env';

export const OPEN_CHART_READY_EVENT = 'gd-open-chart-ready';
export const OPEN_CHART_DATA_EVENT = 'gd-open-chart-data';
export const OPEN_CHART_EVENT = 'gd-open-chart-event';

type MetricFormat = {
    id: string;
    format?: BIFieldNumberFormat;
};

export type OpenChartDataPayload = {
    id: string;
    type: typeof OPEN_CHART_DATA_EVENT;
    chartData: IStandardCardData;
    chartMeta: OpenChartMeta;
    chartType: string;
    metrics: MetricFormat[];
};

const METRIC_ZONE_KEYS = [ZoneType.METRIC, ZoneType.METRIC_ADDITIONAL, ZoneType.COLOR_BY, ZoneType.TOOLTIP] as const;

function toMetricId(field: MetricZoneField): string | null {
    if (typeof field.id === 'string' && field.id.trim()) return field.id;
    if (typeof field.key === 'string' && field.key.trim()) return field.key;
    if (typeof field.fdId === 'string' && field.fdId.trim()) return field.fdId;
    return null;
}

function getMetricZoneFields(cardInfo: ICardInfo): MetricZoneField[] {
    return METRIC_ZONE_KEYS.flatMap((key) => getCardZoneFields(cardInfo, key));
}

function buildMetrics(cardInfo: ICardInfo, chartData: IStandardCardData): MetricFormat[] {
    const numberFormats = chartData.column?.metricFieldFormat?.numberFormat ?? [];

    return getMetricZoneFields(cardInfo).flatMap((field, index) => {
        const id = toMetricId(field);
        if (!id) return [];

        return [
            {
                id,
                format: field.fieldFormat?.numberFormat ?? numberFormats[index],
            },
        ];
    });
}

export function getOpenChartUrl(channelId: string): string {
    return getBIWebRouteUrl(buildUrl('/unauth/open/chart', { id: channelId }));
}

export function buildOpenChartPayload(
    channelId: string,
    cardInfo: ICardInfo,
    chartData: IStandardCardData,
): OpenChartDataPayload {
    return {
        id: channelId,
        type: OPEN_CHART_DATA_EVENT,
        chartData,
        chartMeta: cardInfo.content.meta,
        chartType: cardInfo.content.chartType,
        metrics: buildMetrics(cardInfo, chartData),
    };
}
