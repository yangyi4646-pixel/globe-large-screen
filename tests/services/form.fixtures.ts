import {
    FormFieldType,
    type IAddFormDataParams,
    type IFormDetailResponse,
    type IUpdateFormDataParams,
} from '../../src/bi-services/form';

export function surveySuccess<T>(data: T) {
    return { code: 0, msg: 'success', data };
}

export function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

export function buildFormDetailResponse(formId: string): IFormDetailResponse {
    return {
        settings: {
            readable: true,
            primaryKeys: [],
            editable: true,
        },
        creator: 'cd5794b39680d45ccae0a454',
        approvalSettings: null,
        utime: '2026-03-20 14:30:41',
        domId: 'testing',
        'X-Tag': null,
        description: '',
        isFakeOwner: false,
        parentId: null,
        folderId: '0',
        fmId: formId,
        templateSettings: {
            excelType: '.xlsx',
            hasTemplate: false,
        },
        isOwner: true,
        fmType: 'FORM',
        name: '跳转123',
        ctime: '2026-03-17 10:52:34',
        definition: [
            {
                settings: {
                    editable: true,
                    required: false,
                },
                seqNo: 1,
                fdId: '_d1685d5-ff02-4bf4-b287-8d4e6c647155',
                name: '单行文本',
                keyId: '1773986576800',
                description: '',
                type: FormFieldType.STRING,
            },
            {
                settings: {
                    editable: true,
                    required: false,
                    definition: [
                        {
                            settings: {
                                dsName: '产品练习',
                                dsId: 'x3723f193f7844db6bed9b68',
                                editable: true,
                                fromForm: false,
                                keyLinks: [],
                                queryForm: {
                                    fmId: 'x3723f193f7844db6bed9b68',
                                    name: '产品练习',
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
                                required: false,
                            },
                            seqNo: 1,
                            fdId: '_b9a671f-948e-4f20-87ca-85011ec090c3',
                            name: '1',
                            keyId: '1773985931788',
                            description: '',
                            type: FormFieldType.RELATED_TABLE,
                        },
                    ],
                },
                seqNo: 2,
                fdId: '_cdba268-d000-4d95-80c7-29945c336945',
                name: '子表格',
                keyId: '1773985781725',
                description: '',
                type: FormFieldType.TABLE,
            },
        ],
        isReadable: true,
    } as unknown as IFormDetailResponse;
}

export function buildAddFormDataParams(): IAddFormDataParams {
    return {
        data: [
            {
                fdId: '_0a099c5-c20b-4b8f-bce7-75e61d813a7c',
                keyId: '1773631741172',
                type: FormFieldType.STRING,
                value: ['你好'],
            },
            {
                fdId: '_edffe2f-0f84-4e05-bd6d-a891048d54b1',
                keyId: '1773631819417',
                type: FormFieldType.TEXT,
                value: ['收到官方'],
            },
            {
                fdId: '_a73dc88-7d08-4280-9fe5-b985201be90a',
                keyId: '1773631831552',
                type: FormFieldType.NUMBER,
                value: [23],
            },
            {
                fdId: '_cdba268-d000-4d95-80c7-29945c336945',
                keyId: '1773985781725',
                type: FormFieldType.TABLE,
                value: [
                    [
                        {
                            fdId: '_d1685d5-ff02-4bf4-b287-8d4e6c647155',
                            keyId: '1773986576800',
                            type: FormFieldType.STRING,
                            value: ['子表单-第一行'],
                        },
                    ],
                ],
            },
        ],
    };
}

export function buildUpdateFormDataParams(): IUpdateFormDataParams {
    return {
        data: [
            {
                fdId: '_0a099c5-c20b-4b8f-bce7-75e61d813a7c',
                keyId: '1773631741172',
                type: FormFieldType.STRING,
                value: ['你好-修改'],
            },
            {
                fdId: '_edffe2f-0f84-4e05-bd6d-a891048d54b1',
                keyId: '1773631819417',
                type: FormFieldType.TEXT,
                value: ['收到官方'],
            },
            {
                fdId: '_cdba268-d000-4d95-80c7-29945c336945',
                keyId: '1773985781725',
                type: FormFieldType.TABLE,
                value: [
                    [
                        { rowId: 'sub-row-1' },
                        {
                            fdId: '_d1685d5-ff02-4bf4-b287-8d4e6c647155',
                            keyId: '1773986576800',
                            type: FormFieldType.STRING,
                            value: ['子表单-第一行-修改'],
                        },
                    ],
                ],
            } as IUpdateFormDataParams['data'][number],
        ],
    };
}
