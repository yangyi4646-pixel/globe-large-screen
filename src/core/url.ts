function getRuntimeWindow(): Window | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    return window;
}

function getCurrentPathname(): string {
    return getRuntimeWindow()?.location.pathname ?? '';
}

function normalizePathPrefix(rawValue = ''): string {
    const trimmedValue = String(rawValue).trim();

    if (!trimmedValue) {
        return '';
    }

    const cleanedValue = trimmedValue.replace(/^\/+|\/+$/g, '');
    return cleanedValue ? `/${cleanedValue}` : '';
}

function normalizeUrlBase(rawValue = ''): string {
    return String(rawValue).trim().replace(/\/+$/, '');
}

function joinUrlPath(
    urlBase: string,
    targetPath = '',
    options: {
        emptyBasePrefix?: string;
    } = {},
): string {
    const normalizedUrlBase = normalizeUrlBase(urlBase);
    const trimmedTargetPath = String(targetPath).trim();
    const normalizedTargetPath = trimmedTargetPath.replace(/^\/+/, '');

    if (!normalizedTargetPath) {
        return normalizedUrlBase || options.emptyBasePrefix || '';
    }

    if (!normalizedUrlBase) {
        return `${options.emptyBasePrefix || ''}${normalizedTargetPath}`;
    }

    return `${normalizedUrlBase}/${normalizedTargetPath}`;
}

function isAbsoluteUrl(url = ''): boolean {
    return /^(?:[a-z]+:)?\/\//i.test(String(url).trim());
}

function shouldJoinBIResourceUrl(targetPath: string): boolean {
    return /^\/(?:api|static|survey-engine)(?:\/|$)/.test(targetPath);
}

function detectBIBaseRouteUrl(pathname = ''): string {
    const matched = String(pathname)
        .split('?')[0]
        .split('#')[0]
        .match(/^(.*)\/open-apps(?:\/|$)/);

    return normalizePathPrefix(matched?.[1] || '');
}

function detectAppBaseUrl(pathname = ''): string {
    const matched = String(pathname)
        .split('?')[0]
        .split('#')[0]
        .match(/^(.*\/open-apps\/[a-zA-Z0-9-]+)/);

    return normalizePathPrefix(matched?.[1] || '');
}

/**
 * baseUrl 使用说明：
 * - BIBaseRouteUrl 表示 BI 服务的基础路由。
 * - 开发模式下使用 `__DEV_BI_HOST__`，用于把 BI 页面路由直接拼到本地代理目标 Host 上。
 * - 生产模式下从当前 pathname 中提取 `/open-apps/` 之前的部分，例如
 *   `/bi-test/open-apps/demo/page` 会得到 `/bi-test`。
 */
export function getBIBaseRouteUrl(): string {
    if (__DEV__) {
        return normalizeUrlBase(__DEV_BI_HOST__);
    }

    return detectBIBaseRouteUrl(getCurrentPathname());
}

/**
 * baseUrl 使用说明：
 * - AppBaseUrl 表示当前开放应用自身的基础路径。
 * - 开发模式下应用运行在根路径，所以固定为空字符串。
 * - 生产模式下保留 `/open-apps/:appId` 在内的整段前缀，例如
 *   `/bi-test/open-apps/demo/page` 会得到 `/bi-test/open-apps/demo`。
 */
export function getAppBaseUrl(): string {
    if (__DEV__) {
        return '';
    }

    return detectAppBaseUrl(getCurrentPathname());
}

/**
 * URL 拼接说明：
 * - BIWebRouteUrl 用于拼接 BI Web 页面路由，例如 `/page/overview`。
 * - 这类地址始终使用 BIBaseRouteUrl 作为 baseUrl。
 * - 开发模式下需要拼出带 `__DEV_BI_HOST__` 的完整 URL，BI iframe 才能正确加载被内嵌的页面。
 * - 绝对 URL 原样返回；当 baseUrl 为空时，保持原始路由路径。
 */
export function getBIWebRouteUrl(nativeRouteUrl: string): string {
    const trimmedNativeRouteUrl = String(nativeRouteUrl).trim();

    if (!trimmedNativeRouteUrl) {
        return '';
    }

    if (isAbsoluteUrl(trimmedNativeRouteUrl)) {
        return trimmedNativeRouteUrl;
    }

    return joinUrlPath(getBIBaseRouteUrl(), trimmedNativeRouteUrl, {
        emptyBasePrefix: trimmedNativeRouteUrl.startsWith('/') ? '/' : '',
    });
}

/**
 * URL 拼接说明：
 * - BIResourceUrl 用于拼接 BI 资源地址，例如 `/api/*`、`/static/*`、`/survey-engine/*`。
 * - 开发模式下资源依赖本地 dev server 代理，因此 baseUrl 固定为空字符串。
 * - 生产模式下资源走 BI 服务前缀，因此使用 BIBaseRouteUrl 作为 baseUrl。
 * - 非 BI 资源路径以及绝对 URL 保持原样，避免误改应用内路由。
 */
export function getBIResourceUrl(targetPath = ''): string {
    const trimmedTargetPath = String(targetPath).trim();

    if (!trimmedTargetPath) {
        return '';
    }

    if (isAbsoluteUrl(trimmedTargetPath) || !shouldJoinBIResourceUrl(trimmedTargetPath)) {
        return trimmedTargetPath;
    }

    const baseUrl = __DEV__ ? '' : getBIBaseRouteUrl();

    return joinUrlPath(baseUrl, trimmedTargetPath, {
        emptyBasePrefix: trimmedTargetPath.startsWith('/') ? '/' : '',
    });
}

export type QueryParamValue = boolean | number | string | null | undefined;
export type QueryParams = Record<string, QueryParamValue | QueryParamValue[]>;

export function buildUrl(url: string, params?: QueryParams): string {
    if (!params) {
        return url;
    }

    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value == null) {
            continue;
        }

        const values = Array.isArray(value) ? value : [value];

        for (const item of values) {
            if (item != null) {
                searchParams.append(key, String(item));
            }
        }
    }

    const serialized = searchParams.toString();

    if (!serialized) {
        return url;
    }

    return `${url}${url.includes('?') ? '&' : '?'}${serialized}`;
}
