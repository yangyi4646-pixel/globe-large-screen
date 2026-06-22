import { getJSON, request, type RequestConfig } from '@/core/request';
import { buildUrl } from '@/core/url';

/**
 * LLM 服务调用封装。
 * - `listAvailableLLMServices` 用于查询当前环境可用的大模型服务配置列表。
 * - `fetchFromLLMChat` 适合需要自行处理原始响应的场景，例如自行读取 `json()` 或接管流式响应处理。
 * - `fetchFromLLMChatWithHandler` 适合直接通过回调消费结果的场景，可统一处理流式和非流式返回。
 */
export type ILLMChatParams = {
    llmConfigId: string;
    messages: unknown[];
    stream?: boolean;
} & Record<string, unknown>;

export type LLMRequestParams = Omit<RequestConfig, 'body' | 'data' | 'method' | 'url'> & {
    tag?: string;
};

export interface ILLMResponseChoice {
    delta?: {
        content?: string;
    };
    message?: {
        content?: string;
    };
}

export interface ILLMRawResponse {
    answer?: string;
    choices?: ILLMResponseChoice[];
    error?: string;
    [key: string]: unknown;
}

export interface ILLMChatResponseData {
    done: boolean;
    content: string;
    raw?: string;
    error?: string;
}

export interface ILLMServiceConfig {
    baseUrl: string;
    dify: boolean;
    domId: string;
    inputs?: Record<string, unknown> | null;
    llmConfigId: string;
    model: string;
    name: string;
    type: string;
}

interface StreamReadResult {
    content: string;
    done: boolean;
}

function extractLLMContent(rawResponse: ILLMRawResponse): string {
    const firstChoice = rawResponse.choices?.[0];
    const messageContent = firstChoice?.message?.content;

    if (typeof messageContent === 'string') {
        return messageContent;
    }

    return typeof rawResponse.answer === 'string' ? rawResponse.answer : '';
}

function appendStreamContent(
    fullContent: string,
    chunk: string,
    raw: string,
    onResponse?: (response: ILLMChatResponseData) => void,
): string {
    const nextContent = `${fullContent}${chunk}`;
    onResponse?.({ done: false, content: nextContent, raw });
    return nextContent;
}

function notifyStreamError(
    fullContent: string,
    raw: string,
    error: string,
    onResponse?: (response: ILLMChatResponseData) => void,
): void {
    onResponse?.({ done: false, content: fullContent, error, raw });
}

function parseLLMStreamPayload(
    data: string,
    fullContent: string,
    onResponse?: (response: ILLMChatResponseData) => void,
): string {
    const parsedData = JSON.parse(data) as ILLMRawResponse;

    if (typeof parsedData.error === 'string' && parsedData.error) {
        notifyStreamError(fullContent, data, parsedData.error, onResponse);
        return fullContent;
    }

    const deltaContent = parsedData.choices?.[0]?.delta?.content;
    if (typeof deltaContent === 'string' && deltaContent) {
        return appendStreamContent(fullContent, deltaContent, data, onResponse);
    }

    if (typeof parsedData.answer === 'string' && parsedData.answer) {
        return appendStreamContent(fullContent, parsedData.answer, data, onResponse);
    }

    return fullContent;
}

