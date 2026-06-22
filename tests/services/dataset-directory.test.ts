import { afterEach, describe, expect, it, vi } from 'vitest';
import { listDatasetDirectoryContents } from '../../src/bi-services/dataset';

function biSuccess<T>(response: T) {
    return { result: 'ok', response };
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

describe('dataset directory service', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('lists dataset directory contents with optional query params', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse(
                biSuccess({
                    dirId: 'parent-1',
                    dirName: '一级目录',
                    contents: [
                        { dirId: 'child-1', dirName: '子目录 A', type: 'DIRECTORY' },
                        { dsId: 'ds-1', name: '数据集 A', dirName: '数据集 A', type: 'DATA_SET' },
                    ],
                }),
            ),
        );

        vi.stubGlobal('fetch', fetchMock);

        const data = await listDatasetDirectoryContents({
            dirId: 'parent-1',
            folderOnly: false,
        });

        expect(data).toEqual({
            dirId: 'parent-1',
            dirName: '一级目录',
            contents: [
                { dirId: 'child-1', dirName: '子目录 A', type: 'DIRECTORY' },
                { dsId: 'ds-1', name: '数据集 A', dirName: '数据集 A', type: 'DATA_SET' },
            ],
        });
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/directory/DATA_SET?dirId=parent-1&folderOnly=false',
            expect.objectContaining({
                method: 'GET',
            }),
        );
    });
});
