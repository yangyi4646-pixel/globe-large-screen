export type ResponseType = 'arrayBuffer' | 'auto' | 'blob' | 'formData' | 'json' | 'response' | 'text';
export type RequestMethod =
    | 'delete'
    | 'get'
    | 'head'
    | 'options'
    | 'patch'
    | 'post'
    | 'put'
    | Uppercase<'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put'>;
export type ValidateStatus = (status: number) => boolean;
export type RequestParamValue = boolean | number | string | null | undefined;
export type RequestParams = Record<string, RequestParamValue | RequestParamValue[]>;
export type CancelListener = (reason: CanceledError) => void;

export interface CancelTokenLike {
    reason: CanceledError | null;
    subscribe(listener: CancelListener): void;
    throwIfRequested(): void;
    unsubscribe(listener: CancelListener): void;
}

export interface RequestConfig<D = unknown> extends Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'> {
    baseURL?: string;
    body?: BodyInit | null;
    cancelToken?: CancelTokenLike;
    data?: D;
    headers?: HeadersInit;
    method?: RequestMethod;
    params?: RequestParams;
    responseType?: ResponseType;
    signal?: AbortSignal | null;
    url?: string;
    validateStatus?: ValidateStatus;
}

export interface ResolvedRequestConfig<D = unknown> extends RequestConfig<D> {
    method: RequestMethod;
    responseType: ResponseType;
    validateStatus: ValidateStatus;
}

export interface RequestResponse<T = unknown, D = unknown> {
    config: RequestConfig<D>;
    data: T;
    headers: Record<string, string>;
    request: {
        method: string;
        url: string;
    };
    status: number;
    statusText: string;
}

const ABSOLUTE_URL_REGEXP = /^([a-z][a-z\d+\-.]*:)?\/\//i;
const DEFAULT_VALIDATE_STATUS: ValidateStatus = (status) => status >= 200 && status < 300;
const NO_CONTENT_STATUS_CODES = new Set([204, 205]);
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

function isAbsoluteURL(url = ''): boolean {
    return ABSOLUTE_URL_REGEXP.test(String(url));
}

