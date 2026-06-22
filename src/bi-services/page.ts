// BI 页面相关 API

import { getJSON } from '@/core/request';
import { ICardInfo, IDatasetInfo } from './card';

export type IPageInfo = {
    pgId: string;
    pgType: 'PAGE' | 'LARGE_SCREEN' | 'ANALYSE_REPORT' | 'OVERVIEW';
    name: string;
    description: string;
    cards: Array<ICardInfo>;
    dsInfos: Array<IDatasetInfo>;
    meta: {
        layout: Array<{ i: string; x: number; y: number; w: number; h: number }>;
        filterLayout: string[];
        tabMap?: Record<string, any>; // 标签页组件
        layoutItemMap?: Record<string, any>; // 布局组件的定义：卡片组/标签页组/筛选器组等
        phoneLayout?: {
            layout: Array<{ i: string; x: number; y: number; w: number; h: number }>;
            tabMap?: Record<string, any>; // 标签页组件
            layoutItemMap?: Record<string, any>; // 布局组件的定义：卡片组/标签页组/筛选器组等
        };
    };
    settings: {
        authorized: boolean;
        authorizedOnMobile: boolean;
        authorizedOnPC: boolean;
        descriptionVisible: boolean;
    };
    ctime: string;
    utime: string;
};
/**
 * 根据 pageId 查询页面信息
 * @param pageId
 * @returns
 */
export async function getPageInfo(pageId: string): Promise<IPageInfo> {
    const response = await getJSON<IPageInfo>(`/api/page/${pageId}`);
    return response;
}
