// BI 数据集相关 API

import { getJSON, postJSON } from '@/core/request';
import { BIField, BIFieldType } from '@/vite-env';

type IDatasetDetail = {
    dsId: string;
    name: string;
    description: string;
    columns: Array<
        BIField & {
            alias?: string;
            formula?: string;
            level: 'dataset';
        }
    >;
    virtualColumns: Array<
        BIField & {
            isAggregated: true;
            formula?: string;
            level: 'dataset';
        }
    >;
    rowCount: number; // 行数
    cardCount: number; // 卡片数量
    status: string;
    parentDirId: string;
    dirPath: Array<{ dirId: string; dirName: string }>;

    // 类型 & 来源
    cnId: string; // 数据账户
    displayType: string;
    config: {
        sourceType: string;
        dataDesensitization: string;
    };
    ctime: string; // 创建时间
    utime: string; // 更新时间
};

/**
 * 根据 dsId 查询数据集的详情信息
 * @param dsId
 * @returns
 */
export async function getDatasetDetail(dsId: string): Promise<IDatasetDetail> {
    const response = await getJSON<IDatasetDetail>(`/api/data-source/${dsId}`);
    return response;
}

type IDatasetPreviewFilterValue = {
    seqNo: number;
    calculationType?: string;
    level?: 'dataset';
    baseFdType?: BIFieldType;
    hidden?: boolean;
    dsId: string;
    name: string;
    isSensitive?: boolean;
    isAggregated?: boolean;
    fdType: BIFieldType;
    fdId: string;
    isDetectionSensitive?: boolean;
    metaType?: 'DIM' | 'METRIC';
    filterType: string;
    filterValue?: unknown[];
    uniqueKey?: string;
};

type IDatasetPreviewFilterCondition = {
    not?: boolean;
    type: 'condition';
    value: IDatasetPreviewFilterValue;
};

type IDatasetPreviewFilter = {
    combineType: 'AND' | 'OR';
    conditions: IDatasetPreviewFilterCondition[];
};

export type IPreviewDatasetDataWithFilterAsyncParams = {
    offset?: number;
    limit?: number;
    filter?: IDatasetPreviewFilter;
};

export type IPreviewDatasetDataWithFilterAsyncResponse = {
    status: string;
    result: string;
    taskId: string; // 任务 ID。后续需要通过 taskId 查询任务状态及结束后的预览文件
};

/**
 * 根据数据集筛选条件发起异步预览查询。
 *
 * 调用链路说明：
 * 1. 先调用当前方法，拿到异步任务的 `taskId`
 * 2. 基于 `taskId` 轮询任务状态，直到任务结束；任务成功后，从任务状态响应的 `result.value` 中读取预览文件名 `fileName`
 * 3. 再将 `taskId` 和 `fileName` 传给 `readDatasetPreviewFile`，获取最终的预览表格数据
 *
 * 当前方法本身只负责创建异步预览任务，不直接返回最终的预览数据。
 * @param dsId 数据集 ID
 * @param params 查询参数
 * @returns 异步任务信息
 */
export async function previewDatasetDataWithFilterAsync(
    dsId: string,
    params: IPreviewDatasetDataWithFilterAsyncParams,
): Promise<IPreviewDatasetDataWithFilterAsyncResponse> {
    const response = await postJSON<IPreviewDatasetDataWithFilterAsyncResponse>(
        `/api/data-source/${dsId}/preview-with-filter-async`,
        params,
    );
    return response;
}

export type IReadDatasetPreviewFileParams = {
    taskId: string;
    fileName: string;
};

export type IReadDatasetPreviewFileResponse = {
    columns: BIField[];
    preview: string[][]; // 预览数据。每行一个数组，每个数组元素为预览数据的一个单元格内容。
};

/**
 * 读取异步预览任务生成的文件内容。
 * @param params 任务与文件信息
 * @returns 预览字段与预览数据
 */
export async function readDatasetPreviewFile(
    params: IReadDatasetPreviewFileParams,
): Promise<IReadDatasetPreviewFileResponse> {
    const response = await postJSON<IReadDatasetPreviewFileResponse>('/api/account/readPreviewFile', params);
    return response;
}

export type IUploadDatasetFileType = 'csv' | 'excel';

export type IUploadDatasetFileTicket = {
    fileId: string;
    name: string;
    isFail: boolean;
    backendAddress: string;
    // excel 上传时才会返回 sheet 信息
    sheets?: {
        elements?: Array<{
            label: string | number;
        }>;
    };
};

