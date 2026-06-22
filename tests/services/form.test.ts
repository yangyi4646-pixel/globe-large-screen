import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    FormFieldType,
    IFormQueryFilterType,
    addFormData,
    getFormColumns,
    getFormDetail,
    getFormFolderList,
    queryFormData,
    updateFormData,
} from '../../src/bi-services/form';
import {
    buildAddFormDataParams,
    buildFormDetailResponse,
    buildUpdateFormDataParams,
    jsonResponse,
    surveySuccess,
} from './form.fixtures';

describe('form service', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('submits form data via /survey-engine/api/form/{formId}/data/add', async () => {
        const formId = '_b9dc8dd-ccbd-4474-b3a7-8ee3c2d1937a';
        const params = buildAddFormDataParams();
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(surveySuccess({})));
        vi.stubGlobal('fetch', fetchMock);
        const data = await addFormData(formId, params);

        expect(data).toEqual({});
        expect(fetchMock).toHaveBeenCalledWith(
            `/survey-engine/api/form/${formId}/data/add`,
            expect.objectContaining({ method: 'POST', body: JSON.stringify(params) }),
        );
    });

    it('updates form data via /survey-engine/api/form/{formId}/data/{rowId}/update', async () => {
        const formId = '_b9dc8dd-ccbd-4474-b3a7-8ee3c2d1937a';
        const rowId = '65968494-ca0c-47b3-a382-fb35b7bc43d7';
        const params = buildUpdateFormDataParams();
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(surveySuccess({})));
        vi.stubGlobal('fetch', fetchMock);
        const data = await updateFormData(formId, rowId, params);

        expect(data).toEqual({});
        expect(fetchMock).toHaveBeenCalledWith(
            `/survey-engine/api/form/${formId}/data/${rowId}/update`,
            expect.objectContaining({ method: 'POST', body: JSON.stringify(params) }),
        );
    });

    it('queries form data via /survey-engine/api/form/{formId}/data', async () => {
        const formId = '_b9dc8dd-ccbd-4474-b3a7-8ee3c2d1937a';
        const params = {
            offset: 0,
            limit: 20,
            filter: {
                combineType: 'AND' as const,
                condition: [
                    {
                        fdId: '_0a099c5-c20b-4b8f-bce7-75e61d813a7c',
                        filterType: IFormQueryFilterType.CONTAINS,
                        filterValue: ['你好'],
                        key: '1774426520290',
                        name: '单行文本',
                        type: FormFieldType.STRING,
                    },
                ],
                showAllData: false,
            },
        };
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse(
                surveySuccess({
                    data: [
                        {
                            '_a73dc88-7d08-4280-9fe5-b985201be90a': '23',
                            editor: '王贺锋',
                            creator: '王贺锋',
                            '_0a099c5-c20b-4b8f-bce7-75e61d813a7c': '你好',
                            c_time: '2026-03-25 16:11:42',
                            rowId: '65968494-ca0c-47b3-a382-fb35b7bc43d7',
                            '_edffe2f-0f84-4e05-bd6d-a891048d54b1': '收到官方',
                            u_time: '2026-03-25 16:11:42',
                        },
                    ],
                    offset: 0,
                    columns: [
                        {
                            fdId: '_0a099c5-c20b-4b8f-bce7-75e61d813a7c',
                            name: '单行文本',
                            type: FormFieldType.STRING,
                            'build-in': false,
                        },
                        {
                            fdId: '_edffe2f-0f84-4e05-bd6d-a891048d54b1',
                            name: '名称',
                            type: FormFieldType.STRING,
                            'build-in': false,
                        },
                        {
                            fdId: '_a73dc88-7d08-4280-9fe5-b985201be90a',
                            name: '数值',
                            type: FormFieldType.NUMBER,
                            'build-in': false,
                        },
                        {
                            fdId: 'creator',
                            name: '创建者名称',
                            type: FormFieldType.STRING,
                            'build-in': true,
                        },
                        {
                            fdId: 'editor',
                            name: '修改者名称',
                            type: FormFieldType.STRING,
                            'build-in': true,
                        },
                        {
                            fdId: 'c_time',
                            name: '创建时间',
                            type: FormFieldType.DATE_TIME,
                            'build-in': true,
                        },
                        {
                            fdId: 'u_time',
                            name: '修改时间',
                            type: FormFieldType.DATE_TIME,
                            'build-in': true,
                        },
                    ],
                    count: 1,
                    limit: 20,
                }),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);
        const data = await queryFormData(formId, params);
        expect(data).toEqual({
            data: [
                {
                    '_a73dc88-7d08-4280-9fe5-b985201be90a': '23',
                    editor: '王贺锋',
                    creator: '王贺锋',
                    '_0a099c5-c20b-4b8f-bce7-75e61d813a7c': '你好',
                    c_time: '2026-03-25 16:11:42',
                    rowId: '65968494-ca0c-47b3-a382-fb35b7bc43d7',
                    '_edffe2f-0f84-4e05-bd6d-a891048d54b1': '收到官方',
                    u_time: '2026-03-25 16:11:42',
                },
            ],
            offset: 0,
            columns: [
                {
                    fdId: '_0a099c5-c20b-4b8f-bce7-75e61d813a7c',
                    name: '单行文本',
                    type: FormFieldType.STRING,
                    'build-in': false,
                },
                {
                    fdId: '_edffe2f-0f84-4e05-bd6d-a891048d54b1',
                    name: '名称',
                    type: FormFieldType.STRING,
                    'build-in': false,
                },
                {
                    fdId: '_a73dc88-7d08-4280-9fe5-b985201be90a',
                    name: '数值',
                    type: FormFieldType.NUMBER,
                    'build-in': false,
                },
                {
                    fdId: 'creator',
                    name: '创建者名称',
                    type: FormFieldType.STRING,
                    'build-in': true,
                },
                {
                    fdId: 'editor',
                    name: '修改者名称',
                    type: FormFieldType.STRING,
                    'build-in': true,
                },
                {
                    fdId: 'c_time',
                    name: '创建时间',
                    type: FormFieldType.DATE_TIME,
                    'build-in': true,
                },
                {
                    fdId: 'u_time',
                    name: '修改时间',
                    type: FormFieldType.DATE_TIME,
                    'build-in': true,
                },
            ],
            count: 1,
            limit: 20,
        });
        expect(fetchMock).toHaveBeenCalledWith(
            `/survey-engine/api/form/${formId}/data`,
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(params),
            }),
        );
    });

    it('queries form columns via /survey-engine/api/form/{formId}/columns', async () => {
        const formId = '_b9dc8dd-ccbd-4474-b3a7-8ee3c2d1937a';
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse(
                surveySuccess([
                    {
                        fdId: '_0a099c5-c20b-4b8f-bce7-75e61d813a7c',
                        name: '单行文本',
                        type: FormFieldType.STRING,
                        'build-in': false,
                    },
                    {
                        fdId: 'creator',
                        name: '创建者名称',
                        type: FormFieldType.STRING,
                        'build-in': true,
                    },
                ]),
            ),
        );

        vi.stubGlobal('fetch', fetchMock);

        const data = await getFormColumns(formId);

        expect(data).toEqual([
            {
                fdId: '_0a099c5-c20b-4b8f-bce7-75e61d813a7c',
                name: '单行文本',
                type: FormFieldType.STRING,
                'build-in': false,
            },
            {
                fdId: 'creator',
                name: '创建者名称',
                type: FormFieldType.STRING,
                'build-in': true,
            },
        ]);
        expect(fetchMock).toHaveBeenCalledWith(
            `/survey-engine/api/form/${formId}/columns`,
            expect.objectContaining({
                body: undefined,
                method: 'GET',
            }),
        );
    });

    it('queries form detail via /survey-engine/api/form/{formId}', async () => {
        const formId = '_57b7128-182e-447a-843f-77872a599790';
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(surveySuccess(buildFormDetailResponse(formId))));

        vi.stubGlobal('fetch', fetchMock);

        const data = await getFormDetail(formId);

        expect(data.fmId).toBe(formId);
        expect(data.name).toBe('跳转123');
        expect(data.folderId).toBe('0');
        expect(data.parentId).toBeNull();
        expect(data.definition).toHaveLength(2);
        expect(data.definition[1]).toMatchObject({
            fdId: '_cdba268-d000-4d95-80c7-29945c336945',
            type: FormFieldType.TABLE,
            settings: {
                definition: [
                    {
                        fdId: '_b9a671f-948e-4f20-87ca-85011ec090c3',
                        type: FormFieldType.RELATED_TABLE,
                        settings: {
                            queryForm: {
                                fields: [
                                    {
                                        settings: {
                                            origin: {
                                                dsId: 'x3723f193f7844db6bed9b68',
                                                fdId: 'bfa340ea96db5450c9339719',
                                                keyId: 'bfa340ea96db5450c9339719',
                                            },
                                            fromForm: false,
                                        },
                                        seqNo: 2,
                                        fdId: '_da7a929-ea69-4db6-8f6e-31db4678fb67',
                                        name: '省份',
                                        keyId: '1773986013099',
                                        type: FormFieldType.STRING,
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
        });
        expect(fetchMock).toHaveBeenCalledWith(
            `/survey-engine/api/form/${formId}`,
            expect.objectContaining({
                body: undefined,
                method: 'GET',
            }),
        );
    });

    it('queries form folder tree via /survey-engine/api/folder/list', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse(
                surveySuccess({
                    id: '0',
                    fileType: 'FOLDER',
                    name: '根目录',
                    child: [
                        {
                            id: 'folder-1',
                            fileType: 'FOLDER',
                            name: '业务表单',
                            child: [
                                {
                                    id: 'form-1',
                                    name: '客户满意度回收',
                                    parentId: 'folder-1',
                                    fileType: 'FORM',
                                    utime: '2026-03-25 18:30:00',
                                },
                            ],
                        },
                        {
                            id: 'form-2',
                            name: '报名登记',
                            parentId: '0',
                            fileType: 'FORM',
                            utime: '2026-03-25 19:00:00',
                        },
                    ],
                }),
            ),
        );

        vi.stubGlobal('fetch', fetchMock);

        const data = await getFormFolderList();

        expect(data).toEqual({
            id: '0',
            fileType: 'FOLDER',
            name: '根目录',
            child: [
                {
                    id: 'folder-1',
                    fileType: 'FOLDER',
                    name: '业务表单',
                    child: [
                        {
                            id: 'form-1',
                            name: '客户满意度回收',
                            parentId: 'folder-1',
                            fileType: 'FORM',
                            utime: '2026-03-25 18:30:00',
                        },
                    ],
                },
                {
                    id: 'form-2',
                    name: '报名登记',
                    parentId: '0',
                    fileType: 'FORM',
                    utime: '2026-03-25 19:00:00',
                },
            ],
        });
        expect(fetchMock).toHaveBeenCalledWith(
            '/survey-engine/api/folder/list',
            expect.objectContaining({ body: undefined, method: 'GET' }),
        );
    });
});
