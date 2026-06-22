// BI 表单相关 API

import { getDataJSON, postDataJSON } from '@/core/request';

export enum FormFieldType {
    STRING = 'STRING', //单行文本
    TEXT = 'TEXT', //多行文本
    VALUE_CHOOSER = 'VALUE_CHOOSER', //单选按钮
    MULTI_VALUE_CHOOSER = 'MULTI_VALUE_CHOOSER', //多选按钮
    NUMBER = 'NUMBER', //数字
    DATE_TIME = 'DATE_TIME', //日期时间
    IMAGE_SHEET = 'IMAGE_SHEET', //图片

    //高级控件
    TABLE = 'TABLE', //子表单
    MATRIX_TABLE = 'MATRIX_TABLE', // 矩阵表格。矩阵表格跟子表单比较相似，区别在于它固定了行数，并定义了第一列的值
    RELATED_VIEW = 'RELATED_VIEW', //关联展示
    RELATED_TABLE = 'RELATED_TABLE', //关联选择
}

/**
 * 表单数据查询支持的 filterType。
 *
 * filterValue 约定：
 * - `BT` / `OPEN_BT_OPEN` / `OPEN_BT_CLOSE` / `CLOSE_BT_OPEN`：必须传 2 个值 `[min, max]`
 * - `IS_NULL` / `NOT_NULL`：建议传空数组 `[]`
 * - 其他类型：通常至少传 1 个值
 * - 多选字段（`MULTI_VALUE_CHOOSER`）下：
 *   - `EQ` 表示整组值完全相等
 *   - `CONTAIN_ALL` 表示包含全部
 *   - `CONTAIN_ANY` 表示包含任意一个
 */
export enum IFormQueryFilterType {
    /** 等于。普通字段精确匹配；多选字段表示整组值完全相等 */
    EQ = 'EQ',

    /** 不等于 */
    NE = 'NE',

    /** 大于。仅适用于数字/日期字段 */
    GT = 'GT',

    /** 小于。仅适用于数字/日期字段 */
    LT = 'LT',

    /** 大于等于。仅适用于数字/日期字段 */
    GE = 'GE',

    /** 小于等于。仅适用于数字/日期字段 */
    LE = 'LE',

    /** 闭区间 [min, max]。仅适用于数字/日期字段 */
    BT = 'BT',

    /** 开区间 (min, max)。仅适用于数字/日期字段 */
    OPEN_BT_OPEN = 'OPEN_BT_OPEN',

    /** 左开右闭 (min, max]。仅适用于数字/日期字段 */
    OPEN_BT_CLOSE = 'OPEN_BT_CLOSE',

    /** 左闭右开 [min, max)。仅适用于数字/日期字段 */
    CLOSE_BT_OPEN = 'CLOSE_BT_OPEN',

    /** 为空。仅判断字段值是否为 null */
    IS_NULL = 'IS_NULL',

    /** 不为空。仅判断字段值是否不为 null */
    NOT_NULL = 'NOT_NULL',

    /**
     * 包含。
     * 注意：普通文本字段当前后端实现实际走“等于”；
     * 在数字/日期/多选字段场景下才会表现为包含/模糊匹配语义。
     */
    CONTAINS = 'CONTAINS',

    /**
     * 不包含。
     * 注意：普通文本字段当前后端实现实际走“不等于”；
     * 在数字/日期字段场景下表现为 `NOT LIKE`。
     */
    NOT_CONTAINS = 'NOT_CONTAINS',

    /** 多选字段包含任意一个值 */
    CONTAIN_ANY = 'CONTAIN_ANY',

    /** 多选字段包含全部值 */
    CONTAIN_ALL = 'CONTAIN_ALL',

    /**
     * 单值模糊包含，实际走 `LIKE '%value%'`
     * 常用于引用填充、单字段搜索。
     */
    SINGLE_CONTAINS = 'SINGLE_CONTAINS',
}

export type IAddFormFieldDataItem = {
    fdId: string;
    keyId: string;
    type: Omit<FormFieldType, FormFieldType.TABLE | FormFieldType.MATRIX_TABLE>; // 普通字段类型，不包含子表单、矩阵表格
    value: string[] | number[] | Array<{ fileName: string; url: string }>;
};

export type IAddFormTableDataItem = {
    fdId: string;
    keyId: string;
    type: FormFieldType.TABLE | FormFieldType.MATRIX_TABLE;
    value: Array<IAddFormFieldDataItem[]>; // 子表单数据为二维数组，外层数组表示多行数据，内层数组表示每行数据的字段项
};
export type IAddFormMatrixTableDataItem = IAddFormTableDataItem;

