const proxyStateKey = Symbol('gd-dev-proxy-state');
const proxyHeadersToStrip = ['cookie'];
const rawBackendResponseHeader = 'raw-backend-response';
const rawBackendResponseValue = 'TRUE';
const defaultProxyConfig = {
    logger: console,
    rawBackendResponseHeader: '',
    rawBackendResponseValue,
    uidToken: '',
    uidTokenCookieName: '',
    uidTokenHeader: 'token',
};

function normalizeRoutePath(routePath) {
    return String(routePath)
        .trim()
        .replace(/^\/+|\/+$/g, '');
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPathSegments(pathname) {
    return String(pathname).split('/').filter(Boolean);
}

function findRouteStartIndex(pathSegments, routeSegments) {
    return pathSegments.findIndex((segment, index) => {
        if (segment !== routeSegments[0]) {
            return false;
        }

        return routeSegments.every((routeSegment, offset) => pathSegments[index + offset] === routeSegment);
    });
}

function getLoggerMethod(logger, level) {
    const candidate = logger?.[level];

    if (typeof candidate === 'function') {
        return candidate.bind(logger);
    }

    return console[level].bind(console);
}

function normalizeProxyConfig(config = {}) {
    return {
        ...defaultProxyConfig,
        ...config,
    };
}

function getRequestPath(req) {
    return typeof req?.url === 'string' && req.url ? req.url : '/';
}

function getRequestMethod(req) {
    return String(req?.method || 'GET').toUpperCase();
}

function normalizeJoinedPath(basePathname, requestPathname) {
    const normalizedBase = basePathname === '/' ? '' : basePathname.replace(/\/+$/, '');
    const normalizedPath = requestPathname.startsWith('/') ? requestPathname : `/${requestPathname}`;

    return `${normalizedBase}${normalizedPath}`.replace(/\/{2,}/g, '/');
}

function createRequestState(req, options) {
    const requestPath = getRequestPath(req);
    const rewrittenPath = typeof options.rewrite === 'function' ? options.rewrite(requestPath) : requestPath;

    return {
        method: getRequestMethod(req),
        startedAt: Date.now(),
        targetUrl: buildProxyTargetUrl(options.target, rewrittenPath),
    };
}

function getRequestState(req, options) {
    return req[proxyStateKey] || createRequestState(req, options);
}

export function rewritePrefixedProxyPath(routePath, requestPath) {
    const normalizedRoutePath = normalizeRoutePath(routePath);
    const parsedRequestUrl = new URL(requestPath || '/', 'http://proxy.local');
    const pathSegments = getPathSegments(parsedRequestUrl.pathname);
    const routeSegments = getPathSegments(normalizedRoutePath);
    const routeStartIndex = findRouteStartIndex(pathSegments, routeSegments);

    if (routeStartIndex === -1) {
        return requestPath;
    }

    parsedRequestUrl.pathname = `/${pathSegments.slice(routeStartIndex).join('/')}`;

    return `${parsedRequestUrl.pathname}${parsedRequestUrl.search}`;
}

export function buildProxyTargetUrl(target, requestPath) {
    const targetUrl = new URL(String(target));
    const parsedRequestUrl = new URL(requestPath || '/', 'http://proxy.local');

    targetUrl.pathname = normalizeJoinedPath(targetUrl.pathname, parsedRequestUrl.pathname);
    targetUrl.search = parsedRequestUrl.search;

    return targetUrl.toString();
}

export function formatProxyLogLine(method, targetUrl, statusCode, durationMs) {
    return `[dev-bi][proxy] ${method} ${targetUrl} ${statusCode} ${durationMs}ms`;
}

function stripProxyRequestHeaders(proxyReq, headerNames) {
    if (typeof proxyReq?.removeHeader !== 'function') {
        return;
    }

    for (const headerName of headerNames) {
        proxyReq.removeHeader(headerName);
    }
}

export function applyProxyRequestHeaders(proxyReq, config) {
    const tokenValue = String(config.uidToken || '').trim();
    const tokenCookieName = String(config.uidTokenCookieName || '').trim();
    const rawBackendResponseHeader = String(config.rawBackendResponseHeader || '').trim();

    stripProxyRequestHeaders(proxyReq, proxyHeadersToStrip);

    if (rawBackendResponseHeader) {
        proxyReq.setHeader(rawBackendResponseHeader, config.rawBackendResponseValue);
    }

    if (!tokenValue) {
        return;
    }

    if (proxyReq.getHeader(config.uidTokenHeader)) {
        if (!tokenCookieName) {
            return;
        }
    } else {
        proxyReq.setHeader(config.uidTokenHeader, tokenValue);
    }

    if (tokenCookieName) {
        proxyReq.setHeader('cookie', `${tokenCookieName}=${encodeURIComponent(tokenValue)}`);
    }
}

export function attachProxyLogging(proxy, options, config = {}) {
    const normalizedConfig = normalizeProxyConfig(config);
    const info = getLoggerMethod(normalizedConfig.logger, 'info');
    const error = getLoggerMethod(normalizedConfig.logger, 'error');

    proxy.on('proxyReq', (proxyReq, req) => {
        applyProxyRequestHeaders(proxyReq, normalizedConfig);
        req[proxyStateKey] = createRequestState(req, options);
    });

    proxy.on('proxyRes', (proxyRes, req) => {
        const requestState = getRequestState(req, options);
        const durationMs = Math.max(0, Date.now() - requestState.startedAt);

        info(
            formatProxyLogLine(
                requestState.method,
                requestState.targetUrl,
                proxyRes.statusCode ?? 'UNKNOWN',
                durationMs,
            ),
        );
        delete req[proxyStateKey];
    });

    proxy.on('error', (proxyError, req) => {
        const requestState = getRequestState(req, options);
        const durationMs = Math.max(0, Date.now() - requestState.startedAt);

        error(
            `${formatProxyLogLine(requestState.method, requestState.targetUrl, 'ERR', durationMs)} ${proxyError.message}`,
        );
        delete req[proxyStateKey];
    });
}

export function createPrefixedProxyRule(routePath, host, config = {}) {
    const normalizedRoutePath = normalizeRoutePath(routePath);
    const routePattern = `^/(?:[^/]+/)*${escapeRegex(normalizedRoutePath)}(?:/.*)?$`;

    return [
        routePattern,
        {
            target: host,
            changeOrigin: true,
            secure: true,
            rewrite(requestPath) {
                return rewritePrefixedProxyPath(normalizedRoutePath, requestPath);
            },
            configure(proxy, options) {
                attachProxyLogging(proxy, options, config);
            },
        },
    ];
}

export function createDevProxy(host, config = {}) {
    return Object.fromEntries([
        createPrefixedProxyRule('survey-engine', host, {
            ...config,
            rawBackendResponseHeader,
            rawBackendResponseValue,
            uidTokenCookieName: 'uIdToken',
        }),
        createPrefixedProxyRule('api', host, {
            ...config,
            rawBackendResponseHeader,
            rawBackendResponseValue,
        }),
        createPrefixedProxyRule('backend', host, {
            ...config,
            rawBackendResponseHeader,
            rawBackendResponseValue,
            uidTokenHeader: 'X-AUTH-TOKEN',
        }),
        createPrefixedProxyRule('static', host, config),
    ]);
}