export type IUploadDatasetFilesResponse = {
    tickets: IUploadDatasetFileTicket[];
};

export type ICreateFileDatasetsSelectedSheet = {
    fileId: string;
    name: string;
    isFail: boolean;
    backendAddress: string;
    sheetIds: number[];
    sheets: Array<string | number>;
};

export type ICreateFileDatasetsDsInfo = {
    fileId: string;
    fileName: string;
    sheetId: number;
    dsName: string;
    backendAddress: string;
    // csv特有字段：文件编码、分隔符、封闭字符、逃逸字符
    encoding: string;
    delimiter: string;
    quote: string; // 封闭字符
    escape: string;
    parentDirId: string;
    primaryKeyColumns?: string[];
};

/**
 * 上传用于创建文件数据集的 CSV / Excel 文件。
 *
 * 文件导入链路：
 * 1. 先调用当前方法上传原始文件，拿到 `tickets`
 * 2. 再将 `tickets` 转成 `selectedSheets`，调用 `selectDatasetSheets`
 * 3. 如需让用户确认字段类型、分隔符、主键等配置，再基于某个 `dsInfo` 调用 `previewBatchFile`
 * 4. 最后汇总确认后的 `selectedSheets` 与 `dsInfos`，调用 `importSelectedSheetsAsDatasets`
 * 5. 如果不需要逐步控制，也可以直接调用编排方法 `createDatasetFromExcel` 或 `createDatasetFromCsv`
 *
 * 请求体需为 `FormData`，并按后端约定将文件二进制放在 key `0` 下。
 * @param fileType 文件类型，对应接口 path 中的 `csv` 或 `excel`
 * @param formData 上传表单数据
 * @returns 上传成功后的文件票据信息
 */
export async function uploadDatasetFiles(
    fileType: IUploadDatasetFileType,
    formData: FormData,
): Promise<IUploadDatasetFilesResponse> {
    const response = await postJSON<IUploadDatasetFilesResponse>(`/backend/import/upload-files/${fileType}`, formData);
    return response;
}

export type ISelectDatasetSheetsParams = {
    selectedSheets: ICreateFileDatasetsSelectedSheet[];
    merge: boolean;
    fileType: IUploadDatasetFileType;
};

export type ISelectDatasetSheetsResponse = {
    merge: boolean;
    dsInfos: Array<Omit<ICreateFileDatasetsDsInfo, 'parentDirId' | 'primaryKeyColumns'>>;
};

/**
 * 根据已上传文件中选中的 sheet，获取创建数据集所需的 dsInfo 预填信息。
 *
 * 调用关系：
 * 1. 当前方法依赖 `uploadDatasetFiles` 返回的 `tickets`，由调用方组装出 `selectedSheets`
 * 2. 当前方法返回的 `dsInfos` 可作为 `previewBatchFile` 的基础入参，也可在补齐 `parentDirId` 后作为 `importSelectedSheetsAsDatasets` 的基础入参
 * 3. 返回的 `merge` 为后端计算结果，后续创建数据集时通常应沿用该值或基于用户最终选择覆盖
 * 4. 编排方法 `createDatasetFromExcel` 与 `createDatasetFromCsv` 内部也会调用当前方法
 *
 * @param params 选中的 sheet 与文件类型信息
 * @returns 后端返回的 merge 结果和对应 dsInfo 列表
 */
export async function selectDatasetSheets(params: ISelectDatasetSheetsParams): Promise<ISelectDatasetSheetsResponse> {
    const response = await postJSON<ISelectDatasetSheetsResponse>('/api/import/selected-sheets', params);
    return response;
}

export type ICreateDatasetFromFileParams = {
    formData: FormData;
    parentDirId?: string;
    name?: string;
};

export type IImportSelectedSheetsAsDatasetsParams = {
    merge: boolean;
    selectedSheets: ICreateFileDatasetsSelectedSheet[];
    dsInfos: ICreateFileDatasetsDsInfo[];
    markAsSensitive: boolean;
};

export type IDatasetDirectoryContent = {
    dirId?: string;
    dirName: string;
    type?: string;
    dsId?: string;
    name?: string;
};

export type IListDatasetDirectoryContentsParams = {
    dirId?: string;
    folderOnly?: boolean;
};

export type IDatasetDirectoryContents = {
    dirId: string;
    dirName: string;
    contents?: IDatasetDirectoryContent[];
};