function combineURLs(baseURL = '', relativeURL = ''): string {
    return `${String(baseURL).replace(/\/+$/, '')}/${String(relativeURL).replace(/^\/+/, '')}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (Object.prototype.toString.call(value) !== '[object Object]') {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.prototype;
}

function mergeHeaders(baseHeaders?: HeadersInit, nextHeaders?: HeadersInit): Headers {
    const mergedHeaders = new Headers(baseHeaders);

    if (!nextHeaders) {
        return mergedHeaders;
    }

    new Headers(nextHeaders).forEach((value, key) => {
        mergedHeaders.set(key, value);
    });

    return mergedHeaders;
}

function buildURL(url: string, params?: RequestParams): string {
    if (!params) {
        return url;
    }

    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value == null) {
            return;
        }

        const values = Array.isArray(value) ? value : [value];

        values.forEach((item) => {
            if (item != null) {
                searchParams.append(key, String(item));
            }
        });
    });

    const serializedParams = searchParams.toString();

    if (!serializedParams) {
        return url;
    }

    return `${url}${url.includes('?') ? '&' : '?'}${serializedParams}`;
}

function isNativeBodyValue(data: unknown): data is Blob | FormData | ArrayBuffer | string {
    return typeof data === 'string' || data instanceof Blob || data instanceof FormData || data instanceof ArrayBuffer;
}

function normalizeData(data: unknown, headers: Headers): BodyInit | undefined {
    if (data == null) {
        return undefined;
    }

    if (isNativeBodyValue(data)) {
        return data;
    }

    if (ArrayBuffer.isView(data)) {
        return data as unknown as BodyInit;
    }

    if (data instanceof URLSearchParams) {
        if (!headers.has('content-type')) {
            headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }

        return data.toString();
    }

    if (isPlainObject(data) || Array.isArray(data)) {
        if (!headers.has('content-type')) {
            headers.set('content-type', 'application/json;charset=UTF-8');
        }

        return JSON.stringify(data);
    }

    return data as BodyInit;
}

function parseJSONSafely(text: string): unknown {
    if (!text) {
        return null;
    }

    return JSON.parse(text);
}

async function parseResponseData<T>(response: Response, responseType: ResponseType): Promise<T> {
    if (NO_CONTENT_STATUS_CODES.has(response.status)) {
        return null as T;
    }

    if (responseType === 'response') {
        return response as T;
    }

    if (responseType === 'blob') {
        return (await response.blob()) as T;
    }

    if (responseType === 'arrayBuffer') {
        return (await response.arrayBuffer()) as T;
    }

    if (responseType === 'formData') {
        return (await response.formData()) as T;
    }

    const responseText = await response.text();

    if (responseType === 'text') {
        return responseText as T;
    }

    if (responseType === 'json') {
        return parseJSONSafely(responseText) as T;
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        return parseJSONSafely(responseText) as T;
    }

    return responseText as T;
}

function headersToObject(headers: Headers): Record<string, string> {
    return Object.fromEntries(headers.entries());
}

function isAbortError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

function resolveRequestBody(method: string, data?: BodyInit): BodyInit | undefined {
    return METHODS_WITHOUT_BODY.has(method) ? undefined : data;
}

function assertValidStatus<T, D>(response: RequestResponse<T, D>, validateStatus: ValidateStatus): void {
    if (!validateStatus(response.status)) {
        throw new RequestError<T, D>(`请求失败: ${response.status} ${response.statusText}`, response, response.config);
    }
}

interface ResponseContext<T, D> {
    config: ResolvedRequestConfig<D>;
    data: T;
    method: string;
    requestURL: string;
    response: Response;
}

function toResolvedResponse<T, D>({
    config,
    data,
    method,
    requestURL,
    response,
}: ResponseContext<T, D>): RequestResponse<T, D> {
    return {
        config,
        data,
        headers: headersToObject(response.headers),
        request: {
            method,
            url: requestURL,
        },
        status: response.status,
        statusText: response.statusText,
    };
}

function rethrowRequestError(error: unknown, config: RequestConfig): never {
    if (isCancel(error)) {
        throw error;
    }

    if (config.cancelToken?.reason) {
        throw config.cancelToken.reason;
    }

    if (config.signal?.aborted || isAbortError(error)) {
        throw new CanceledError('请求已取消', config);
    }

    throw error;
}

export class CanceledError extends Error {
    code = 'ERR_CANCELED';
    config?: RequestConfig;
    __CANCEL__ = true;

    constructor(message = '请求已取消', config?: RequestConfig) {
        super(message);
        this.name = 'CanceledError';
        this.config = config;
    }
}

export class RequestError<T = unknown, D = unknown> extends Error {
    code = 'ERR_BAD_RESPONSE';
    config?: RequestConfig<D>;
    response?: RequestResponse<T, D>;
    status?: number;

    constructor(message: string, response?: RequestResponse<T, D>, config?: RequestConfig<D>) {
        super(message);
        this.name = 'RequestError';
        this.response = response;
        this.config = config;
        this.status = response?.status;
    }
}

function createCancelSignal(config: RequestConfig): { cleanup: () => void; signal?: AbortSignal } {
    const hasAbortSignal = Boolean(config.signal);
    const hasCancelToken = Boolean(config.cancelToken);

    if (!hasAbortSignal && !hasCancelToken) {
        return {
            cleanup() {},
            signal: undefined,
        };
    }

    config.cancelToken?.throwIfRequested();

    if (config.signal?.aborted) {
        throw new CanceledError('请求已取消', config);
    }

    const controller = new AbortController();
    const cleanups: Array<() => void> = [];

    if (config.signal) {
        const onAbort = () => {
            controller.abort(config.signal?.reason);
        };

        config.signal.addEventListener('abort', onAbort, { once: true });
        cleanups.push(() => {
            config.signal?.removeEventListener('abort', onAbort);
        });
    }

    if (config.cancelToken) {
        const onCancel = (reason: CanceledError) => {
            controller.abort(reason);
        };

        config.cancelToken.subscribe(onCancel);
        cleanups.push(() => {
            config.cancelToken?.unsubscribe(onCancel);
        });
    }

    return {
        cleanup() {
            cleanups.forEach((cleanup) => cleanup());
        },
        signal: controller.signal,
    };
}

export function isCancel(value: unknown): boolean {
    return typeof value === 'object' && value !== null && '__CANCEL__' in value && Boolean(value.__CANCEL__);
}

export function mergeConfig<D = unknown>(
    baseConfig: RequestConfig<D> = {},
    nextConfig: RequestConfig<D> = {},
): ResolvedRequestConfig<D> {
    const mergedConfig: RequestConfig<D> = {
        ...baseConfig,
        ...nextConfig,
    };

    if (baseConfig.params || nextConfig.params) {
        mergedConfig.params = {
            ...(baseConfig.params || {}),
            ...(nextConfig.params || {}),
        };
    }

    if (baseConfig.headers || nextConfig.headers) {
        mergedConfig.headers = mergeHeaders(baseConfig.headers, nextConfig.headers);
    }

    return {
        method: 'get',
        responseType: 'auto',
        validateStatus: DEFAULT_VALIDATE_STATUS,
        ...mergedConfig,
    };
}

export function toFullPath(baseURL?: string, requestedURL?: string): string {
    if (!requestedURL) {
        return baseURL || '';
    }

    if (!baseURL || isAbsoluteURL(requestedURL)) {
        return requestedURL;
    }

    return combineURLs(baseURL, requestedURL);
}

export async function dispatchRequest<T = unknown, D = unknown>(
    config: ResolvedRequestConfig<D>,
): Promise<RequestResponse<T, D>> {
    const method = String(config.method || 'get').toUpperCase();
    const headers = mergeHeaders(config.headers);
    const normalizedData = normalizeData(config.data ?? config.body, headers);
    const body = resolveRequestBody(method, normalizedData);
    const fullPath = toFullPath(config.baseURL, config.url);
    const requestURL = buildURL(fullPath, config.params);
    const { signal, cleanup } = createCancelSignal(config);

    try {
        const response = await fetch(requestURL, {
            ...(config as RequestInit),
            body,
            headers,
            method,
            signal,
        });
        const responseData = await parseResponseData<T>(response, config.responseType);
        const resolvedResponse = toResolvedResponse({
            config,
            data: responseData,
            method,
            requestURL,
            response,
        });
        assertValidStatus(resolvedResponse, config.validateStatus);

        return resolvedResponse;
    } catch (error) {
        rethrowRequestError(error, config);
    } finally {
        cleanup();
    }
}