export type IAddFormDataParams = {
    data: Array<IAddFormFieldDataItem | IAddFormTableDataItem | IAddFormMatrixTableDataItem>;
};

export type IUpdateFormTableDataItem = {
    fdId: string;
    keyId: string;
    type: FormFieldType.TABLE;
    // 二维数据，外层数组表示多行数据。第一行的中第一个是 { rowId: string }, 表示这一行的id，后面才是具体的字段数据项；第二行及以后的每一行都是字段数据项
    value: [[{ rowId: string }, ...IAddFormFieldDataItem[]], ...Array<IAddFormFieldDataItem[]>];
};
export type IUpdateFormMatrixTableDataItem = {
    fdId: string;
    keyId: string;
    type: FormFieldType.MATRIX_TABLE;
    // 二维数据，外层数组表示多行数据。每一行的第一个都是 { rowId: string }, 表示这一行的id，后面才是具体的字段数据项
    value: Array<[{ rowId: string }, ...IAddFormFieldDataItem[]]>;
};
export type IUpdateFormDataParams = {
    data: Array<IAddFormFieldDataItem | IUpdateFormTableDataItem | IUpdateFormMatrixTableDataItem>;
};

export type IAddFormDataResponse = Record<string, never>;

export type IUpdateFormDataResponse = IAddFormDataResponse;

export type IRemoveFormDataParams = string[];

export type IRemoveFormDataResponse = null;

export type IQueryFormDataFilterCondition = {
    fdId: string;
    filterType: IFormQueryFilterType;
    filterValue?: string[];
    key: string;
    name: string;
    type: FormFieldType;
};

export type IQueryFormDataFilter = {
    combineType: 'AND' | 'OR';
    condition: IQueryFormDataFilterCondition[];
    showAllData?: boolean;
};

export type IQueryFormDataParams = {
    offset?: number;
    limit?: number;
    filter?: IQueryFormDataFilter;
};

export type IFormDataRecord = Record<string, unknown> & {
    rowId: string;
};

export type IFormDataColumn = {
    fdId: string;
    name: string;
    type: FormFieldType;
    'build-in': boolean;
};

export type IQueryFormDataResponse = {
    data: IFormDataRecord[];
    offset: number;
    columns: IFormDataColumn[];
    count: number;
    limit: number;
};

export type IFormFolderNode = {
    id: string;
    fileType: 'FOLDER';
    name: string;
    child: IFormFolderListItem[];
};

export type IFormListItem = {
    id: string;
    name: string;
    parentId: string;
    fileType: 'FORM';
    utime: string;
};

export type IFormFolderListItem = IFormFolderNode | IFormListItem;

export type IFormFolderListResponse = IFormFolderNode;

export type IFormFieldControlSettings = {
    editable?: boolean;
    required?: boolean;
};

/**
 * 表单基础信息。
 * 仅保留业务上需要识别表单归属与层级关系的字段。
 */
export type IFormDetailBaseInfo = {
    fmId: string;
    name: string;
    folderId: string;
    parentId: string | null;
    fmType: 'FORM' | string;
};

/**
 * 普通字段控件。
 * 这类控件真正定义了表单字段本身。
 */
export type IFormFieldControl = {
    fdId: string;
    keyId: string;
    name: string;
    type: FormFieldType;
    seqNo: number;
    settings?: IFormFieldControlSettings;
};

/**
 * 引用填充字段来源信息。
 * queryForm.fields 中的字段最终会直接插入当前表单，因此这里需要保留来源映射。
 */
export type IFormRelatedFieldOrigin = {
    dsId: string;
    fdId: string;
    keyId: string;
};

/**
 * 引用填充控件展开出的表单字段。
 * 它们本质上也是表单字段，只是额外携带来源配置。
 */
export type IFormRelatedQueryField = Omit<IFormFieldControl, 'settings'> & {
    settings?: IFormFieldControlSettings & {
        fromForm?: boolean;
        origin?: IFormRelatedFieldOrigin;
    };
};

export type IFormRelatedQueryForm = {
    fmId: string;
    name: string;
    fields: IFormRelatedQueryField[];
};

export type IFormRelatedTableControlSettings = IFormFieldControlSettings & {
    dsName?: string;
    dsId?: string;
    fromForm?: boolean;
    keyLinks?: Array<Record<string, unknown>>;
    queryForm?: IFormRelatedQueryForm;
};

/**
 * 引用填充控件。
 * 控件本身不直接提交，但其 queryForm.fields 定义的字段会插入所属的表单结构中。
 */