export type IPreviewBatchFileColumn = {
    name: string;
    fdType: BIFieldType;
    seqNo: number;
    baseFdType: BIFieldType;
};

export type IPreviewBatchFileResponse = {
    columns: IPreviewBatchFileColumn[];
    preview: string[][];
    fieldAndBusinessDefinitions: unknown[];
};

/**
 * 预览上传文件的数据内容，用于挑选主键、分隔符、字段类型等导入配置。
 *
 * 调用关系：
 * 1. 当前方法通常接在 `selectDatasetSheets` 之后，使用其返回的某个 `dsInfo` 作为基础参数
 * 2. 与 `selectDatasetSheets` 相比，当前方法额外要求传入 `parentDirId`
 * 3. 预览完成后，调用方应将用户确认后的字段配置写回 `dsInfos`，再调用 `importSelectedSheetsAsDatasets`
 * 4. 编排方法 `createDatasetFromExcel` 与 `createDatasetFromCsv` 不会自动调用当前方法，它们只负责上传、选 sheet、补目录并导入
 *
 * @param params 文件数据集信息
 * @returns 文件字段信息与预览数据
 */
export async function previewBatchFile(
    params: Omit<ICreateFileDatasetsDsInfo, 'primaryKeyColumns'>,
): Promise<IPreviewBatchFileResponse> {
    const response = await postJSON<IPreviewBatchFileResponse>('/api/import/preview-batch-files', params);
    return response;
}

/**
 * 查询数据集目录内容。
 *
 * 调用关系：
 * 1. 当 `dirId` 缺省时，查询数据集根目录下的一级子目录或数据集
 * 2. 当 `folderOnly` 为 `true` 时，只返回目录；为 `false` 时，返回目录和数据集
 * 3. 子目录或数据集信息位于返回值的 `contents` 字段中
 * 4. 文件导入场景下，当前方法也可用于补齐缺失的根目录 `parentDirId`
 *
 * @param params 目录查询参数。默认只查询根目录下的一级目录
 * @returns 当前目录信息及其一级子内容
 */
export async function listDatasetDirectoryContents(
    params: IListDatasetDirectoryContentsParams = { folderOnly: true },
): Promise<IDatasetDirectoryContents> {
    const response = await getJSON<IDatasetDirectoryContents>('/api/directory/DATA_SET', params);
    return response;
}

export type ICreateFileDatasetsResponseItem = {
    response: {
        taskId: string;
        status: string;
        result: string;
        dsId: string;
    };
};

/**
 * 将已选中的 sheet 作为数据集导入。
 *
 * 调用关系：
 * 1. `selectedSheets` 一般来自 `uploadDatasetFiles` 返回的 `tickets`
 * 2. `dsInfos` 一般来自 `selectDatasetSheets`，并在 `previewBatchFile` 预览后补齐或修正 `parentDirId`、`primaryKeyColumns` 等最终配置
 * 3. 当前方法是文件导入链路的最后一步，负责真正提交创建任务
 * 4. 编排方法 `createDatasetFromExcel` 与 `createDatasetFromCsv` 在准备好所有参数后，内部会调用当前方法
 *
 * 返回数组与入参 `dsInfos` 一一对应，每一项包含对应数据集创建任务的信息。
 * @param params 文件数据集创建参数
 * @returns 每个数据集的创建任务信息
 */
export async function importSelectedSheetsAsDatasets(
    params: IImportSelectedSheetsAsDatasetsParams,
): Promise<ICreateFileDatasetsResponseItem[]> {
    const response = await postJSON<ICreateFileDatasetsResponseItem[]>('/api/import/batch-import', params);
    return response;
}

async function resolveDatasetParentDirId(parentDirId?: string): Promise<string> {
    return parentDirId ?? (await listDatasetDirectoryContents()).dirId;
}

/**
 * 上传 Excel 文件、选择首个 sheet，并将其导入为数据集。
 *
 * 调用链路：
 * 1. 调用 `uploadDatasetFiles` 上传文件，并只读取返回 `tickets` 中的第一项
 * 2. 基于第一个 ticket，固定选择第一个 sheet：`sheetIds` 传 `[0]`，`sheets` 传 `ticket.sheets.elements[0].label`
 * 3. 只使用返回 `dsInfos` 中的第一项；若入参未提供 `parentDirId`，则调用 `listDatasetDirectoryContents` 补齐
 * 4. 若入参提供了 `name`，则用该值覆盖导入数据集的 `dsName`
 * 5. 将整理后的单个 `selectedSheet` 与单个 `dsInfo` 传给 `importSelectedSheetsAsDatasets`
 *
 * 注意：当前方法不会自动调用 `previewBatchFile`。如果导入前需要让用户确认主键、分隔符或字段类型，请改为按步骤分别调用。
 *
 * @param params 文件上传和导入参数
 * @returns 每个数据集的创建任务信息
 */
