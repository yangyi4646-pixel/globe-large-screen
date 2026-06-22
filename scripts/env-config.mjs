function normalizeUrlPath(pathname = '/') {
    if (!pathname || pathname === '/') {
        return '';
    }

    const trimmedPath = pathname.replace(/\/+$/, '');
    return trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
}

export function parseDevPort(rawValue) {
    const fallbackPort = 8000;

    if (!rawValue?.trim()) {
        return fallbackPort;
    }

    const parsedPort = Number.parseInt(rawValue, 10);

    if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
        throw new Error(`VITE_DEV_PORT 必须是正整数，当前值为 "${rawValue}"。`);
    }

    return parsedPort;
}

export function validateBiHost(rawValue) {
    const candidate = rawValue?.trim() || 'https://app.guandata.com';
    let parsedUrl;

    try {
        parsedUrl = new URL(candidate);
    } catch {
        throw new Error(`VITE_BI_HOST 不是合法 URL: "${candidate}"。`);
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('VITE_BI_HOST 仅支持 http 或 https 协议。');
    }

    if (parsedUrl.search || parsedUrl.hash) {
        throw new Error(`VITE_BI_HOST 不能包含 query 或 hash，当前值为 "${candidate}"。`);
    }

    return `${parsedUrl.origin}${normalizeUrlPath(parsedUrl.pathname)}`;
}

function normalizeOptionalValue(rawValue) {
    return String(rawValue ?? '').trim();
}

function normalizePasswordValue(rawValue) {
    return String(rawValue ?? '');
}

function resolveAuthErrorMessage(payload, fallbackMessage) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return fallbackMessage;
    }

    const candidates = [payload.message, payload.error, payload.msg];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }

        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
            const nestedMessage = [candidate.message, candidate.error, candidate.msg].find(
                (value) => typeof value === 'string' && value.trim(),
            );

            if (nestedMessage) {
                return nestedMessage.trim();
            }
        }
    }

    return fallbackMessage;
}

function buildAuthStatusResult(payload) {
    return {
        ok: payload.ok,
        httpStatus: payload.httpStatus ?? null,
        status: payload.status,
        message: payload.message || '',
        resolvedToken: payload.resolvedToken || '',
        shouldClearStoredToken: payload.shouldClearStoredToken === true,
        shouldPersistResolvedToken: payload.shouldPersistResolvedToken === true,
        attemptedPasswordLogin: payload.attemptedPasswordLogin === true,
    };
}

function logDirectBiRequest(method, targetUrl, statusCode, durationMs, errorMessage = '') {
    const line = `[dev-bi][direct] ${method} ${targetUrl} ${statusCode} ${durationMs}ms`;

    if (errorMessage) {
        console.error(`${line} ${errorMessage}`);
        return;
    }

    console.info(line);
}

async function fetchWithBiDirectLog(targetUrl, options = {}, fetchImpl = fetch) {
    const method = String(options.method || 'GET').toUpperCase();
    const startedAt = Date.now();

    try {
        const response = await fetchImpl(targetUrl, options);
        logDirectBiRequest(method, targetUrl, response.status ?? 'UNKNOWN', Math.max(0, Date.now() - startedAt));
        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logDirectBiRequest(method, targetUrl, 'ERR', Math.max(0, Date.now() - startedAt), message);
        throw error;
    }
}

export function normalizeBiAuthConfig(rawValues = {}) {
    return {
        uidToken: normalizeOptionalValue(rawValues.VITE_UID_TOKEN ?? rawValues.uidToken),
        loginDomain: normalizeOptionalValue(rawValues.VITE_BI_LOGIN_DOMAIN ?? rawValues.loginDomain) || 'guanbi',
        loginId: normalizeOptionalValue(rawValues.VITE_BI_LOGIN_ID ?? rawValues.loginId),
        loginPassword: normalizePasswordValue(rawValues.VITE_BI_LOGIN_PASSWORD ?? rawValues.loginPassword),
    };
}

export async function validateUidTokenStatus(token, biHost, fetchImpl = fetch) {
    const normalizedToken = normalizeOptionalValue(token);

    if (!normalizedToken) {
        return buildAuthStatusResult({
            ok: false,
            httpStatus: null,
            status: 'empty',
            message: '',
        });
    }

    const normalizedBiHost = validateBiHost(biHost);
    const validationUrl = new URL(`${normalizedBiHost}/api/validate-token`);
    const response = await fetchWithBiDirectLog(
        validationUrl.toString(),
        {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'raw-backend-response': 'TRUE',
                token: normalizedToken,
            },
        },
        fetchImpl,
    );

    if (response.status !== 200) {
        return buildAuthStatusResult({
            ok: false,
            httpStatus: response.status,
            status: 'invalid',
            message: `Token 无效（HTTP ${response.status}）`,
        });
    }

    return buildAuthStatusResult({
        ok: true,
        httpStatus: response.status,
        status: 'valid',
        message: 'Token 有效',
        resolvedToken: normalizedToken,
    });
}