export type IFormRelatedTableControl = {
    fdId: string;
    keyId: string;
    name: string;
    type: 'RELATED_TABLE';
    seqNo: number;
    settings?: IFormRelatedTableControlSettings;
};

/**
 * 子表单控件。
 * 它本身描述一层嵌套结构，真正的字段定义在 definition 中。但不能再嵌套子表单
 */
export type IFormTableControl = {
    fdId: string;
    keyId: string;
    name: string;
    type: 'TABLE';
    seqNo: number;
    settings: IFormFieldControlSettings & {
        definition: Array<IFormFieldControl | IFormRelatedTableControl>; // 子表单的字段定义
    };
};

export type IFormMatrixTableControl = {
    fdId: string;
    keyId: string;
    name: string;
    type: 'MATRIX_TABLE';
    seqNo: number;
    settings: IFormFieldControlSettings & {
        // 矩阵表格的第一个字段是固定列, 固定行数和每行的值。
        definition: [
            {
                fdId: string;
                keyId: string;
                name: string;
                type: 'LABEL';
                settings: {
                    // 定义了第一列具体的行数和每行的值
                    rows: Array<{ value: string; key: string }>;
                };
            },
            ...IFormFieldControl[], // 矩阵表格的字段定义
        ];
    };
};

export type IFormDefinitionItem =
    | IFormFieldControl
    | IFormTableControl
    | IFormRelatedTableControl
    | IFormMatrixTableControl;

/**
 * 表单详情。
 * 聚焦表单基础信息，以及由字段控件/子表单控件共同定义出的字段结构。
 */
export type IFormDetailResponse = IFormDetailBaseInfo & {
    definition: IFormDefinitionItem[];
};

/**
 * 向指定表单新增一条录入数据。
 * @param formId 表单 ID
 * @param params 表单字段数据
 * @returns 新增结果
 */
export async function addFormData(formId: string, params: IAddFormDataParams): Promise<IAddFormDataResponse> {
    const response = await postDataJSON<IAddFormDataResponse>(`/survey-engine/api/form/${formId}/data/add`, params);
    return response;
}

/**
 * 更新指定表单的一条录入数据。
 * @param formId 表单 ID
 * @param rowId 数据行 ID
 * @param params 表单字段数据。注意：子表单和矩阵表格的数据中，每行数据都需要对应的rowId
 * @returns 更新结果
 */
export async function updateFormData(
    formId: string,
    rowId: string,
    params: IUpdateFormDataParams,
): Promise<IUpdateFormDataResponse> {
    const response = await postDataJSON<IUpdateFormDataResponse>(
        `/survey-engine/api/form/${formId}/data/${rowId}/update`,
        params,
    );
    return response;
}

/**
 * 删除指定表单中的多条录入数据。
 * @param formId 表单 ID
 * @param rowIds 需要删除的数据行 ID 列表
 * @returns 删除结果。成功时返回 null，失败时抛出包含错误信息的 RequestError
 */
export async function removeFormData(formId: string, rowIds: IRemoveFormDataParams): Promise<IRemoveFormDataResponse> {
    const response = await postDataJSON<IRemoveFormDataResponse>(
        `/survey-engine/api/form/${formId}/data/remove`,
        rowIds,
    );
    return response;
}

/**
 * 查询指定表单的填报数据。
 * @param formId 表单 ID
 * @param params 分页与过滤参数
 * @returns 填报数据分页结果
 */
export async function queryFormData(formId: string, params: IQueryFormDataParams): Promise<IQueryFormDataResponse> {
    const response = await postDataJSON<IQueryFormDataResponse>(`/survey-engine/api/form/${formId}/data`, params);
    return response;
}

/**
 * 查询指定表单的字段列表。
 * @param formId 表单 ID
 * @returns 表单字段列表
 */
export async function getFormColumns(formId: string): Promise<IFormDataColumn[]> {
    const response = await getDataJSON<IFormDataColumn[]>(`/survey-engine/api/form/${formId}/columns`);
    return response;
}

/**
 * 查询填报表单目录树。
 * 第一层固定为根目录，child 中同时支持文件夹与表单节点，并可递归嵌套。
 * @returns 表单目录树
 */
export async function getFormFolderList(): Promise<IFormFolderListResponse> {
    const response = await getDataJSON<IFormFolderListResponse>('/survey-engine/api/folder/list');
    return response;
}

/**
 * 查询指定表单详情。
 * @param formId 表单 ID
 * @returns 表单基础信息与字段定义
 */
export async function getFormDetail(formId: string): Promise<IFormDetailResponse> {
    const response = await getDataJSON<IFormDetailResponse>(`/survey-engine/api/form/${formId}`);
    return response;
}