export async function createDatasetFromExcel(
    params: ICreateDatasetFromFileParams,
): Promise<ICreateFileDatasetsResponseItem[]> {
    const uploadResponse = await uploadDatasetFiles('excel', params.formData);
    const firstTicket = uploadResponse.tickets[0];
    if (!firstTicket) {
        throw new Error('上传结果中未返回可用的 ticket');
    }
    const firstSheetLabel = firstTicket.sheets?.elements?.[0]?.label;
    if (firstSheetLabel === undefined || firstSheetLabel === null) {
        throw new Error('上传结果中未返回可用的 sheet 信息');
    }

    const selectedSheet = {
        fileId: firstTicket.fileId,
        name: firstTicket.name,
        isFail: firstTicket.isFail,
        backendAddress: firstTicket.backendAddress,
        sheetIds: [0],
        sheets: [firstSheetLabel],
    } satisfies ICreateFileDatasetsSelectedSheet;

    const selectResponse = await selectDatasetSheets({
        selectedSheets: [selectedSheet],
        merge: false,
        fileType: 'excel',
    });
    const firstDsInfo = selectResponse.dsInfos[0];
    if (!firstDsInfo) {
        throw new Error('selected-sheets 接口未返回可用的 dsInfo');
    }

    const parentDirId = await resolveDatasetParentDirId(params.parentDirId);
    const dsInfo = {
        ...firstDsInfo,
        dsName: params.name ?? firstDsInfo.dsName,
        parentDirId,
    } satisfies ICreateFileDatasetsDsInfo;

    return importSelectedSheetsAsDatasets({
        merge: selectResponse.merge,
        selectedSheets: [selectedSheet],
        dsInfos: [dsInfo],
        markAsSensitive: false,
    });
}

/**
 * 上传 CSV 文件，并将其导入为数据集。
 *
 * 调用链路：
 * 1. 调用 `uploadDatasetFiles` 上传文件，并只读取返回 `tickets` 中的第一项
 * 2. 调用 `selectDatasetSheets` 时固定传入一个 `selectedSheet`，其中 `sheetIds` 和 `sheets` 都为 `[0]`
 * 3. 只使用返回 `dsInfos` 中的第一项；若入参未提供 `parentDirId`，则调用 `listDatasetDirectoryContents` 补齐
 * 4. 若入参提供了 `name`，则用该值覆盖导入数据集的 `dsName`
 * 5. 将整理后的单个 `selectedSheet` 与单个 `dsInfo` 传给 `importSelectedSheetsAsDatasets`
 *
 * @param params 文件上传和导入参数
 * @returns 每个数据集的创建任务信息
 */
export async function createDatasetFromCsv(
    params: ICreateDatasetFromFileParams,
): Promise<ICreateFileDatasetsResponseItem[]> {
    const uploadResponse = await uploadDatasetFiles('csv', params.formData);
    const firstTicket = uploadResponse.tickets[0];
    if (!firstTicket) {
        throw new Error('上传结果中未返回可用的 ticket');
    }

    const selectedSheet = {
        fileId: firstTicket.fileId,
        name: firstTicket.name,
        isFail: firstTicket.isFail,
        backendAddress: firstTicket.backendAddress,
        sheetIds: [0],
        sheets: [0],
    } satisfies ICreateFileDatasetsSelectedSheet;

    const selectResponse = await selectDatasetSheets({
        selectedSheets: [selectedSheet],
        merge: false,
        fileType: 'csv',
    });
    const firstDsInfo = selectResponse.dsInfos[0];
    if (!firstDsInfo) {
        throw new Error('selected-sheets 接口未返回可用的 dsInfo');
    }

    const parentDirId = await resolveDatasetParentDirId(params.parentDirId);
    const dsInfo = {
        ...firstDsInfo,
        dsName: params.name ?? firstDsInfo.dsName,
        parentDirId,
    } satisfies ICreateFileDatasetsDsInfo;

    return importSelectedSheetsAsDatasets({
        merge: selectResponse.merge,
        selectedSheets: [selectedSheet],
        dsInfos: [dsInfo],
        markAsSensitive: false,
    });
}