export async function resolveUidTokenValidationHttpStatus(token, biHost, fetchImpl = fetch) {
    const normalizedToken = normalizeOptionalValue(token);
    const normalizedBiHost = normalizeOptionalValue(biHost);

    if (!normalizedToken || !normalizedBiHost) {
        return 500;
    }

    try {
        const validationResult = await validateUidTokenStatus(normalizedToken, normalizedBiHost, fetchImpl);
        return Number.parseInt(String(validationResult.httpStatus ?? ''), 10) || 500;
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('VITE_BI_HOST')) {
            return 400;
        }

        return 500;
    }
}

export async function resolveStoredUidTokenStatus(rawValues = {}, fetchImpl = fetch) {
    const authConfig = normalizeBiAuthConfig(rawValues);
    const biHost = rawValues.biHost ?? rawValues.VITE_BI_HOST ?? '';

    if (!authConfig.uidToken) {
        return buildAuthStatusResult({
            ok: false,
            httpStatus: null,
            status: 'empty',
            message: '',
        });
    }

    return validateUidTokenStatus(authConfig.uidToken, biHost, fetchImpl);
}

export async function requestUidTokenByPasswordLogin(authConfig, fetchImpl = fetch) {
    const normalizedBiHost = validateBiHost(authConfig?.biHost ?? authConfig?.VITE_BI_HOST ?? '');
    const { loginDomain, loginId, loginPassword } = normalizeBiAuthConfig(authConfig);

    if (!loginId || !loginPassword) {
        throw new Error('账号密码登录缺少 VITE_BI_LOGIN_ID 或 VITE_BI_LOGIN_PASSWORD。');
    }

    const signInUrl = `${normalizedBiHost}/api/user/sign-in`;
    const response = await fetchWithBiDirectLog(
        signInUrl,
        {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-Language': 'zh-CN',
                'Content-Type': 'application/json',
                'raw-backend-response': 'TRUE',
            },
            body: JSON.stringify({
                domain: loginDomain,
                loginId,
                password: Buffer.from(loginPassword, 'utf8').toString('base64'),
            }),
        },
        fetchImpl,
    );
    let payload;

    try {
        payload = await response.json();
    } catch {
        throw new Error(`登录接口未返回合法 JSON（HTTP ${response.status}）。`);
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error(`登录接口返回了非对象 JSON（HTTP ${response.status}）。`);
    }

    const errorMessage = resolveAuthErrorMessage(payload, '');

    if (!response.ok) {
        throw new Error(errorMessage || `登录失败: ${response.status}`);
    }

    const uidToken = normalizeOptionalValue(payload?.uIdToken);
    const result = normalizeOptionalValue(payload?.result).toLowerCase();

    if (result !== 'ok' || !uidToken) {
        throw new Error(errorMessage || '登录成功但未返回 uIdToken。');
    }

    return uidToken;
}

export async function resolveBiAuthStatus(rawValues = {}, fetchImpl = fetch) {
    const authConfig = normalizeBiAuthConfig(rawValues);
    const hasStoredToken = Boolean(authConfig.uidToken);
    let invalidTokenHttpStatus = null;

    if (hasStoredToken) {
        const tokenValidationResult = await resolveStoredUidTokenStatus(rawValues, fetchImpl);

        if (tokenValidationResult.ok) {
            return tokenValidationResult;
        }

        invalidTokenHttpStatus = tokenValidationResult.httpStatus;
    }

    const biHost = rawValues.biHost ?? rawValues.VITE_BI_HOST ?? '';

    const shouldClearStoredToken = hasStoredToken;
    const hasLoginId = Boolean(authConfig.loginId);
    const hasLoginPassword = Boolean(authConfig.loginPassword);

    if (!hasLoginId && !hasLoginPassword) {
        return buildAuthStatusResult({
            ok: false,
            httpStatus: invalidTokenHttpStatus,
            status: 'empty',
            message: hasStoredToken ? 'Token 无效，且未配置账号密码。' : '',
            shouldClearStoredToken,
        });
    }

    if (!hasLoginId || !hasLoginPassword) {
        return buildAuthStatusResult({
            ok: false,
            httpStatus: invalidTokenHttpStatus,
            status: 'incomplete',
            message: '请补全登录账号和密码。',
            shouldClearStoredToken,
        });
    }

    try {
        const uidToken = await requestUidTokenByPasswordLogin(
            {
                ...authConfig,
                biHost,
            },
            fetchImpl,
        );

        return buildAuthStatusResult({
            ok: true,
            httpStatus: 200,
            status: 'valid',
            message: '登录成功，已更新 UID Token。',
            resolvedToken: uidToken,
            shouldClearStoredToken,
            shouldPersistResolvedToken: true,
            attemptedPasswordLogin: true,
        });
    } catch (error) {
        return buildAuthStatusResult({
            ok: false,
            httpStatus: invalidTokenHttpStatus,
            status: 'invalid',
            message: error instanceof Error ? error.message : '登录失败',
            shouldClearStoredToken,
            attemptedPasswordLogin: true,
        });
    }
}

export async function resolveUidTokenFromEnv(rawValues = {}, fetchImpl = fetch) {
    const authStatus = await resolveBiAuthStatus(rawValues, fetchImpl);
    return authStatus.ok ? authStatus.resolvedToken : '';
}
