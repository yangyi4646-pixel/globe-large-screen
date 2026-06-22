import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSelectorOptions } from '../../src/bi-services/selector';

function biSuccess<T>(response: T) {
    return { result: 'ok', response };
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

function getRequestBody(fetchMock: ReturnType<typeof vi.fn>) {
    const requestConfig = fetchMock.mock.calls[0]?.[1] as RequestInit;
    return JSON.parse(String(requestConfig.body));
}

describe('selector service', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('queries selector options with default payload', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse(
                biSuccess({
                    count: 1,
                    exceedLimit: false,
                    offset: 0,
                    limit: 1000,
                    result: [{ value: 'FJ', dvt: 'FJ' }],
                }),
            ),
        );

        vi.stubGlobal('fetch', fetchMock);

        const data = await getSelectorOptions('v9a472db3dcba4697bce9f0b');

        expect(data).toEqual({
            count: 1,
            exceedLimit: false,
            offset: 0,
            limit: 1000,
            result: [{ value: 'FJ', dvt: 'FJ' }],
        });
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/selector/v9a472db3dcba4697bce9f0b/data',
            expect.objectContaining({ method: 'POST' }),
        );
        expect(getRequestBody(fetchMock)).toEqual({
            fieldQuery: { offset: 0, limit: 1000 },
            dynamicParams: [],
            treeFilters: [],
            filters: [],
            layerTreeFilters: [],
        });
    });

    it('passes custom field query and filters through to the API', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse(
                biSuccess({
                    count: 2,
                    exceedLimit: false,
                    offset: 20,
                    limit: 50,
                    result: [
                        { value: 'FJ', dvt: 'FJ' },
                        { value: 'JS', dvt: 'JS' },
                    ],
                }),
            ),
        );

        vi.stubGlobal('fetch', fetchMock);

        await getSelectorOptions('selector-demo', {
            fieldQuery: { offset: 20, limit: 50 },
            dynamicParams: [{ dpId: 'region', value: 'east' }],
            treeFilters: [{ fdId: 'province', filterType: 'IN', filterValue: ['FJ'] }],
            filters: [{ fdId: 'city', filterType: 'IN', filterValue: ['厦门'] }],
            layerTreeFilters: [{ fdId: 'district', filterType: 'IN', filterValue: ['思明区'] }],
        });

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/selector/selector-demo/data',
            expect.objectContaining({ method: 'POST' }),
        );
        expect(getRequestBody(fetchMock)).toEqual({
            fieldQuery: { offset: 20, limit: 50 },
            dynamicParams: [{ dpId: 'region', value: 'east' }],
            treeFilters: [{ fdId: 'province', filterType: 'IN', filterValue: ['FJ'] }],
            filters: [{ fdId: 'city', filterType: 'IN', filterValue: ['厦门'] }],
            layerTreeFilters: [{ fdId: 'district', filterType: 'IN', filterValue: ['思明区'] }],
        });
    });
});
