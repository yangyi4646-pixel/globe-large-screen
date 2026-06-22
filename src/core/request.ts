import type { BIUniversalJsonResponse } from '../vite-env';
import {
    type CancelListener,
    CanceledError,
    dispatchRequest,
    isCancel,
    mergeConfig,
    RequestError,
    type RequestConfig,
    type RequestResponse,
} from './request-core';
import { buildUrl, getBIResourceUrl, type QueryParams } from './url';

type CancelExecutor = (cancel: (message?: string) => void) => void;

interface BIDataJsonResponse<T> {
    code: number;
    msg: string;
    data: T;
}

const SURVEY_ENGINE_API_PATH = '/survey-engine/api/';

const DEFAULT_HEADERS = {
    'raw-backend-response': 'TRUE',
} satisfies Record<string, string>;

export interface CancelTokenSource {
    cancel: (message?: string) => void;
    token: CancelToken;
}

export class CancelToken {
    listeners: CancelListener[] = [];
    promise: Promise<CanceledError>;
    reason: CanceledError | null = null;

    constructor(executor: CancelExecutor) {
        if (typeof executor !== 'function') {
            throw new TypeError('CancelToken executor 必须是函数');
        }

        let resolvePromise: (reason: CanceledError) => void = () => {};
        this.promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });

        executor((message) => {
            if (this.reason) {
                return;
            }

            this.reason = new CanceledError(message);
            resolvePromise(this.reason);

            const currentListeners = [...this.listeners];
            this.listeners.length = 0;
            currentListeners.forEach((listener) => listener(this.reason as CanceledError));
        });
    }

    static source(): CancelTokenSource {
        let cancel: (message?: string) => void = () => {};

        const token = new CancelToken((cancelExecutor) => {
            cancel = cancelExecutor;
        });

        return { token, cancel };
    }

    subscribe(listener: CancelListener): void {
        if (this.reason) {
            listener(this.reason);
            return;
        }

        this.listeners.push(listener);
    }

    throwIfRequested(): void {
        if (this.reason) {
            throw this.reason;
        }
    }

    unsubscribe(listener: CancelListener): void {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }
}

export async function request<T = unknown>(url: string, payload: RequestConfig = {}): Promise<RequestResponse<T>> {
    const config = mergeConfig({ headers: DEFAULT_HEADERS }, { ...payload, url: getBIResourceUrl(url) });
    return dispatchRequest<T>(config);
}

function unwrapBIResponse<T>(response: RequestResponse<BIUniversalJsonResponse<T>>): T {
    const { data, status, statusText } = response;
    if (status >= 400) {
        const message = data?.error?.message ?? `请求失败: ${status} ${statusText}`;
        throw new RequestError(message, response, response.config);
    }
    if (data?.error) {
        throw new RequestError(data.error.message, response, response.config);
    }
    return data?.response as T;
}

function getBIDataResponseErrorMessage<T>(response: RequestResponse<BIDataJsonResponse<T>>): string | null {
    const { data, status, statusText } = response;

    if (status >= 400) {
        return data?.msg ?? `请求失败: ${status} ${statusText}`;
    }

    if (data?.code !== 0) {
        return data?.msg ?? `请求失败: ${data?.code ?? 'unknown'}`;
    }

    return null;
}

function unwrapBIDataResponse<T>(response: RequestResponse<BIDataJsonResponse<T>>): T {
    const message = getBIDataResponseErrorMessage(response);
    if (message) {
        throw new RequestError(message, response, response.config);
    }

    return response.data?.data as T;
}

function shouldUseBIDataResponse(url: string): boolean {
    return url.includes(SURVEY_ENGINE_API_PATH);
}

function unwrapJSONResponse<T>(
    url: string,
    response: RequestResponse<BIUniversalJsonResponse<T> | BIDataJsonResponse<T>>,
): T {
    if (shouldUseBIDataResponse(url)) {
        return unwrapBIDataResponse(response as RequestResponse<BIDataJsonResponse<T>>);
    }

    return unwrapBIResponse(response as RequestResponse<BIUniversalJsonResponse<T>>);
}

function rethrowAsRequestError(error: unknown): never {
    if (isCancel(error) || error instanceof RequestError) throw error;
    throw new RequestError(error instanceof Error ? error.message : String(error));
}

export async function getJSON<T = unknown>(url: string, queryParams?: QueryParams, headers?: HeadersInit): Promise<T> {
    const requestUrl = buildUrl(url, queryParams);
    let response: RequestResponse<BIUniversalJsonResponse<T> | BIDataJsonResponse<T>>;
    try {
        response = await request<BIUniversalJsonResponse<T> | BIDataJsonResponse<T>>(requestUrl, {
            method: 'get',
            responseType: 'json',
            headers,
            validateStatus: () => true,
        });
    } catch (error) {
        rethrowAsRequestError(error);
    }
    return unwrapJSONResponse(requestUrl, response);
}

export async function postJSON<T = unknown>(url: string, params?: unknown, headers?: HeadersInit): Promise<T> {
    let response: RequestResponse<BIUniversalJsonResponse<T> | BIDataJsonResponse<T>>;
    try {
        response = await request<BIUniversalJsonResponse<T> | BIDataJsonResponse<T>>(url, {
            method: 'post',
            data: params,
            responseType: 'json',
            headers,
            validateStatus: () => true,
        });
    } catch (error) {
        rethrowAsRequestError(error);
    }
    return unwrapJSONResponse(url, response);
}

export async function getDataJSON<T = unknown>(
    url: string,
    queryParams?: QueryParams,
    headers?: HeadersInit,
): Promise<T> {
    let response: RequestResponse<BIDataJsonResponse<T>>;
    try {
        response = await request<BIDataJsonResponse<T>>(buildUrl(url, queryParams), {
            method: 'get',
            responseType: 'json',
            headers,
            validateStatus: () => true,
        });
    } catch (error) {
        rethrowAsRequestError(error);
    }
    return unwrapBIDataResponse(response);
}

export async function postDataJSON<T = unknown>(url: string, params?: unknown, headers?: HeadersInit): Promise<T> {
    let response: RequestResponse<BIDataJsonResponse<T>>;
    try {
        response = await request<BIDataJsonResponse<T>>(url, {
            method: 'post',
            data: params,
            responseType: 'json',
            headers,
            validateStatus: () => true,
        });
    } catch (error) {
        rethrowAsRequestError(error);
    }
    return unwrapBIDataResponse(response);
}

export async function get<T = unknown>(
    url: string,
    queryParams?: QueryParams,
    headers?: HeadersInit,
): Promise<RequestResponse<T>> {
    return request<T>(buildUrl(url, queryParams), { method: 'get', headers });
}

export async function post<T = unknown>(
    url: string,
    params?: unknown,
    headers?: HeadersInit,
): Promise<RequestResponse<T>> {
    return request<T>(url, { method: 'post', data: params, headers });
}

export { CanceledError, isCancel, RequestError };
export type { QueryParams } from './url';
export type { RequestConfig, RequestResponse } from './request-core';