function handleLLMStreamLine(
    line: string,
    fullContent: string,
    onResponse?: (response: ILLMChatResponseData) => void,
): StreamReadResult {
    const normalizedLine = line.trim();

    if (!normalizedLine.startsWith('data:')) {
        return { content: fullContent, done: false };
    }

    const data = normalizedLine.slice(5).trim();

    if (data === '[DONE]') {
        onResponse?.({ done: true, content: fullContent, raw: data });
        return { content: fullContent, done: true };
    }

    if (data === 'event: ping') {
        onResponse?.({ done: false, content: fullContent, raw: data });
        return { content: fullContent, done: false };
    }

    try {
        return {
            content: parseLLMStreamPayload(data, fullContent, onResponse),
            done: false,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        notifyStreamError(fullContent, data, message, onResponse);
        console.error('解析 LLM 流式响应失败:', error);
        return { content: fullContent, done: false };
    }
}

function consumeBufferedLines(
    buffer: string,
    fullContent: string,
    onResponse?: (response: ILLMChatResponseData) => void,
): { buffer: string; content: string; done: boolean } {
    let nextBuffer = buffer;
    let nextContent = fullContent;
    let done = false;
    let lineEnd = nextBuffer.indexOf('\n');

    while (lineEnd !== -1) {
        const line = nextBuffer.slice(0, lineEnd).replace(/\r$/, '');
        nextBuffer = nextBuffer.slice(lineEnd + 1);
        const result = handleLLMStreamLine(line, nextContent, onResponse);
        nextContent = result.content;
        done = done || result.done;
        lineEnd = nextBuffer.indexOf('\n');
    }

    return { buffer: nextBuffer, content: nextContent, done };
}

async function readLLMStream(response: Response, onResponse?: (response: ILLMChatResponseData) => void): Promise<void> {
    if (!response.body) {
        throw new Error('LLM 流式响应缺少可读的 body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullContent = '';
    let hasCompleted = false;

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        const result = consumeBufferedLines(buffer, fullContent, onResponse);
        buffer = result.buffer;
        fullContent = result.content;
        hasCompleted = hasCompleted || result.done;
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
        const result = handleLLMStreamLine(buffer.replace(/\r$/, ''), fullContent, onResponse);
        fullContent = result.content;
        hasCompleted = hasCompleted || result.done;
    }

    if (!hasCompleted) {
        onResponse?.({ done: true, content: fullContent });
    }
}

async function handleNonStreamResponse(
    response: Response,
    onResponse?: (response: ILLMChatResponseData) => void,
): Promise<void> {
    const rawResponse = (await response.json()) as ILLMRawResponse;
    onResponse?.({
        done: true,
        content: extractLLMContent(rawResponse),
    });
}

/**
 * 查询当前可用的大模型服务配置列表。
 * @returns 可直接用于 `chatParams.llmConfigId` 的模型服务配置数组
 */
export async function listAvailableLLMServices(): Promise<ILLMServiceConfig[]> {
    return getJSON<ILLMServiceConfig[]>('/api/llm-config/list');
}

/**
 * 调用 LLM chat completions 接口。
 * @param chatParams 大模型请求参数，至少包含 `llmConfigId`、`messages`；如需流式响应可传 `stream: true`
 * @param requestParams 请求附加配置；可通过 `tag` 标识请求来源，也可补充额外 headers 或 signal
 * @returns 接口返回的原始 `Response`，调用方可自行读取 `json()` 或处理流式内容
 */
export async function fetchFromLLMChat(
    chatParams: ILLMChatParams,
    requestParams?: LLMRequestParams,
): Promise<Response> {
    const { tag, headers, ...others } = requestParams || {};
    const requestUrl = buildUrl('/api/llm/chat/completions', tag ? { tag } : undefined);

    try {
        const response = await request<Response>(requestUrl, {
            ...others,
            method: 'post',
            data: chatParams,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            responseType: 'response',
        });

        return response.data;
    } catch (error) {
        console.error('Error in LLM API call:', error);
        throw error;
    }
}

/**
 * 调用 LLM chat completions 接口，并通过回调消费返回内容。
 * @param chatParams 大模型请求参数；通过 `llmConfigId` 指定具体模型服务，当 `stream: true` 时会按增量多次触发回调，否则只在结束时触发一次
 * @param requestParams 请求附加配置；用法与 `fetchFromLLMChat` 保持一致
 * @param onResponse 响应处理回调；`done` 表示是否结束，`content` 为当前累计内容，`error` 为解析或接口错误信息
 * @returns 请求处理完成后返回 `Promise<void>`
 */
export async function fetchFromLLMChatWithHandler(
    chatParams: ILLMChatParams,
    requestParams?: LLMRequestParams,
    onResponse?: (response: ILLMChatResponseData) => void,
): Promise<void> {
    const response = await fetchFromLLMChat(chatParams, requestParams);

    if (chatParams.stream) {
        await readLLMStream(response, onResponse);
        return;
    }

    await handleNonStreamResponse(response, onResponse);
}
