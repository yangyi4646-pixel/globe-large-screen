import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatasetFromCsv, createDatasetFromExcel, readDatasetPreviewFile } from '../../src/bi-services/dataset';

function biSuccess<T>(response: T) {
    return { result: 'ok', response };
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

describe('dataset service', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reads preview file via /api/account/readPreviewFile', async () => {
        const params = {
            taskId: 'ee997b20-281b-11f1-a5ba-d703edf1e35a',
            fileName: 'je0f054395b004041afe3727',
        };
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse(
                biSuccess({
                    columns: [
                        { fdId: 'city', name: '城市', fdType: 'STRING' },
                        { fdId: 'sales', name: '销售额', fdType: 'DOUBLE' },
                    ],
                    preview: [
                        ['上海', '1200'],
                        ['北京', '980'],
                    ],
                }),
            ),
        );

        vi.stubGlobal('fetch', fetchMock);

        const data = await readDatasetPreviewFile(params);

        expect(data).toEqual({
            columns: [
                { fdId: 'city', name: '城市', fdType: 'STRING' },
                { fdId: 'sales', name: '销售额', fdType: 'DOUBLE' },
            ],
            preview: [
                ['上海', '1200'],
                ['北京', '980'],
            ],
        });
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/account/readPreviewFile',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(params),
            }),
        );
    });

    it('creates dataset from the first uploaded excel ticket and first selected sheet', async () => {
        const formData = new FormData();
        formData.append(
            '0',
            new Blob(['excel-bytes'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            'bugs.xlsx',
        );

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse(
                    biSuccess({
                        tickets: [
                            {
                                fileId: 'file-1',
                                name: 'bugs.xlsx',
                                isFail: false,
                                backendAddress: '',
                                sheets: {
                                    elements: [{ label: 'Sheet1' }],
                                },
                            },
                            {
                                fileId: 'file-2',
                                name: 'ignored.xlsx',
                                isFail: false,
                                backendAddress: '',
                                sheets: {
                                    elements: [{ label: 'ignored-sheet' }],
                                },
                            },
                        ],
                    }),
                ),
            )
            .mockResolvedValueOnce(
                jsonResponse(
                    biSuccess({
                        merge: true,
                        dsInfos: [
                            {
                                fileId: 'file-1',
                                fileName: 'bugs.xlsx',
                                sheetId: 0,
                                dsName: 'original-name',
                                backendAddress: '',
                                encoding: 'UTF-8',
                                delimiter: 'COMMA',
                                quote: '"',
                                escape: '',
                            },
                        ],
                    }),
                ),
            )
            .mockResolvedValueOnce(
                jsonResponse(
                    biSuccess({
                        dirId: 'root-dir',
                        dirName: '根目录',
                    }),
                ),
            )
            .mockResolvedValueOnce(
                jsonResponse(
                    biSuccess([
                        {
                            response: {
                                taskId: 'task-1',
                                status: '已提交',
                                result: '处理中',
                                dsId: 'dataset-1',
                            },
                        },
                    ]),
                ),
            );

        vi.stubGlobal('fetch', fetchMock);

        const result = await createDatasetFromExcel({
            formData,
            name: 'renamed-dataset',
        });

        expect(result).toEqual([
            {
                response: {
                    taskId: 'task-1',
                    status: '已提交',
                    result: '处理中',
                    dsId: 'dataset-1',
                },
            },
        ]);
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/backend/import/upload-files/excel',
            expect.objectContaining({
                method: 'POST',
                body: formData,
            }),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            '/api/import/selected-sheets',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    selectedSheets: [
                        {
                            fileId: 'file-1',
                            name: 'bugs.xlsx',
                            isFail: false,
                            backendAddress: '',
                            sheetIds: [0],
                            sheets: ['Sheet1'],
                        },
                    ],
                    merge: false,
                    fileType: 'excel',
                }),
            }),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            3,
            '/api/directory/DATA_SET?folderOnly=true',
            expect.objectContaining({
                method: 'GET',
            }),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            4,
            '/api/import/batch-import',
            expect.objectContaining({
                method: 'POST',
                data: {
                    merge: true,
                    selectedSheets: [
                        {
                            fileId: 'file-1',
                            name: 'bugs.xlsx',
                            isFail: false,
                            backendAddress: '',
                            sheetIds: [0],
                            sheets: ['Sheet1'],
                        },
                    ],
                    dsInfos: [
                        {
                            fileId: 'file-1',
                            fileName: 'bugs.xlsx',
                            sheetId: 0,
                            dsName: 'renamed-dataset',
                            backendAddress: '',
                            encoding: 'UTF-8',
                            delimiter: 'COMMA',
                            quote: '"',
                            escape: '',
                            parentDirId: 'root-dir',
                        },
                    ],
                    markAsSensitive: false,
                },
            }),
        );
    });

    it('creates dataset from csv using selectedSheets [0] placeholders', async () => {
        const formData = new FormData();
        formData.append('0', new Blob(['taskId,title\n1,test'], { type: 'text/csv' }), 'bugs.csv');

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse(
                    biSuccess({
                        tickets: [
                            {
                                fileId: 'file-1',
                                name: 'bugs.csv',
                                isFail: false,
                                backendAddress: '',
                            },
                            {
                                fileId: 'file-2',
                                name: 'ignored.csv',
                                isFail: false,
                                backendAddress: '',
                                sheets: {
                                    elements: [{ label: 'ignored-sheet' }],
                                },
                            },
                        ],
                    }),
                ),
            )
            .mockResolvedValueOnce(
                jsonResponse(
                    biSuccess({
                        merge: true,
                        dsInfos: [
                            {
                                fileId: 'file-1',
                                fileName: 'bugs.csv',
                                sheetId: 0,
                                dsName: 'original-name',
                                backendAddress: '',
                                encoding: 'UTF-8',
                                delimiter: 'COMMA',
                                quote: '"',
                                escape: '',
                            },
                            {
                                fileId: 'file-1',
                                fileName: 'bugs.csv',
                                sheetId: 1,
                                dsName: 'ignored-sheet',
                                backendAddress: '',
                                encoding: 'UTF-8',
                                delimiter: 'COMMA',
                                quote: '"',
                                escape: '',
                            },
                        ],
                    }),
                ),
            )
            .mockResolvedValueOnce(
                jsonResponse(
                    biSuccess({
                        dirId: 'root-dir',
                        dirName: '根目录',
                    }),
                ),
            )
            .mockResolvedValueOnce(
                jsonResponse(
                    biSuccess([
                        {
                            response: {
                                taskId: 'task-1',
                                status: '已提交',
                                result: '处理中',
                                dsId: 'dataset-1',
                            },
                        },
                    ]),
                ),
            );

        vi.stubGlobal('fetch', fetchMock);

        const result = await createDatasetFromCsv({
            formData,
            name: 'renamed-dataset',
        });

        expect(result).toEqual([
            {
                response: {
                    taskId: 'task-1',
                    status: '已提交',
                    result: '处理中',
                    dsId: 'dataset-1',
                },
            },
        ]);
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/backend/import/upload-files/csv',
            expect.objectContaining({
                method: 'POST',
                body: formData,
            }),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            '/api/import/selected-sheets',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    selectedSheets: [
                        {
                            fileId: 'file-1',
                            name: 'bugs.csv',
                            isFail: false,
                            backendAddress: '',
                            sheetIds: [0],
                            sheets: [0],
                        },
                    ],
                    merge: false,
                    fileType: 'csv',
                }),
            }),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            3,
            '/api/directory/DATA_SET?folderOnly=true',
            expect.objectContaining({
                method: 'GET',
            }),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            4,
            '/api/import/batch-import',
            expect.objectContaining({
                method: 'POST',
                data: {
                    merge: true,
                    selectedSheets: [
                        {
                            fileId: 'file-1',
                            name: 'bugs.csv',
                            isFail: false,
                            backendAddress: '',
                            sheetIds: [0],
                            sheets: [0],
                        },
                    ],
                    dsInfos: [
                        {
                            fileId: 'file-1',
                            fileName: 'bugs.csv',
                            sheetId: 0,
                            dsName: 'renamed-dataset',
                            backendAddress: '',
                            encoding: 'UTF-8',
                            delimiter: 'COMMA',
                            quote: '"',
                            escape: '',
                            parentDirId: 'root-dir',
                        },
                    ],
                    markAsSensitive: false,
                },
            }),
        );
    });
});
