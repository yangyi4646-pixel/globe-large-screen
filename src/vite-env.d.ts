/// <reference types="vite/client" />

declare global {
    const __DEV__: boolean;
    const __DEV_BI_HOST__: string;
}

export interface BIUniversalJsonResponse<T> {
    result: 'fail' | 'success' | 'ok';
    error?: {
        detail: { notifyType: number };
        message: string;
        status: number;
    };
    response?: T;
}

export enum BIFieldType {
    INT = 'INT',
    DOUBLE = 'DOUBLE',
    STRING = 'STRING',
    TIMESTAMP = 'TIMESTAMP',
    LONG = 'LONG',
    SHORT = 'SHORT',
    FLOAT = 'FLOAT',
    DATE = 'DATE',
    SUB_DATE = 'SUB_DATE',
    BOOL = 'BOOL',
    DECIMAL = 'DECIMAL',
}
export enum BIFilterType {
    BETWEEN = 'BT',
    CLOSE_BETWEEN_OPEN = 'CLOSE_BT_OPEN',
    OPEN_BETWEEN_CLOSE = 'OPEN_BT_CLOSE',
    OPEN_BETWEEN_OPEN = 'OPEN_BT_OPEN',
    GREATER_THAN = 'GT',
    GREATER_THAN_OR_EQUAL_TO = 'GE',
    LESS_THAN = 'LT',
    LESS_THAN_OR_EQUAL_TO = 'LE',
    EQUAL_TO = 'EQ',
    NOT_EQUAL_TO = 'NE',

    IN = 'IN',
    NOT_IN = 'NI',

    IS_NULL = 'IS_NULL',
    NOT_NULL = 'NOT_NULL',

    // 条件
    CONTAINS = 'CONTAINS',
    NOT_CONTAINS = 'NOT_CONTAINS',
    STARTSWITH = 'STARTSWITH',
    ENDSWITH = 'ENDSWITH',
    NOT_STARTSWITH = 'NOT_STARTSWITH',
    NOT_ENDSWITH = 'NOT_ENDSWITH',
    STARTSWITH_USER_PROPERTIES = 'STARTSWITH_USER_PROPERTIES',
    STARTSWITH_GLOBAL_PARAMS = 'STARTSWITH_GLOBAL_PARAMS',
}

export enum BIFilterLevel {
    DETAIL = 'DETAIL',
    AGGREGATION = 'AGGREGATION',
    RESULT = 'RESULT',
}

/**
 * 日期字段：subDate 的粒度
 */
export enum BIGranularity {
    NONE = 'NONE',
    // Time granularity
    YEAR = 'YEAR',
    YEARBYWEEK = 'YEARBYWEEK',
    QUARTER = 'QUARTER',
    MONTH = 'MONTH',
    WEEK = 'WEEK',
    DAYOFWEEK = 'DAYOFWEEK',
    DAY = 'DAY',
    HOUR = 'HOUR',
    MINUTE = 'MINUTE',
    SECOND = 'SECOND',
}

export type BIField = {
    fdId: string;
    name: string;
    fdType: BIFieldType;
    granularity?: BIGranularity;
};

export type BIFieldNumberFormat = {
    divideDataBy?: number;
    excelFormat?: string;
    prefixUnit?: string;
    specifier: string;
    suffix?: string;
    locale?: object;
    decimalPlaces?: number; // 精度
    isAuto?: boolean;
    suffixSizePercent?: number;
};

export enum BIDynamicParamType {
    TEXT = 'STRING',
    NUMBER = 'NUMBER',
    DATE = 'DATE',
}
