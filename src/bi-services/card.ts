/**
 * 卡片信息查询、卡片数据查询
 */
import { getJSON, postJSON } from '@/core/request';
import type { ChartProps, ChartTypeValue, OpenChartMeta, ZoneData } from '@/core/chart-meta';
import { BIFieldType, BIField, BIFieldNumberFormat, BIFilterLevel, BIFilterType, BIDynamicParamType } from '@/vite-env';

// BI 卡片相关 API
type IField = { key: string; fdId: string; fdType: BIFieldType; title: string };
type MPH = { isMPH: true; title: string };
export type IFieldFilter = BIField & {
    filterLevel: BIFilterLevel;
    filterType: BIFilterType;
    filterValue: string[];
    displayValue?: string[];
};

export type IGetCardDataParams = {
    filters?: Array<IFieldFilter>; // 过滤条件
    dynamicParams?: Array<{
        dpId: string;
        name: string;
        valueType: BIDynamicParamType;
        defaultValue: string;
    }>;
    // 下钻条件
    drillFilters?: Array<Omit<IFieldFilter, 'filterLevel'>>;
};
// 数据值
type IDataValue = {
    v: number | string;
    t_idx?: string; // colorBy自定义阈值范围的场景, 后端计算出命中阈值条件的 index，无命中时无该字段
};
// 维度值
type IDimensionValue = { title: string; titleType: string } & {
    code?: string;
    geoName?: string;
    geoCenter?: [number, number];
};
type IDataValueByRow = Array<IDataValue>;
type IDimensionDatumByRow = Array<IDimensionValue>;

type IColumnDatumField = {
    key: string;
    fdType: BIFieldType;
    alias?: string;
    title: string;
    originTitle: string;
    type: 'metric';
    fmt_idx: number;
    fdId: string;
};
export type IColumnDatumFieldValue = { title: string; titleType: string };
type IColumnDatumByCol = Array<IColumnDatumFieldValue | IColumnDatumField>;

export type IStandardCardData = {
    data: IDataValueByRow[]; // 图表场景通常从这里取最终数值矩阵，按行
    row: {
        data: IDimensionDatumByRow[]; // 表格场景通常直接读它，按行读取维度值
        fields: (IField | MPH)[];
        rowFieldFormat: {
            numberFormat: BIFieldNumberFormat[];
        };
    };
    column: {
        data: IColumnDatumByCol[]; // 图表场景通常用它生成系列名，按列，度量字段 或 对比展开值
        fields: (IField | MPH)[];
        metricFieldFormat: {
            numberFormat: BIFieldNumberFormat[];
        };
    };

    count?: number; // 表格场景最常用的总数
    meta?: Record<string, any>;
    limitInfo: any;
};

type IStandardCardDataResponse = {
    chartMain: IStandardCardData; // `/api/card/:id/data` 的标准数据主体
};

/**
 * 获取标准的可视化卡片数据。不包含分组表/桑基图/父子卡片(自定义图表、复杂报表)等特殊数据类型的卡片。
 * @param cdId
 * @param params 参数
 * @returns
 */
export async function getStandardCardData(cdId: string, params: IGetCardDataParams): Promise<IStandardCardData> {
    const response = await postJSON<IStandardCardDataResponse>(`/api/card/${cdId}/data`, {
        ...params,
        isUniversalStructure: true,
    });

    if (!response.chartMain) {
        throw new Error('卡片数据返回缺少 chartMain');
    }

    return response.chartMain;
}

export type IDatasetInfo = {
    dsId: string;
    name: string;
    description: string;
    columns: Array<
        BIField & {
            alias?: string;
            isAggregated: boolean;
            formula?: string;
        }
    >; // 字段映射所使用的数据集字段列表
};

type IChartCardInfo = {
    cdId: string;
    name: string;
    cdType: string;
    parentId?: string; // 父级卡片ID
    content: {
        chartType: ChartTypeValue | (string & {}); // 卡片图表类型，用于判断渲染方式
        meta: OpenChartMeta & {
            chartMain: OpenChartMeta['chartMain'] & {
                zoneData: ZoneData;
                props: ChartProps;
            };
        };
        dsInfo: IDatasetInfo; // 卡片对应的数据集信息
        drillViews?: Array<{ drId: string; name: string; chartType: string; chartView: 'GRAPH' | 'GRID' }>;
    };
};
export type ICardInfo = IChartCardInfo;

/**
 * 根据卡片ID获取卡片信息。
 * @param cdId 卡片ID
 * @returns 卡片信息
 */
export async function getCardInfo(cdId: string): Promise<ICardInfo> {
    const response = await getJSON<ICardInfo>(`/api/card/${cdId}`, { showData: false });
    return response;
}
