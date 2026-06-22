/**
 * 任务相关 API
 */
import { getJSON } from '@/core/request';
import { BIUniversalJsonResponse } from '@/vite-env';

export type BITaskState =
    | 'CREATED'
    | 'PROCESSING'
    | 'FAILED'
    | 'FINISHED'
    | 'CANCELED'
    | 'RUNNING'
    | 'QUEUEING'
    | string;

export type IBIDatasetPreviewTaskResult = BIUniversalJsonResponse<{ type: 'fileName'; value: string }>; // 数据集预览的任务结果, value 是文件名

export interface IBITaskStatus<T = IBIDatasetPreviewTaskResult | any> {
    taskId: string;
    status: BITaskState;
    result: T | null;
    startTime: string | null;
    submitTime: string | null;
    finishedTime: string | null;
    endTime: string | null;
    runningDuration: number;
    queueingDuration: number;
}

/**
 * 根据 taskId 查询异步任务状态。
 * @param taskId 任务 ID
 * @returns 任务状态信息
 */
export async function getTaskStatus<T = unknown>(taskId: string): Promise<IBITaskStatus<T>> {
    const response = await getJSON<IBITaskStatus<T>>(`/api/task/${taskId}`);
    return response;
}
