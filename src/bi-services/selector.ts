// BI 选择器相关 API

import { postJSON } from '@/core/request';

type ISelectorFieldQuery = {
    offset?: number;
    limit?: number;
};

export type ISelectorQueryFilter = Record<string, unknown>;
export type ISelectorDynamicParam = Record<string, unknown>;

export type IGetSelectorOptionsParams = {
    fieldQuery?: ISelectorFieldQuery;
    dynamicParams?: ISelectorDynamicParam[];
    treeFilters?: ISelectorQueryFilter[];
    filters?: ISelectorQueryFilter[];
    layerTreeFilters?: ISelectorQueryFilter[];
};

export type ISelectorOptionsResponse = {
    count: number;
    exceedLimit: boolean;
    offset: number;
    limit: number;
    result: Array<{ value: string; dvt?: string }>;
};

const DEFAULT_SELECTOR_FIELD_QUERY = {
    offset: 0,
    limit: 1000,
} satisfies Required<ISelectorFieldQuery>;

/**
 * 查询筛选器的列表项数据。
 * @param selectorId 筛选器 ID
 * @param params 查询参数
 * @returns 列表项分页结果
 */
export async function getSelectorOptions(
    selectorId: string,
    params: IGetSelectorOptionsParams = {},
): Promise<ISelectorOptionsResponse> {
    const response = await postJSON<ISelectorOptionsResponse>(`/api/selector/${selectorId}/data`, {
        fieldQuery: {
            ...DEFAULT_SELECTOR_FIELD_QUERY,
            ...params.fieldQuery,
        },
        dynamicParams: params.dynamicParams ?? [],
        treeFilters: params.treeFilters ?? [],
        filters: params.filters ?? [],
        layerTreeFilters: params.layerTreeFilters ?? [],
    });

    return response;
}
