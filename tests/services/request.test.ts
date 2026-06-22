import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    CancelToken,
    get,
    getDataJSON,
    getJSON,
    post,
    postDataJSON,
    postJSON,
    request,
    RequestError,
} from '../../src/core/request';

function biSuccess<T>(response: T) {
    return { result: 'success', response };
}

function biError(message: string, status = 500) {
    return { result: 'fail', error: { message, status, detail: { notifyType: 0 } } };
}

function biDataSuccess<T>(data: T, msg = 'success') {
    return { code: 0, msg, data };
}

function biDataError(code: number, msg: string) {
    return { code, msg, data: null };
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

describe('request', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('builds request URLs with query params via get', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

        vi.stubGlobal('fetch', fetchMock);

        const response = await get<{ ok: boolean }>('/api/query', { page: 1, tags: ['a', 'b'] });

        expect(response.data).toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/query?page=1&tags=a&tags=b',
            expect.objectContaining({ body: undefined, method: 'GET' }),
        );

        const requestConfig = fetchMock.mock.calls[0]?.[1] as RequestInit;
        const headers = new Headers(requestConfig.headers);

        expect(headers.get('raw-backend-response')).toBe('TRUE');
    });

    it('serializes plain objects as JSON for post', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ saved: true }));

        vi.stubGlobal('fetch', fetchMock);

        await post('/api/save', { name: 'demo' });

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/save',
            expect.objectContaining({ body: JSON.stringify({ name: 'demo' }), method: 'POST' }),
        );
    });

    it('extracts response field from BIUniversalJsonResponse via getJSON', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(biSuccess({ id: 1, name: 'Alice' })));

        vi.stubGlobal('fetch', fetchMock);

        const data = await getJSON<{ id: number; name: string }>('/api/users/1');

        expect(data).toEqual({ id: 1, name: 'Alice' });
    });

    it('extracts response field from BIUniversalJsonResponse via postJSON', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(biSuccess({ id: 2 })));

        vi.stubGlobal('fetch', fetchMock);

        const data = await postJSON<{ id: number }>('/api/users', { name: 'Bob' });

        expect(data).toEqual({ id: 2 });
    });

    it('extracts data field from code/msg/data response via getJSON for survey engine APIs', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(biDataSuccess([{ fdId: 'city', name: '城市' }])));

        vi.stubGlobal('fetch', fetchMock);

        const data = await getJSON<Array<{ fdId: string; name: string }>>('/survey-engine/api/form/demo/columns');

        expect(data).toEqual([{ fdId: 'city', name: '城市' }]);
    });

    it('extracts data field from code/msg/data response via postJSON for survey engine APIs', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(biDataSuccess({ id: 3 })));

        vi.stubGlobal('fetch', fetchMock);

        const data = await postJSON<{ id: number }>('/survey-engine/api/form/demo/data', { limit: 20 });

        expect(data).toEqual({ id: 3 });
    });

    it('extracts data field from code/msg/data response via postDataJSON', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(biDataSuccess({ id: 3 })));

        vi.stubGlobal('fetch', fetchMock);

        const data = await postDataJSON<{ id: number }>('/survey-engine/api/form/demo/data', { limit: 20 });

        expect(data).toEqual({ id: 3 });
    });

    it('extracts data field from code/msg/data response via getDataJSON', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(biDataSuccess([{ fdId: 'city', name: '城市' }])));

        vi.stubGlobal('fetch', fetchMock);

        const data = await getDataJSON<Array<{ fdId: string; name: string }>>('/survey-engine/api/form/demo/columns');

        expect(data).toEqual([{ fdId: 'city', name: '城市' }]);
    });

    it('throws RequestError when BIUniversalJsonResponse contains an error field', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(biError('参数校验失败')));

        vi.stubGlobal('fetch', fetchMock);

        await expect(getJSON('/api/users/1')).rejects.toMatchObject({
            name: 'RequestError',
            message: '参数校验失败',
        });
    });

    it('throws RequestError with BI error message on HTTP 4xx/5xx', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(biError('未授权访问', 401), 401));

        vi.stubGlobal('fetch', fetchMock);

        await expect(postJSON('/api/protected')).rejects.toMatchObject({
            name: 'RequestError',
            message: '未授权访问',
        });
    });

    it('throws RequestError on HTTP 5xx with non-JSON body', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(
                new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' }),
            );

        vi.stubGlobal('fetch', fetchMock);

        const error = await getJSON('/api/broken').catch((e: unknown) => e);

        expect(error).toBeInstanceOf(RequestError);
    });

    it('throws RequestError when code/msg/data response contains a non-zero code', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(biDataError(4001, '查询条件非法')));

        vi.stubGlobal('fetch', fetchMock);

        await expect(postDataJSON('/survey-engine/api/form/demo/data')).rejects.toMatchObject({
            name: 'RequestError',
            message: '查询条件非法',
        });
    });

    it('throws RequestError via postJSON when survey engine response code is non-zero', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(biDataError(4001, '查询条件非法')));

        vi.stubGlobal('fetch', fetchMock);

        await expect(postJSON('/survey-engine/api/form/demo/data')).rejects.toMatchObject({
            name: 'RequestError',
            message: '查询条件非法',
        });
    });

    it('rejects before fetch when the cancel token is already canceled', async () => {
        const fetchMock = vi.fn();
        const source = CancelToken.source();

        vi.stubGlobal('fetch', fetchMock);
        source.cancel('stop now');

        await expect(request('/api/query', { cancelToken: source.token })).rejects.toMatchObject({
            code: 'ERR_CANCELED',
            message: 'stop now',
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('allows explicit headers to override the default raw backend response header', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

        vi.stubGlobal('fetch', fetchMock);

        await get('/api/query', undefined, { 'raw-backend-response': 'FALSE', 'x-trace-id': 'trace-1' });

        const requestConfig = fetchMock.mock.calls[0]?.[1] as RequestInit;
        const headers = new Headers(requestConfig.headers);

        expect(headers.get('raw-backend-response')).toBe('FALSE');
        expect(headers.get('x-trace-id')).toBe('trace-1');
    });
});
