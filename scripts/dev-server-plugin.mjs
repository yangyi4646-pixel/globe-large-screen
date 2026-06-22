import { createWriteStream, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import yazl from 'yazl';
import {
    parseDevPort,
    requestUidTokenByPasswordLogin,
    resolveBiAuthStatus,
    resolveUidTokenValidationHttpStatus,
    validateBiHost,
} from './env-config.mjs';
import { ensureEnvFile, envPath, parseEnvFile, parseEnvTemplate, writeEnvFile } from './env-tools.mjs';

export { validateUidTokenStatus } from './env-config.mjs';

const previewContentTypes = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.ico', 'image/x-icon'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.map', 'application/json; charset=utf-8'],
    ['.mjs', 'text/javascript; charset=utf-8'],
    ['.png', 'image/png'],
    ['.svg', 'image/svg+xml'],
    ['.txt', 'text/plain; charset=utf-8'],
    ['.webp', 'image/webp'],
]);

function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            resolve(body);
        });

        req.on('error', reject);
    });
}

function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
}

function writeEnvFileAfterResponse(res, nextValues) {
    let hasPersisted = false;

    const persist = () => {
        if (hasPersisted) {
            return;
        }

        hasPersisted = true;
        writeEnvFile(nextValues);
    };

    res.once('finish', persist);
    res.once('close', persist);
}

export function parseVersion(version) {
    const matched = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

    if (!matched) {
        throw new Error('版本号必须是 x.y.z 格式。');
    }

    return matched.slice(1).map((segment) => Number(segment));
}

export function recommendNextVersion(version) {
    const [major, minor, patch] = parseVersion(version);
    return `${major}.${minor}.${patch + 1}`;
}

export function getProjectPaths(baseDir = process.cwd()) {
    return {
        baseDir,
        packageJsonFilePath: path.join(baseDir, 'package.json'),
        distDirPath: path.join(baseDir, 'dist'),
    };
}

export function readProjectPackageJson(baseDir = process.cwd()) {
    const { packageJsonFilePath } = getProjectPaths(baseDir);
    return JSON.parse(readFileSync(packageJsonFilePath, 'utf8'));
}

export function writeProjectVersion(version, baseDir = process.cwd()) {
    parseVersion(version);
    const { packageJsonFilePath } = getProjectPaths(baseDir);
    const packageJson = readProjectPackageJson(baseDir);
    packageJson.version = version;
    writeFileSync(packageJsonFilePath, `${JSON.stringify(packageJson, null, 4)}\n`, 'utf8');
    return packageJson;
}

export function getPublishZipFileName(version) {
    parseVersion(version);
    return `dist.${version}.zip`;
}

export function parsePublishZipFileName(fileName) {
    const matched = /^dist\.(\d+\.\d+\.\d+)\.zip$/.exec(fileName);

    if (!matched) {
        return null;
    }

    return {
        fileName,
        version: matched[1],
    };
}

export function listPublishArtifacts(baseDir = process.cwd()) {
    const { baseDir: resolvedBaseDir } = getProjectPaths(baseDir);

    return readdirSync(resolvedBaseDir)
        .map((fileName) => {
            const matchedArtifact = parsePublishZipFileName(fileName);

            if (!matchedArtifact) {
                return null;
            }

            const filePath = path.join(resolvedBaseDir, fileName);
            const fileStats = statSync(filePath);

            return {
                ...matchedArtifact,
                filePath,
                size: fileStats.size,
                updatedAt: fileStats.mtime.toISOString(),
            };
        })
        .filter(Boolean)
        .sort((left, right) => {
            const leftVersion = parseVersion(left.version);
            const rightVersion = parseVersion(right.version);

            for (let index = 0; index < leftVersion.length; index += 1) {
                const diff = rightVersion[index] - leftVersion[index];

                if (diff !== 0) {
                    return diff;
                }
            }

            return right.updatedAt.localeCompare(left.updatedAt);
        });
}

export function deletePublishArtifact(fileName, baseDir = process.cwd()) {
    const artifact = parsePublishZipFileName(fileName);

    if (!artifact) {
        throw new Error('无效的压缩包文件名。');
    }

    const filePath = path.join(getProjectPaths(baseDir).baseDir, artifact.fileName);
    rmSync(filePath);
}

export function getPublishArtifactFilePath(fileName, baseDir = process.cwd()) {
    const artifact = parsePublishZipFileName(fileName);

    if (!artifact) {
        throw new Error('无效的压缩包文件名。');
    }

    return path.join(getProjectPaths(baseDir).baseDir, artifact.fileName);
}

function formatCommand(command, args) {
    return [command, ...args].join(' ');
}

function resolveNpmExecPath() {
    const npmExecPath = String(process.env.npm_execpath || '').trim();

    if (!npmExecPath || !/\.[cm]?js$/i.test(npmExecPath)) {
        return '';
    }

    try {
        return statSync(npmExecPath).isFile() ? npmExecPath : '';
    } catch {
        return '';
    }
}

function resolveNpmBuildCommand() {
    const npmExecPath = resolveNpmExecPath();
    const packageManagerHint = `${process.env.npm_config_user_agent || ''} ${npmExecPath}`.toLowerCase();

    if (npmExecPath && packageManagerHint.includes('npm')) {
        return {
            command: process.execPath,
            args: [npmExecPath, 'run', 'build'],
            shell: false,
        };
    }

    if (process.platform === 'win32') {
        return {
            command: 'npm',
            args: ['run', 'build'],
            shell: true,
        };
    }

    return {
        command: 'npm',
        args: ['run', 'build'],
        shell: false,
    };
}

function runCommand(command, args, cwd, options = {}) {
    return new Promise((resolve, reject) => {
        const { shell = false } = options;
        const child = spawn(command, args, {
            cwd,
            env: process.env,
            shell,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        let hasSettled = false;

        const rejectOnce = (error) => {
            if (hasSettled) {
                return;
            }

            hasSettled = true;
            reject(error);
        };

        child.stdout.on('data', (chunk) => {
            stdout += String(chunk);
        });

        child.stderr.on('data', (chunk) => {
            stderr += String(chunk);
        });

        child.on('error', (error) => {
            rejectOnce(new Error(`命令启动失败：${formatCommand(command, args)}\n${error.message}`));
        });
        child.on('close', (code) => {
            if (hasSettled) {
                return;
            }

            hasSettled = true;

            if (code === 0) {
                resolve({ stdout, stderr });
                return;
            }

            reject(new Error((stderr || stdout || `${formatCommand(command, args)} 执行失败`).trim()));
        });
    });
}

function addDirectoryToZip(zipFile, directoryPath, archiveDirectoryPath) {
    const entries = readdirSync(directoryPath, { withFileTypes: true }).sort((left, right) =>
        left.name.localeCompare(right.name),
    );

    if (entries.length === 0) {
        zipFile.addEmptyDirectory(archiveDirectoryPath);
        return;
    }

    for (const entry of entries) {
        const entryPath = path.join(directoryPath, entry.name);
        const archivePath = `${archiveDirectoryPath}/${entry.name}`;

        if (entry.isDirectory()) {
            addDirectoryToZip(zipFile, entryPath, archivePath);
            continue;
        }

        if (entry.isFile()) {
            zipFile.addFile(entryPath, archivePath);
        }
    }
}

function writeZipFile(zipFile, outputFilePath) {
    return new Promise((resolve, reject) => {
        const outputStream = createWriteStream(outputFilePath);

        zipFile.outputStream.once('error', reject);
        outputStream.once('error', reject);
        outputStream.once('close', resolve);
        zipFile.outputStream.pipe(outputStream);
        zipFile.end();
    });
}

async function zipDistDirectory(version, baseDir = process.cwd()) {
    const { baseDir: resolvedBaseDir, distDirPath } = getProjectPaths(baseDir);
    const outputFileName = getPublishZipFileName(version);
    const outputFilePath = path.join(resolvedBaseDir, outputFileName);

    rmSync(outputFilePath, { force: true });
    const zipFile = new yazl.ZipFile();
    addDirectoryToZip(zipFile, distDirPath, 'dist');
    await writeZipFile(zipFile, outputFilePath);

    return {
        fileName: outputFileName,
        filePath: outputFilePath,
    };
}

export async function buildPublishArtifact(options = {}, baseDir = process.cwd()) {
    const { baseDir: resolvedBaseDir, distDirPath } = getProjectPaths(baseDir);
    const { updateVersion = false, version: requestedVersion } = options;
    const packageJson = updateVersion
        ? writeProjectVersion(String(requestedVersion || '').trim(), resolvedBaseDir)
        : readProjectPackageJson(resolvedBaseDir);
    const version = String(packageJson.version || '').trim();

    parseVersion(version);
    const npmBuildCommand = resolveNpmBuildCommand();

    await runCommand(npmBuildCommand.command, npmBuildCommand.args, resolvedBaseDir, {
        shell: npmBuildCommand.shell,
    });

    try {
        statSync(distDirPath);
    } catch {
        throw new Error('构建完成后未找到 dist 目录。');
    }

    const artifact = await zipDistDirectory(version, resolvedBaseDir);

    return {
        version: packageJson.version,
        artifact,
    };
}

function buildConfigPayload(packageJson, values = parseEnvFile()) {
    ensureEnvFile();
    const definitions = parseEnvTemplate();

    return {
        project: {
            name: packageJson.name,
            version: packageJson.version,
        },
        envPath,
        configItems: definitions.map((definition) => ({
            key: definition.key,
            description: definition.description,
            value: Object.prototype.hasOwnProperty.call(values, definition.key)
                ? values[definition.key]
                : definition.defaultValue,
        })),
    };
}

function buildRuntimePayload(packageJson) {
    ensureEnvFile();
    const values = parseEnvFile();

    return {
        version: packageJson.version,
        devPort: resolveNextDevPort({}, values),
        biHost: validateBiHost(values.VITE_BI_HOST ?? ''),
    };
}

export function resolveNextDevPort(nextValues = {}, currentValues = {}) {
    return String(parseDevPort(nextValues.VITE_DEV_PORT ?? currentValues.VITE_DEV_PORT ?? '8000'));
}

export async function validateBiAuthStatus(rawValues, fetchImpl = fetch) {
    const authResult = await resolveBiAuthStatus(rawValues, fetchImpl);

    return {
        ok: authResult.ok,
        httpStatus: authResult.httpStatus,
        status: authResult.status,
        message: authResult.message,
    };
}

function validateUpdatedValues(values) {
    parseDevPort(values.VITE_DEV_PORT ?? '');
    validateBiHost(values.VITE_BI_HOST ?? '');
}

function getFaviconPath() {
    return './src/assets/favicon.svg';
}

function formatFileSize(size) {
    if (size >= 1024 * 1024) {
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }

    if (size >= 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${size} B`;
}

function normalizeAppName(value) {
    return String(value).replace(/ /g, '').trim();
}

function readPublicSettings(baseDir = process.cwd()) {
    const settingsFilePath = path.join(baseDir, 'public', 'settings.json');

    try {
        return JSON.parse(readFileSync(settingsFilePath, 'utf8'));
    } catch {
        return null;
    }
}

function resolvePublishAppName(packageJson, baseDir = process.cwd()) {
    const settings = readPublicSettings(baseDir);
    const configuredName =
        typeof settings?.name === 'string' && settings.name.trim()
            ? settings.name.trim()
            : typeof settings?.title === 'string' && settings.title.trim()
              ? settings.title.trim()
              : '';

    return configuredName || normalizeAppName(packageJson.name ?? '');
}

export function buildPublishPayload(baseDir = process.cwd()) {
    const packageJson = readProjectPackageJson(baseDir);
    const envFilePath = path.join(baseDir, '.env');

    if (baseDir === process.cwd()) {
        ensureEnvFile();
    }

    const envValues = parseEnvFile(envFilePath);
    const appId = String(envValues.VITE_APP_ID ?? '').trim();
    const biHost = appId ? validateBiHost(envValues.VITE_BI_HOST ?? '') : '';

    return {
        currentVersion: packageJson.version,
        recommendedVersion: recommendNextVersion(packageJson.version),
        packageInfo: {
            name: resolvePublishAppName(packageJson, baseDir),
            description: String(packageJson.description ?? '').trim(),
            version: String(packageJson.version ?? '').trim(),
        },
        superApp: {
            appId,
            isBound: Boolean(appId),
            link: appId ? `${biHost}/open-apps/${appId}/` : '',
        },
        artifacts: listPublishArtifacts(baseDir).map((artifact) => ({
            fileName: artifact.fileName,
            version: artifact.version,
            size: artifact.size,
            sizeLabel: formatFileSize(artifact.size),
            updatedAt: artifact.updatedAt,
        })),
    };
}

function resolvePreviewContentType(filePath) {
    return previewContentTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
}

function isFilePathInsideDirectory(filePath, directoryPath) {
    const relativePath = path.relative(directoryPath, filePath);
    return relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && relativePath !== '';
}

export function buildOpenAppsPreviewNotBuiltHtml() {
    return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>应用预览 / 尚未构建</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        background: linear-gradient(180deg, #f7f3ea 0%, #efe7da 100%);
        color: #1d2f2d;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .panel {
        width: min(100%, 680px);
        padding: 32px;
        border-radius: 24px;
        background: rgba(255, 252, 247, 0.96);
        border: 1px solid rgba(29, 47, 45, 0.08);
        box-shadow: 0 20px 60px rgba(29, 47, 45, 0.12);
      }
      .eyebrow {
        margin: 0 0 10px;
        color: #1a827f;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: clamp(2rem, 5vw, 3rem);
        line-height: 1.02;
        letter-spacing: -0.04em;
      }
      p {
        margin: 14px 0 0;
        color: rgba(29, 47, 45, 0.74);
        font-size: 1rem;
        line-height: 1.6;
      }
      code {
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(26, 130, 127, 0.12);
        color: #146764;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main class="panel">
      <p class="eyebrow">应用预览</p>
      <h1>当前项目还没有构建产物</h1>
      <p>未找到 <code>dist</code> 目录或 <code>dist/index.html</code>，暂时无法托管预览页面。</p>
      <p>请先执行 <code>npm run build</code>，然后再访问 <code>/open-apps/preview</code>。</p>
    </main>
  </body>
</html>`;
}

export function resolveOpenAppsPreviewFile(pathname, baseDir = process.cwd()) {
    const previewBasePath = '/open-apps/preview';

    if (
        pathname !== previewBasePath &&
        pathname !== `${previewBasePath}/` &&
        !pathname.startsWith(`${previewBasePath}/`)
    ) {
        return null;
    }

    const { distDirPath } = getProjectPaths(baseDir);
    const fallbackFilePath = path.join(distDirPath, 'index.html');
    const rawRelativePath = pathname.startsWith(`${previewBasePath}/`)
        ? pathname.slice(`${previewBasePath}/`.length)
        : '';
    const relativePath = rawRelativePath ? decodeURIComponent(rawRelativePath) : '';

    try {
        if (!statSync(fallbackFilePath).isFile()) {
            throw new Error('dist/index.html is not a file');
        }
    } catch {
        return {
            body: buildOpenAppsPreviewNotBuiltHtml(),
            contentType: 'text/html; charset=utf-8',
        };
    }

    if (!relativePath) {
        return {
            filePath: fallbackFilePath,
            contentType: 'text/html; charset=utf-8',
        };
    }

    const candidateFilePath = path.resolve(distDirPath, relativePath);

    if (isFilePathInsideDirectory(candidateFilePath, distDirPath)) {
        try {
            if (statSync(candidateFilePath).isFile()) {
                return {
                    filePath: candidateFilePath,
                    contentType: resolvePreviewContentType(candidateFilePath),
                };
            }
        } catch {
            // Missing assets should fall back to the SPA entry.
        }
    }

    return {
        filePath: fallbackFilePath,
        contentType: 'text/html; charset=utf-8',
    };
}

export function getOpenAppsPreviewRedirectLocation(requestUrl) {
    if (requestUrl.pathname !== '/open-apps/preview') {
        return null;
    }

    return `${requestUrl.pathname}/${requestUrl.search}`;
}

export function buildDevPageHtml(packageJson, routeBase = '') {
    const projectName = escapeHtml(packageJson.name);
    const projectVersion = escapeHtml(packageJson.version || '');
    const faviconPath = escapeHtml(getFaviconPath());
    const normalizedBase = routeBase || '';
    const homeHref = normalizedBase ? `${normalizedBase}/` : '/';
    const configEndpoint = normalizedBase ? `${normalizedBase}/__dev/config` : '/__dev/config';
    const authConfigEndpoint = normalizedBase ? `${normalizedBase}/__dev/auth-config` : '/__dev/auth-config';
    const tokenValidationEndpoint = normalizedBase ? `${normalizedBase}/__dev/token-status` : '/__dev/token-status';

    return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="${faviconPath}" />
    <title>DEV配置</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        color: #20262e;
        --ink: #20262e;
        --ink-strong: #101828;
        --ink-soft: #808ca5;
        --line: rgba(186, 206, 236, 0.38);
        --accent: #0d9488;
        --accent-strong: #188d83;
        --paper: rgba(255, 255, 255, 0.84);
        --paper-strong: rgba(255, 255, 255, 0.96);
        --panel-ink: #20262e;
        --panel-soft: #808ca5;
        --shadow: 0 24px 56px rgba(125, 156, 210, 0.16);
      }

      * { box-sizing: border-box; }
      html, body { min-height: 100%; margin: 0; }
      body {
        padding: 28px 22px 40px;
        background: #f1f7ff;
      }
      a { color: inherit; }
      code, input, textarea, button { font: inherit; }
      .shell { max-width: 1180px; margin: 0 auto; display: grid; gap: 18px; }
      .hero, .panel, .config-card {
        border: 1px solid rgba(255, 255, 255, 0.9);
        border-radius: 30px;
        background: var(--paper);
        box-shadow: var(--shadow);
        backdrop-filter: blur(16px);
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
        gap: 18px;
        padding: 26px 28px;
        overflow: hidden;
      }
      .eyebrow {
        margin: 0 0 10px;
        color: var(--accent);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: clamp(1.85rem, 3.2vw, 3rem);
        line-height: 1;
        letter-spacing: -0.045em;
        font-weight: 750;
        color: var(--ink-strong);
        overflow-wrap: anywhere;
      }
      .hero p, .config-card p, .muted {
        color: var(--ink-soft);
      }
      .hero-copy {
        max-width: none;
        min-width: 0;
        padding-right: 28px;
      }
      .hero-summary {
        max-width: 34rem;
        margin: 14px 0 0;
        font-size: 0.95rem;
        line-height: 1.7;
      }
      .hero-actions {
        display: flex;
        gap: 12px;
        margin-top: 28px;
        flex-wrap: wrap;
      }
      .pill, button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 20px;
        border-radius: 12px;
        border: 1px solid rgba(186, 206, 236, 0.5);
        background: rgba(255, 255, 255, 0.92);
        color: var(--ink-soft);
        font-weight: 700;
        cursor: pointer;
      }
      .pill.primary, button.primary {
        border-color: transparent;
        color: #f5fbfa;
        background: linear-gradient(180deg, #28b8ac 0%, var(--accent) 100%);
      }
      .panel {
        padding: 24px 26px;
      }
      .info-panel {
        padding: 22px 24px;
        background: rgba(255, 255, 255, 0.9);
        color: var(--panel-ink);
      }
      .action-panel {
        min-height: 60px;
        height: 76px;
        padding: 0 26px;
        background: rgba(255, 255, 255, 0.82);
      }
      .panel h2 {
        margin: 0 0 16px;
        font-size: 0.98rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .info-panel h2,
      .action-panel h2 {
        color: inherit;
      }
      .info-panel dl {
        margin: 0;
        display: grid;
        gap: 14px;
      }
      .info-panel dt {
        margin-bottom: 4px;
        color: var(--panel-soft);
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .info-panel dd {
        margin: 0;
        word-break: break-word;
        line-height: 1.55;
        font-weight: 700;
      }
      .action-panel .muted {
        margin: 2px 0 0;
        font-size: 0.82rem;
      }
      .action-panel .toolbar h2 {
        margin-bottom: 0;
        font-size: 0.9rem;
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 100%;
        gap: 12px;
      }
      .toolbar-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 14px;
        min-width: 0;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
      .config-card {
        padding: 24px;
        background: rgba(255, 255, 255, 0.9);
      }
      .main-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 18px;
      }
      .config-card header {
        margin-bottom: 14px;
      }
      .config-card h3 {
        margin: 0 0 8px;
        font-size: 1.08rem;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }
      .config-card p {
        margin: 0;
        white-space: pre-line;
        line-height: 1.68;
      }
      .config-card label {
        display: block;
        margin-top: 16px;
        font-size: 0.84rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .config-card input:not([type="checkbox"]) {
        width: 100%;
        margin-top: 8px;
        min-height: 46px;
        padding: 10px 14px;
        border-radius: 16px;
        border: 1px solid rgba(186, 206, 236, 0.56);
        background: var(--paper-strong);
        color: var(--ink);
      }
      .config-card input:not([type="checkbox"]):focus {
        outline: 2px solid rgba(26, 130, 127, 0.18);
        border-color: rgba(26, 130, 127, 0.36);
      }
      .auth-card {
        position: relative;
        display: grid;
        gap: 18px;
      }
      .auth-card header {
        margin-bottom: 8px;
      }
      .auth-config-menu {
        position: absolute;
        top: 22px;
        right: 22px;
        z-index: 3;
      }
      .auth-config-trigger {
        display: inline-flex;
        align-items: center;
        margin: 0;
        min-height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid rgba(186, 206, 236, 0.56);
        background: rgba(255, 255, 255, 0.94);
        color: var(--accent-strong);
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
      }
      .auth-config-popover {
        position: absolute;
        right: 0;
        bottom: calc(100% + 12px);
        transform-origin: top right;
        display: grid;
        gap: 12px;
        justify-items: stretch;
        min-width: 320px;
        right: 0;
        z-index: 4;
        width: min(360px, calc(100vw - 80px));
        padding: 18px;
        border: 1px solid rgba(186, 206, 236, 0.56);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 18px 46px rgba(125, 156, 210, 0.18);
      }
      .auth-config-popover[hidden] {
        display: none;
      }
      .auth-config-popover-grid {
        display: grid;
        gap: 12px;
      }
      .auth-config-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .auth-config-status {
        min-height: 20px;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--accent-strong);
      }
      .auth-config-status.error {
        color: #b4492b;
      }
      .auth-fields {
        display: grid;
        gap: 16px;
      }
      .auth-token-row {
        display: grid;
        gap: 8px;
      }
      .field-block {
        min-width: 0;
      }
      .field-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .field-block.compact label,
      .field-block.compact .field-hint {
        display: none;
      }
      .field-block label {
        margin-top: 0;
      }
      .field-hint {
        margin-top: 8px;
        font-size: 0.8rem;
        line-height: 1.5;
        color: var(--ink-soft);
      }
      .input-shell {
        position: relative;
      }
      .field-status {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        font-size: 13px;
        font-weight: 700;
        line-height: 1;
        color: var(--ink-soft);
        white-space: nowrap;
      }
      .field-status[data-state="checking"] {
        color: var(--accent);
      }
      .field-status[data-state="valid"] {
        color: var(--accent-strong);
      }
      .field-status[data-state="invalid"] {
        color: #b4492b;
      }
      .status {
        min-height: 24px;
        margin: 0;
        color: var(--accent);
        font-weight: 600;
        text-align: right;
      }
      .status.error {
        color: #b4492b;
      }
      .toast-stack {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 20;
        display: grid;
        gap: 10px;
      }
      .toast {
        min-width: 260px;
        max-width: min(420px, calc(100vw - 40px));
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(24, 54, 88, 0.94);
        color: #fff;
        box-shadow: 0 16px 36px rgba(76, 113, 161, 0.22);
      }
      .toast.error {
        background: rgba(180, 73, 43, 0.96);
      }
      @media (max-width: 960px) {
        .hero, .grid { grid-template-columns: 1fr; }
        .hero {
          max-height: none;
        }
      }
      @media (max-width: 640px) {
        body { padding: 16px; }
        .hero, .panel, .config-card { border-radius: 22px; }
        .action-panel {
          height: auto;
          min-height: 60px;
          padding: 12px 18px;
        }
        .toolbar {
          height: auto;
          flex-wrap: wrap;
        }
        .toolbar-actions {
          width: 100%;
          justify-content: space-between;
        }
        .auth-config-popover {
          left: auto;
          right: 0;
          bottom: calc(100% + 10px);
          width: min(320px, calc(100vw - 32px));
        }
      }
    </style>
  </head>
  <body>
    <div id="toastStack" class="toast-stack" aria-live="polite" aria-atomic="true"></div>
    <main class="shell">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">开发配置</p>
          <h1>${projectName}</h1>
          <p class="hero-summary">这个页面只由 Vite dev server 托管，用来查看和修改当前项目的 .env 配置。保存后会写回 .env，并自动让开发配置重新生效。</p>
          <div class="hero-actions">
            <a class="pill primary" href="${homeHref}">返回首页</a>
            <button id="reloadButton" type="button">重新读取配置</button>
          </div>
        </div>
        <aside class="panel info-panel">
          <h2>项目信息</h2>
          <dl>
            <div>
              <dt>项目名称</dt>
              <dd id="projectName">${projectName}</dd>
            </div>
            <div>
              <dt>当前版本</dt>
              <dd id="projectVersion">${projectVersion}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section class="panel action-panel">
        <div class="toolbar">
          <div>
            <h2>环境配置</h2>
            <p class="muted">展示项来自 .env.template，当前值来自 .env。</p>
          </div>
          <div class="toolbar-actions">
            <p id="status" class="status"></p>
            <button id="saveButton" class="primary" type="button">保存并立即生效</button>
          </div>
        </div>
      </section>

      <section class="main-grid">
        <section id="configGrid" class="grid"></section>
      </section>
    </main>

    <script>
      const configGrid = document.getElementById('configGrid');
      const statusEl = document.getElementById('status');
      const reloadButton = document.getElementById('reloadButton');
      const saveButton = document.getElementById('saveButton');
      const toastStack = document.getElementById('toastStack');
      const AUTH_CONFIG_KEYS = new Set([
        'VITE_UID_TOKEN',
        'VITE_BI_LOGIN_DOMAIN',
        'VITE_BI_LOGIN_ID',
        'VITE_BI_LOGIN_PASSWORD'
      ]);
      let authValidationTimer = null;
      let lastValidatedAuthSignature = '';

      function setStatus(message, isError = false) {
        statusEl.textContent = message;
        statusEl.classList.toggle('error', isError);
      }

      function showToast(message, isError = false) {
        if (!toastStack || !message) {
          return;
        }

        const toast = document.createElement('div');
        toast.className = \`toast\${isError ? ' error' : ''}\`;
        toast.textContent = message;
        toastStack.appendChild(toast);

        window.setTimeout(() => {
          toast.remove();
        }, 3200);
      }

      function escapeHtmlText(value) {
        return String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      function isAuthConfigKey(key) {
        return AUTH_CONFIG_KEYS.has(key);
      }

      function getConfigInput(key) {
        return configGrid.querySelector(\`input[data-key="\${key}"]\`);
      }

      function getAuthConfigPopover() {
        return document.getElementById('authConfigPopover');
      }

      function getAuthConfigStatus() {
        return document.getElementById('authConfigStatus');
      }

      function setAuthConfigStatus(message = '', isError = false) {
        const authConfigStatus = getAuthConfigStatus();

        if (!authConfigStatus) {
          return;
        }

        authConfigStatus.textContent = message;
        authConfigStatus.classList.toggle('error', isError);
      }

      function openAuthConfigPopover() {
        const authConfigPopover = getAuthConfigPopover();

        if (!authConfigPopover) {
          return;
        }

        authConfigPopover.hidden = false;
      }

      function closeAuthConfigPopover() {
        const authConfigPopover = getAuthConfigPopover();

        if (!authConfigPopover) {
          return;
        }

        authConfigPopover.hidden = true;
      }

      function setTokenStatus(state, message = '') {
        const tokenStatusEl = document.getElementById('tokenStatus');

        if (!tokenStatusEl) {
          return;
        }

        tokenStatusEl.dataset.state = state || 'idle';
        tokenStatusEl.textContent = message;
      }

      function formatInvalidTokenStatus(httpStatus) {
        const normalizedStatus = Number.parseInt(String(httpStatus || ''), 10);

        return Number.isFinite(normalizedStatus) ? \`x \${normalizedStatus}\` : 'x';
      }

      function getAuthValidationPayload() {
        const tokenInput = getConfigInput('VITE_UID_TOKEN');
        const biHostInput = getConfigInput('VITE_BI_HOST');

        if (!tokenInput || !biHostInput) {
          return null;
        }

        return {
          tokenInput,
          biHostInput,
          payload: {
            token: tokenInput.value.trim(),
            biHost: biHostInput.value.trim(),
          }
        };
      }

      function getAuthConfigPayload() {
        const biHostInput = getConfigInput('VITE_BI_HOST');
        const loginDomainInput = getConfigInput('VITE_BI_LOGIN_DOMAIN');
        const loginIdInput = getConfigInput('VITE_BI_LOGIN_ID');
        const loginPasswordInput = getConfigInput('VITE_BI_LOGIN_PASSWORD');

        if (!biHostInput || !loginDomainInput || !loginIdInput || !loginPasswordInput) {
          return null;
        }

        return {
          biHostInput,
          loginDomainInput,
          loginIdInput,
          loginPasswordInput,
          payload: {
            biHost: biHostInput.value.trim(),
            loginDomain: loginDomainInput.value.trim(),
            loginId: loginIdInput.value.trim(),
            loginPassword: loginPasswordInput.value,
          }
        };
      }

      function buildAuthValidationSignature(payload) {
        return JSON.stringify(payload);
      }

      function isAuthValidationSnapshotStale(snapshot, currentState) {
        return currentState === null || buildAuthValidationSignature(currentState.payload) !== snapshot.signature;
      }

      async function validateAuthConfig(force = false) {
        const authState = getAuthValidationPayload();

        if (!authState) {
          return;
        }

        const { payload } = authState;
        const { token, biHost } = payload;
        const signature = buildAuthValidationSignature(payload);

        if (!token || !biHost) {
          lastValidatedAuthSignature = signature;
          setTokenStatus('invalid', formatInvalidTokenStatus(500));
          return;
        }

        if (!force && signature === lastValidatedAuthSignature) {
          return;
        }

        lastValidatedAuthSignature = signature;
        setTokenStatus('checking', '⏳');

        try {
          const response = await fetch('${tokenValidationEndpoint}', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (isAuthValidationSnapshotStale({ signature }, getAuthValidationPayload())) {
            return;
          }

          if (response.status === 200) {
            setTokenStatus('valid', '✅ 有效');
            return;
          }

          setTokenStatus('invalid', formatInvalidTokenStatus(response.status));
        } catch (error) {
          if (isAuthValidationSnapshotStale({ signature }, getAuthValidationPayload())) {
            return;
          }

          setTokenStatus('invalid', formatInvalidTokenStatus(500));
        }
      }

      function scheduleAuthValidation(force = false) {
        if (authValidationTimer) {
          window.clearTimeout(authValidationTimer);
        }

        authValidationTimer = window.setTimeout(() => {
          validateAuthConfig(force).catch((error) => {
            setTokenStatus('invalid', \`❌ \${error.message || '鉴权校验失败'}\`);
          });
        }, force ? 0 : 260);
      }

      function bindAuthValidationEvents() {
        const authConfigTrigger = document.getElementById('authConfigTrigger');
        const authConfigCancelButton = document.getElementById('authConfigCancelButton');
        const authConfigConfirmButton = document.getElementById('authConfigConfirmButton');
        const authConfigPopover = getAuthConfigPopover();
        const tokenInput = getConfigInput('VITE_UID_TOKEN');
        const biHostInput = getConfigInput('VITE_BI_HOST');

        if (authConfigTrigger) {
          authConfigTrigger.addEventListener('click', () => {
            if (getAuthConfigPopover()?.hidden === false) {
              closeAuthConfigPopover();
              return;
            }

            openAuthConfigPopover();
          });
        }

        if (authConfigConfirmButton) {
        authConfigConfirmButton.addEventListener('click', () => {
          syncAuthConfig().catch((error) => {
            setAuthConfigStatus(error.message || '账密同步失败', true);
          });
          });
        }

        if (authConfigCancelButton) {
          authConfigCancelButton.addEventListener('click', () => {
            setAuthConfigStatus('');
            closeAuthConfigPopover();
          });
        }

        if (authConfigPopover) {
          authConfigPopover.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
              closeAuthConfigPopover();
            }
          });
        }

        if (tokenInput) {
          tokenInput.addEventListener('input', () => {
            scheduleAuthValidation();
          });
        }

        if (biHostInput) {
          biHostInput.addEventListener('input', () => {
            scheduleAuthValidation();
          });
        }
      }

      async function syncAuthConfig() {
        const authState = getAuthConfigPayload();

        if (!authState) {
          return;
        }

        const { payload } = authState;

        if (!payload.loginDomain || !payload.loginId || !payload.loginPassword) {
          setAuthConfigStatus('请补全账密信息。', true);
          return;
        }

        setAuthConfigStatus('正在获取 Token...');
        setTokenStatus('checking', '⏳');

        const response = await fetch('${authConfigEndpoint}', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const responsePayload = await response.json();

        if (!response.ok) {
          setAuthConfigStatus(responsePayload.error || '账密同步失败', true);

          if (responsePayload.shouldAlert && responsePayload.error) {
            showToast(responsePayload.error, true);
          }

          return;
        }

        const tokenInput = getConfigInput('VITE_UID_TOKEN');

        if (tokenInput && responsePayload.uidToken) {
          tokenInput.value = responsePayload.uidToken;
          lastValidatedAuthSignature = '';
          scheduleAuthValidation(true);
        }

        setAuthConfigStatus(responsePayload.message || '');
        closeAuthConfigPopover();
      }

      function buildConfigCardMarkup(item) {
        return \`
          <article class="config-card">
            <header>
              <p class="eyebrow">\${escapeHtmlText(item.key)}</p>
              <h3>\${escapeHtmlText(item.key)}</h3>
              <p>\${escapeHtmlText(item.description || '未提供说明')}</p>
            </header>
            <label for="field-\${escapeHtmlText(item.key)}">当前值</label>
            <div class="input-shell">
              <input
                id="field-\${escapeHtmlText(item.key)}"
                type="\${/(?:TOKEN|PASSWORD)$/.test(item.key) ? 'password' : 'text'}"
                data-key="\${escapeHtmlText(item.key)}"
                value="\${escapeHtmlText(item.value)}"
              />
            </div>
          </article>
        \`;
      }

      function buildAuthFieldMarkup(item, label, options = {}) {
        if (!item) {
          return '';
        }

        const {
          layoutClass = '',
          placeholder = '',
          extraMarkup = '',
          showHint = true,
          inputType,
          headerExtraMarkup = '',
        } = options;

        return \`
          <div class="field-block \${layoutClass}">
            <div class="field-header">
              <label for="field-\${escapeHtmlText(item.key)}">\${escapeHtmlText(label)}</label>
              \${headerExtraMarkup}
            </div>
            <div class="input-shell">
              <input
                id="field-\${escapeHtmlText(item.key)}"
                type="\${escapeHtmlText(inputType || (/(?:TOKEN|PASSWORD)$/.test(item.key) ? 'password' : 'text'))}"
                data-key="\${escapeHtmlText(item.key)}"
                value="\${escapeHtmlText(item.value)}"
                placeholder="\${escapeHtmlText(placeholder || label)}"
              />
              \${extraMarkup}
            </div>
            \${showHint ? \`<p class="field-hint">\${escapeHtmlText(item.description || '未提供说明')}</p>\` : ''}
          </div>
        \`;
      }

      function buildAuthConfigCardMarkup(items) {
        const itemMap = new Map(items.map((item) => [item.key, item]));

        return \`
          <article class="config-card auth-card" data-auth-card="bi-auth">
            <div class="auth-config-menu">
              <button id="authConfigTrigger" class="auth-config-trigger" type="button">配置账密</button>
              <section id="authConfigPopover" class="auth-config-popover" hidden>
                <div class="auth-config-popover-grid">
                  \${buildAuthFieldMarkup(itemMap.get('VITE_BI_LOGIN_DOMAIN'), '登录域', { layoutClass: 'compact', placeholder: '请输入登录域' })}
                  \${buildAuthFieldMarkup(itemMap.get('VITE_BI_LOGIN_ID'), '登录账号', { layoutClass: 'compact', placeholder: '请输入登录账号' })}
                  \${buildAuthFieldMarkup(itemMap.get('VITE_BI_LOGIN_PASSWORD'), '登录密码', { layoutClass: 'compact', placeholder: '请输入登录密码' })}
                </div>
                <p id="authConfigStatus" class="auth-config-status"></p>
                <div class="auth-config-actions">
                  <button id="authConfigCancelButton" class="auth-config-trigger" type="button">取消</button>
                  <button id="authConfigConfirmButton" class="auth-config-trigger" type="button">确认</button>
                </div>
              </section>
            </div>
            <header>
              <p class="eyebrow">BI Auth</p>
              <h3>鉴权配置</h3>
            </header>
            <section class="auth-fields">
              <div class="auth-token-row">
                \${buildAuthFieldMarkup(
                  itemMap.get('VITE_UID_TOKEN'),
                  'UID Token',
                  {
                    placeholder: '请输入 UID Token',
                    showHint: false,
                    inputType: 'text',
                    headerExtraMarkup: '<span id="tokenStatus" class="field-status" data-state="idle" aria-live="polite"></span>',
                  },
                )}
              </div>
            </section>
          </article>
        \`;
      }

      function renderConfigItems(items) {
        const authItems = items.filter((item) => isAuthConfigKey(item.key));
        let hasRenderedAuthCard = false;

        configGrid.innerHTML = items.map((item) => {
          if (!isAuthConfigKey(item.key)) {
            return buildConfigCardMarkup(item);
          }

          if (hasRenderedAuthCard) {
            return '';
          }

          hasRenderedAuthCard = true;
          return buildAuthConfigCardMarkup(authItems);
        }).join('');

        bindAuthValidationEvents();
        setAuthConfigStatus('');
      }

      async function loadConfig() {
        setStatus('正在读取 .env 配置...');
        const response = await fetch('${configEndpoint}');
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || '读取配置失败');
        }

        document.getElementById('projectName').textContent = payload.project.name;
        document.getElementById('projectVersion').textContent = payload.project.version;
        renderConfigItems(payload.configItems);
        scheduleAuthValidation(true);
        if (payload.shouldAlert && payload.error) {
          showToast(payload.error, true);
        }
        setStatus('配置已同步到页面。');
      }

      async function saveConfig() {
        const values = {};

        for (const input of configGrid.querySelectorAll('input[data-key]')) {
          values[input.dataset.key] = input.value;
        }

        setStatus('正在保存 .env，并重载 dev server 配置...');

        const response = await fetch('${configEndpoint}', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        });
        const payload = await response.json();

        if (!response.ok) {
          if (payload.shouldAlert && payload.error) {
            showToast(payload.error, true);
          }
          throw new Error(payload.error || '保存失败');
        }

        setStatus(payload.message || '配置已保存，正在刷新页面...');

        window.setTimeout(() => {
          window.location.reload();
        }, 900);
      }

      reloadButton.addEventListener('click', () => {
        loadConfig().catch((error) => {
          setStatus(error.message, true);
        });
      });

      saveButton.addEventListener('click', () => {
        saveConfig().catch((error) => {
          setStatus(error.message, true);
        });
      });

      loadConfig().catch((error) => {
        setStatus(error.message, true);
      });
    </script>
  </body>
</html>`;
}

export function buildPublishPageHtml(routeBase = '') {
    const normalizedBase = routeBase || '';
    const homeHref = normalizedBase ? `${normalizedBase}/` : '/';
    const devHref = normalizedBase ? `${normalizedBase}/dev` : '/dev';
    const previewHref = normalizedBase ? `${normalizedBase}/open-apps/preview/` : '/open-apps/preview/';
    const publishEndpoint = normalizedBase ? `${normalizedBase}/__dev/publish` : '/__dev/publish';
    const faviconPath = escapeHtml(getFaviconPath());

    return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="${faviconPath}" />
    <title>打包发布</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        color: #20262e;
        --ink: #20262e;
        --ink-strong: #101828;
        --ink-soft: #808ca5;
        --line: rgba(186, 206, 236, 0.38);
        --accent: #0d9488;
        --accent-strong: #188d83;
        --danger: #b4492b;
        --paper: rgba(255, 255, 255, 0.84);
        --paper-strong: rgba(255, 255, 255, 0.96);
        --shadow: 0 24px 56px rgba(125, 156, 210, 0.16);
      }
      * { box-sizing: border-box; }
      html, body { min-height: 100%; margin: 0; }
      body {
        padding: 28px 22px 40px;
        background: #f1f7ff;
      }
      a { color: inherit; text-decoration: none; }
      code, input, button { font: inherit; }
      textarea { font: inherit; }
      button, input {
        border-radius: 16px;
        border: 1px solid rgba(186, 206, 236, 0.56);
      }
      textarea {
        border-radius: 16px;
        border: 1px solid rgba(186, 206, 236, 0.56);
      }
      button {
        min-height: 44px;
        padding: 0 18px;
        font-weight: 700;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.92);
        color: var(--ink-soft);
      }
      button.primary {
        color: #f5fbfa;
        border-color: transparent;
        background: linear-gradient(180deg, #28b8ac 0%, var(--accent) 100%);
      }
      button.danger {
        color: var(--danger);
      }
      button:disabled {
        opacity: 0.5;
        cursor: wait;
      }
      input {
        min-height: 46px;
        padding: 10px 14px;
        width: min(320px, 100%);
        background: var(--paper-strong);
      }
      textarea {
        width: 100%;
        min-height: 104px;
        padding: 12px 14px;
        background: var(--paper-strong);
        resize: vertical;
      }
      .shell {
        max-width: 1180px;
        margin: 0 auto;
        display: grid;
        gap: 18px;
      }
      .hero, .panel, .artifact-card, .status-chip {
        border: 1px solid rgba(255, 255, 255, 0.9);
        border-radius: 30px;
        background: var(--paper);
        box-shadow: var(--shadow);
        backdrop-filter: blur(16px);
      }
      .hero {
        position: relative;
        padding: 28px 30px;
      }
      .eyebrow {
        margin: 0 0 8px;
        color: var(--accent);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: clamp(1.5rem, 2.4vw, 2.2rem);
        line-height: 1.05;
        letter-spacing: -0.045em;
        color: var(--ink-strong);
      }
      .hero p, .muted, .artifact-meta {
        color: var(--ink-soft);
      }
      .hero-head,
      .hero-actions,
      .toolbar,
      .confirm-row,
      .artifact-actions,
      .status-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
      .hero-head {
        justify-content: space-between;
      }
      .hero-copy {
        max-width: 720px;
      }
      .hero-copy p {
        margin: 14px 0 0;
        line-height: 1.7;
      }
      .hero-meta {
        display: flex;
        gap: 10px 14px;
        flex-wrap: wrap;
        margin-top: 12px;
        color: var(--ink-soft);
      }
      .hero-link {
        color: var(--accent-strong);
        font-weight: 700;
      }
      .hero-actions {
        justify-content: flex-end;
        margin-top: 24px;
      }
      .hero-actions-group {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        width: 100%;
      }
      .hero-user-status {
        display: inline-flex;
        align-items: center;
        min-height: 36px;
        max-width: min(420px, calc(100vw - 120px));
        padding: 0 14px;
        border: 1px solid rgba(186, 206, 236, 0.5);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.84);
        color: var(--accent-strong);
        font-size: 0.88rem;
        font-weight: 600;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hero-user-status.warning {
        border-color: rgba(180, 73, 43, 0.16);
        color: var(--danger);
      }
      .hero-user-status-floating {
        position: absolute;
        top: 24px;
        right: 28px;
        z-index: 1;
      }
      .action-panel,
      .artifacts {
        padding: 24px 26px;
      }
      .status-row {
        margin-top: 18px;
      }
      .status-chip-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .status-chip {
        min-width: 0;
        padding: 14px 16px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: none;
      }
      .status-chip dt {
        margin-bottom: 4px;
        color: var(--ink-soft);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .status-chip dd {
        margin: 0;
        word-break: break-word;
        font-weight: 700;
      }
      .status-tag {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid transparent;
        font-size: 0.88rem;
        font-weight: 700;
        line-height: 1;
      }
      .status-tag.success {
        color: var(--accent-strong);
        border-color: rgba(26, 130, 127, 0.16);
        background: rgba(26, 130, 127, 0.1);
      }
      .status-tag.warning {
        color: var(--danger);
        border-color: rgba(180, 73, 43, 0.16);
        background: rgba(180, 73, 43, 0.1);
      }
      .review-reminder {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-top: 16px;
        padding: 14px 16px;
        border: 1px solid rgba(13, 148, 136, 0.22);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.74);
        color: var(--ink);
        font-size: 0.9rem;
        font-weight: 700;
        line-height: 1.6;
      }
      .review-reminder-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 20px;
        width: 20px;
        height: 20px;
        margin-top: 1px;
        border-radius: 50%;
        background: var(--accent);
        color: white;
        font-size: 13px;
        font-weight: 800;
        line-height: 1;
      }
      .action-panel h2, .artifacts h2 {
        margin: 0 0 10px;
        font-size: 1rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .status {
        min-height: 24px;
        margin: 16px 0 0;
        color: var(--accent);
        font-weight: 700;
      }
      .status.error {
        color: var(--danger);
      }
      .confirm-panel {
        margin-top: 18px;
        padding: 18px;
        border: 1px solid rgba(186, 206, 236, 0.56);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.74);
      }
      .confirm-grid {
        display: grid;
        gap: 14px;
        margin-top: 14px;
      }
      .confirm-field {
        display: grid;
        gap: 8px;
      }
      .confirm-field label {
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-soft);
      }
      .confirm-field input[readonly] {
        color: var(--ink-soft);
        background: rgba(23, 48, 47, 0.05);
      }
      .confirm-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 16px;
      }
      .settings-modal {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(44, 64, 92, 0.34);
        z-index: 30;
      }
      .settings-modal[hidden] {
        display: none;
      }
      .settings-dialog {
        width: min(880px, 100%);
        max-height: min(80vh, 900px);
        margin: 0;
        padding: 20px 22px;
        border: 1px solid rgba(186, 206, 236, 0.56);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 24px 60px rgba(125, 156, 210, 0.22);
        overflow: auto;
      }
      .settings-toolbar {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
      }
      .settings-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }
      .copy-hint {
        color: var(--accent-strong);
        font-size: 0.78rem;
        font-weight: 700;
        line-height: 1.4;
      }
      .settings-code {
        margin: 14px 0 0;
        padding: 16px;
        border-radius: 18px;
        background: rgba(24, 54, 88, 0.92);
        color: #fffdf8;
        font-family: "SFMono-Regular", "Menlo", "Monaco", monospace;
        font-size: 0.82rem;
        line-height: 1.6;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .artifact-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 18px;
      }
      .artifact-card {
        padding: 20px 22px;
        background: rgba(255, 255, 255, 0.9);
        min-width: 0;
      }
      .artifact-card h3 {
        margin: 0 0 8px;
        font-size: 1.1rem;
        overflow-wrap: anywhere;
      }
      .artifact-card code {
        display: inline-block;
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(26, 130, 127, 0.08);
      }
      .artifact-meta {
        overflow-wrap: anywhere;
      }
      .artifact-actions {
        margin-top: 14px;
      }
      .artifact-action-disabled {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: not-allowed;
      }
      .artifact-action-disabled button {
        opacity: 0.56;
        cursor: not-allowed;
        pointer-events: none;
      }
      .artifact-disabled-reason {
        color: var(--danger);
        font-size: 0.78rem;
        font-weight: 700;
        line-height: 1.4;
      }
      .empty {
        padding: 30px 20px;
        border: 1px dashed rgba(23, 48, 47, 0.18);
        border-radius: 22px;
        text-align: center;
        color: var(--ink-soft);
      }
      @media (max-width: 960px) {
        .hero-user-status-floating {
          position: static;
        }
        .hero-head {
          align-items: flex-start;
        }
        .hero-actions {
          width: 100%;
          justify-content: flex-start;
        }
        .hero-actions-group {
          justify-content: flex-start;
        }
      }
      @media (max-width: 640px) {
        body { padding: 16px; }
        .hero, .panel, .artifact-card, .status-chip { border-radius: 22px; }
        .hero { padding: 20px; }
        .status-chip {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="hero-head">
          <div class="hero-copy">
            <p class="eyebrow">发布管理</p>
            <h1>打包与发布</h1>
            <p>重点放在生产构建和 zip 产物处理。默认沿用当前 package.json 版本；只有明确确认后才会修改版本号并构建。</p>
          </div>
          <div class="hero-actions">
            <div class="hero-actions-group">
              <button id="refreshButton" type="button">刷新列表</button>
              <a href="${homeHref}"><button class="primary" type="button">返回首页</button></a>
            </div>
          </div>
        </div>
        <div id="loginStatus" class="hero-user-status hero-user-status-floating warning">未登录（不支持发布）</div>
        <div class="status-row">
          <dl class="status-chip">
            <dt>当前版本</dt>
            <dd id="currentVersion">加载中...</dd>
          </dl>
          <dl class="status-chip">
            <dt>推荐版本</dt>
            <dd id="recommendedVersion">加载中...</dd>
          </dl>
          <dl class="status-chip">
            <dt>BI SuperApp</dt>
            <dd class="status-chip-row">
              <span id="bindingTag" class="status-tag warning">未绑定</span>
              <a id="bindingLink" class="hero-link" href="${devHref}">去配置</a>
            </dd>
          </dl>
        </div>
      </section>

      <section class="panel action-panel">
        <div class="toolbar">
          <div>
            <h2>打包发布</h2>
            <p class="muted">默认只按当前版本生成 zip。只有你明确确认修改版本号时，才会改写 package.json。</p>
          </div>
          <div class="confirm-row">
            <button id="previewButton" type="button" hidden>预览构建结果</button>
            <button id="viewSettingsButton" type="button" hidden>查看线上配置</button>
            <button id="prepareButton" class="primary" type="button">打包发布</button>
          </div>
        </div>
        <div class="review-reminder" role="note">
          <span class="review-reminder-icon" aria-hidden="true">!</span>
          <span>打包、预览、发布前，请先使用 review skill 完成上线检查。</span>
        </div>
        <div id="confirmPanel" class="confirm-panel" hidden>
          <p class="muted">默认推荐下一个版本号，并支持手动修改；如不需要改版本，可取消勾选后按当前版本构建。</p>
          <div class="confirm-row">
            <label><input id="updateVersionCheckbox" type="checkbox" /> 构建前修改版本号</label>
            <input id="versionInput" type="text" inputmode="decimal" placeholder="例如 0.1.1" disabled />
            <button id="confirmBuildButton" class="primary" type="button">确认并开始构建</button>
          </div>
        </div>
        <p id="status" class="status"></p>
      </section>

      <section class="panel artifacts">
        <div class="toolbar">
          <div>
            <h2>压缩包列表</h2>
            <p class="muted">支持上传发布和删除。发布时会上传 zip，并根据是否已绑定 SuperApp 执行创建或更新。</p>
          </div>
        </div>
        <div id="uploadConfirmPanel" class="confirm-panel" hidden>
          <p id="uploadConfirmHint" class="muted">请确认应用信息。确认后会先上传 zip 包，再根据是否已绑定 SuperApp 执行创建或更新。</p>
          <div class="confirm-grid">
            <div id="uploadAppNameField" class="confirm-field">
              <label for="uploadAppName">应用名称</label>
              <input id="uploadAppName" type="text" placeholder="请输入应用名称" />
            </div>
            <div id="uploadDescriptionField" class="confirm-field">
              <label for="uploadDescription">应用描述</label>
              <textarea id="uploadDescription" placeholder="请输入应用描述"></textarea>
            </div>
            <div class="confirm-field">
              <label for="uploadVersion">发布版本</label>
              <input id="uploadVersion" type="text" readonly />
            </div>
          </div>
          <div class="confirm-actions">
            <button id="cancelUploadButton" type="button">取消发布</button>
            <button id="confirmUploadButton" class="primary" type="button">确认并上传发布</button>
          </div>
        </div>
        <div id="artifactList" class="artifact-grid"></div>
      </section>
    </main>
    <div id="settingsPreviewPanel" class="settings-modal" hidden>
      <section class="settings-dialog">
        <div class="settings-toolbar">
          <div>
            <h2>线上配置</h2>
            <p class="muted">展示当前 SuperApp 的 settings.json 内容。</p>
          </div>
          <div class="settings-actions">
            <span id="copySettingsHint" class="copy-hint" hidden>已拷贝</span>
            <button id="copySettingsButton" type="button">拷贝 JSON</button>
            <button id="closeSettingsButton" type="button">关闭</button>
          </div>
        </div>
        <pre id="settingsCode" class="settings-code"></pre>
      </section>
    </div>

    <script>
      const publishEndpoint = '${publishEndpoint}';
      const currentVersionEl = document.getElementById('currentVersion');
      const recommendedVersionEl = document.getElementById('recommendedVersion');
      const statusEl = document.getElementById('status');
      const versionInput = document.getElementById('versionInput');
      const updateVersionCheckbox = document.getElementById('updateVersionCheckbox');
      const confirmPanel = document.getElementById('confirmPanel');
      const uploadConfirmPanel = document.getElementById('uploadConfirmPanel');
      const artifactList = document.getElementById('artifactList');
      const bindingTag = document.getElementById('bindingTag');
      const bindingLink = document.getElementById('bindingLink');
      const loginStatus = document.getElementById('loginStatus');
      const previewButton = document.getElementById('previewButton');
      const viewSettingsButton = document.getElementById('viewSettingsButton');
      const prepareButton = document.getElementById('prepareButton');
      const confirmBuildButton = document.getElementById('confirmBuildButton');
      const confirmUploadButton = document.getElementById('confirmUploadButton');
      const cancelUploadButton = document.getElementById('cancelUploadButton');
      const settingsPreviewPanel = document.getElementById('settingsPreviewPanel');
      const copySettingsButton = document.getElementById('copySettingsButton');
      const copySettingsHint = document.getElementById('copySettingsHint');
      const closeSettingsButton = document.getElementById('closeSettingsButton');
      const settingsCode = document.getElementById('settingsCode');
      const uploadConfirmHint = document.getElementById('uploadConfirmHint');
      const uploadAppNameField = document.getElementById('uploadAppNameField');
      const uploadDescriptionField = document.getElementById('uploadDescriptionField');
      const uploadAppNameInput = document.getElementById('uploadAppName');
      const uploadDescriptionInput = document.getElementById('uploadDescription');
      const uploadVersionInput = document.getElementById('uploadVersion');
      const refreshButton = document.getElementById('refreshButton');
      let canPublish = false;
      let publishDisabledReason = '未登录，无法发布';
      let currentPublishInfo = null;
      let pendingUploadArtifact = null;
      let currentSettingsText = '';
      let copySettingsHintTimer = null;

      function setStatus(message, isError = false) {
        statusEl.textContent = message;
        statusEl.classList.toggle('error', isError);
      }

      function setBusy(isBusy) {
        previewButton.disabled = isBusy;
        viewSettingsButton.disabled = isBusy;
        prepareButton.disabled = isBusy;
        confirmBuildButton.disabled = isBusy;
        confirmUploadButton.disabled = isBusy;
        cancelUploadButton.disabled = isBusy;
        copySettingsButton.disabled = isBusy;
        closeSettingsButton.disabled = isBusy;
        refreshButton.disabled = isBusy;
      }

      function escapeHtmlAttribute(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      function syncVersionInputState() {
        const shouldUpdateVersion = updateVersionCheckbox.checked;
        versionInput.disabled = !shouldUpdateVersion;
        versionInput.readOnly = !shouldUpdateVersion;

        if (!shouldUpdateVersion && currentPublishInfo) {
          versionInput.value = currentPublishInfo.currentVersion;
        }
      }

      function closeUploadConfirm() {
        pendingUploadArtifact = null;
        uploadConfirmPanel.hidden = true;
      }

      function syncUploadConfirmState() {
        const isBound = Boolean(currentPublishInfo?.superApp?.isBound && currentPublishInfo?.superApp?.appId);

        uploadAppNameField.hidden = isBound;
        uploadDescriptionField.hidden = isBound;
        uploadAppNameInput.disabled = isBound;
        uploadDescriptionInput.disabled = isBound;
        uploadConfirmHint.textContent = isBound
          ? '当前已绑定 SuperApp，发布时只需要确认版本和 zip 包；名称与描述沿用线上应用配置。'
          : '首次发布需要确认应用名称、描述、版本和 zip 包。确认后会先上传 zip 包，再创建并绑定 SuperApp。';
      }

      function closeSettingsPreview() {
        settingsPreviewPanel.hidden = true;
      }

      function showCopySettingsHint() {
        if (copySettingsHintTimer) {
          window.clearTimeout(copySettingsHintTimer);
        }

        copySettingsHint.hidden = false;
        copySettingsHintTimer = window.setTimeout(() => {
          copySettingsHint.hidden = true;
          copySettingsHintTimer = null;
        }, 1500);
      }

      function renderSettingsButton() {
        const hasArtifacts = Boolean(currentPublishInfo?.artifacts?.length);
        const isBound = Boolean(currentPublishInfo?.superApp?.isBound && currentPublishInfo?.superApp?.appId);
        viewSettingsButton.hidden = !(hasArtifacts && isBound);
      }

      function showSettingsPreview(formattedJson) {
        currentSettingsText = formattedJson;
        settingsCode.textContent = formattedJson;
        copySettingsHint.hidden = true;
        settingsPreviewPanel.hidden = false;
      }

      function parseSettingsResponse(responseValue) {
        const rawValue = String(responseValue || '{}');
        const parsedValue = JSON.parse(rawValue);

        if (typeof parsedValue === 'string') {
          return JSON.parse(parsedValue);
        }

        return parsedValue;
      }

      async function copySettings() {
        if (!currentSettingsText) {
          return;
        }

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(currentSettingsText);
          return;
        }

        const textarea = document.createElement('textarea');
        textarea.value = currentSettingsText;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      function openUploadConfirm(artifact) {
        if (!currentPublishInfo) {
          return;
        }

        pendingUploadArtifact = artifact;
        uploadAppNameInput.value = currentPublishInfo.packageInfo.name || '';
        uploadDescriptionInput.value = currentPublishInfo.packageInfo.description || '';
        uploadVersionInput.value = artifact.version;
        syncUploadConfirmState();
        uploadConfirmPanel.hidden = false;

        if (uploadAppNameInput.disabled) {
          uploadVersionInput.focus();
          uploadVersionInput.select();
          return;
        }

        uploadAppNameInput.focus();
        uploadAppNameInput.select();
      }

      function renderArtifacts(artifacts) {
        previewButton.hidden = !artifacts.length;
        renderSettingsButton();

        if (!artifacts.length) {
          artifactList.innerHTML = '<div class="empty">还没有生成任何发布压缩包。</div>';
          return;
        }

        const uploadActionHtml = canPublish
          ? (fileName) => \`<button type="button" data-action="upload" data-file-name="\${fileName}">上传发布</button>\`
          : () => \`<span class="artifact-action-disabled"><button type="button" disabled aria-disabled="true">\u4e0a\u4f20\u53d1\u5e03</button><span class="artifact-disabled-reason">\${escapeHtmlAttribute(publishDisabledReason)}</span></span>\`;

        artifactList.innerHTML = artifacts.map((artifact) => \`
          <article class="artifact-card">
            <p class="eyebrow">ZIP</p>
            <h3>\${artifact.fileName}</h3>
            <p><code>版本 \${artifact.version}</code></p>
            <p class="artifact-meta">大小：\${artifact.sizeLabel} · 更新时间：\${new Date(artifact.updatedAt).toLocaleString('zh-CN')}</p>
            <div class="artifact-actions">
              \${uploadActionHtml(artifact.fileName)}
              <button class="danger" type="button" data-action="delete" data-file-name="\${artifact.fileName}">删除</button>
            </div>
          </article>
        \`).join('');
      }

      function renderBinding(superApp) {
        if (superApp && superApp.isBound && superApp.link) {
          bindingTag.textContent = '已绑定';
          bindingTag.className = 'status-tag success';
          bindingLink.textContent = '打开';
          bindingLink.href = superApp.link;
          bindingLink.hidden = false;
          return;
        }

        bindingTag.textContent = '未绑定';
        bindingTag.className = 'status-tag warning';
        bindingLink.textContent = '去配置';
        bindingLink.href = '${devHref}';
        bindingLink.hidden = false;
      }

      function renderLoginStatus(userProfile) {
        if (userProfile && userProfile.name) {
          const roles = Array.isArray(userProfile.role) ? userProfile.role : [];
          const roleText = roles.length ? roles.join(' / ') : '未知角色';
          const permissionText = canPublish ? '支持发布' : '不支持发布';

          loginStatus.textContent = \`\${userProfile.name}，\${roleText}（\${permissionText}）\`;
          loginStatus.className = 'hero-user-status hero-user-status-floating';
          return;
        }

        loginStatus.textContent = '未登录（不支持发布）';
        loginStatus.className = 'hero-user-status hero-user-status-floating warning';
      }

      async function request(path = '', options) {
        const response = await fetch(\`\${publishEndpoint}\${path}\`, options);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || '请求失败');
        }

        return payload;
      }

      async function requestJson(url, options) {
        const headers = new Headers(options?.headers);

        if (!headers.has('raw-backend-response')) {
          headers.set('raw-backend-response', 'TRUE');
        }

        const response = await fetch(url, {
          ...options,
          headers,
        });
        const payload = await response.json();

        if (!response.ok || payload.error) {
          throw new Error(payload.error?.message || payload.error || '请求失败');
        }

        return payload;
      }

      async function loadPublishInfo() {
        const payload = await request();
        currentPublishInfo = payload;
        currentVersionEl.textContent = payload.currentVersion;
        recommendedVersionEl.textContent = payload.recommendedVersion;
        versionInput.value = payload.recommendedVersion;
        updateVersionCheckbox.checked = true;
        syncVersionInputState();
        renderBinding(payload.superApp);
        renderArtifacts(payload.artifacts);
      }

      async function openSettingsPreview() {
        const appId = String(currentPublishInfo?.superApp?.appId || '').trim();

        if (!appId) {
          setStatus('当前未绑定 SuperApp，无法查看线上配置。', true);
          return;
        }

        setBusy(true);
        setStatus('正在读取线上配置...');

        try {
          const payload = await requestJson('/api/open-apps/settings/' + encodeURIComponent(appId), {
            method: 'GET',
          });
          const settingsObject = parseSettingsResponse(payload.response);
          const formattedJson = JSON.stringify(settingsObject, null, 2);

          showSettingsPreview(formattedJson);
          setStatus('线上配置已加载。');
        } catch (error) {
          setStatus(error.message, true);
        } finally {
          setBusy(false);
        }
      }

      async function loadCurrentUser() {
        try {
          const response = await fetch('/api/user/profile');
          const rawData = await response.json();
          const { response: payload, error } = rawData;
          if (!response.ok || error) {
            throw new Error(error?.message || '用户信息加载失败');
          }

          const roles = Array.isArray(payload.role) ? payload.role : [];
          canPublish = roles.includes('admin') || roles.includes('super_admin');
          publishDisabledReason = canPublish ? '' : \`\${payload.name || '当前用户'} 不是管理员，无法发布\`;
          renderLoginStatus(payload);
        } catch {
          canPublish = false;
          publishDisabledReason = '未登录，无法发布';
          renderLoginStatus(null);
        }
      }

      async function prepareBuild() {
        setBusy(true);
        setStatus('正在读取推荐版本...');

        try {
          const payload = await request('/recommend');
          currentVersionEl.textContent = payload.currentVersion;
          recommendedVersionEl.textContent = payload.recommendedVersion;
          versionInput.value = payload.recommendedVersion;
          updateVersionCheckbox.checked = true;
          syncVersionInputState();
          confirmPanel.hidden = false;
          setStatus('请确认构建参数，默认使用推荐版本；如有需要可手动修改或取消改版本。');
        } catch (error) {
          setStatus(error.message, true);
        } finally {
          setBusy(false);
        }
      }

      async function runBuild() {
        const updateVersion = updateVersionCheckbox.checked;
        const version = versionInput.value.trim();

        if (updateVersion && !version) {
          setStatus('请先填写新的版本号。', true);
          versionInput.focus();
          return;
        }

        setBusy(true);
        setStatus(
          updateVersion
            ? \`正在修改版本到 \${version} 并构建，这一步会执行 npm run build 并打 zip...\`
            : \`正在按当前版本 \${version} 构建，这一步会执行 npm run build 并打 zip...\`
        );

        try {
          const payload = await request('/build', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateVersion ? { updateVersion: true, version } : {})
          });

          confirmPanel.hidden = true;
          currentPublishInfo = payload;
          currentVersionEl.textContent = payload.currentVersion;
          recommendedVersionEl.textContent = payload.recommendedVersion;
          renderArtifacts(payload.artifacts);
          setStatus(payload.message || '打包成功。');
        } catch (error) {
          setStatus(error.message, true);
        } finally {
          setBusy(false);
        }
      }

      async function uploadArtifact(fileName) {
        const artifact = currentPublishInfo?.artifacts?.find((item) => item.fileName === fileName);

        if (!artifact) {
          setStatus('未找到待发布的压缩包。', true);
          return;
        }

        openUploadConfirm(artifact);
      }

      async function confirmUploadArtifact() {
        if (!pendingUploadArtifact || !currentPublishInfo) {
          return;
        }

        const isBound = Boolean(currentPublishInfo.superApp?.isBound && currentPublishInfo.superApp?.appId);
        const appName = uploadAppNameInput.value.trim();
        const description = uploadDescriptionInput.value.trim();
        const version = uploadVersionInput.value.trim();

        if (!isBound && !appName) {
          window.alert('应用名称不能为空。');
          uploadAppNameInput.focus();
          return;
        }

        setBusy(true);
        setStatus(\`正在上传发布 \${pendingUploadArtifact.fileName}...\`);

        try {
          const artifactResponse = await fetch(\`\${publishEndpoint}/artifact-file?fileName=\${encodeURIComponent(pendingUploadArtifact.fileName)}\`);

          if (!artifactResponse.ok) {
            const payload = await artifactResponse.json();
            throw new Error(payload.error || '读取压缩包失败');
          }

          const artifactBlob = await artifactResponse.blob();
          const artifactFile = new File([artifactBlob], pendingUploadArtifact.fileName, {
            type: artifactBlob.type || 'application/zip',
          });
          const uploadFormData = new FormData();
          uploadFormData.append('file', artifactFile);

          const uploadPayload = await requestJson('/api/open-apps/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          const fileKey = String(uploadPayload.response || '').trim();

          if (!fileKey) {
            throw new Error('上传成功但未返回 fileKey。');
          }

          if (!currentPublishInfo.superApp?.isBound) {
            const createPayload = await requestJson('/api/open-apps/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                appName,
                description,
                fileKey,
                version,
              }),
            });

            const appId = String(createPayload.response || '').trim();

            if (!appId) {
              throw new Error('创建成功但未返回 appId。');
            }

            await request('/bind-app', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ appId }),
            });

            await loadPublishInfo();
            closeUploadConfirm();
            setStatus(\`创建并绑定 SuperApp 成功，appId: \${appId}\`);
            return;
          }

          await requestJson('/api/open-apps/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              appId: currentPublishInfo.superApp.appId,
              fileKey,
              version,
            }),
          });

          await loadPublishInfo();
          closeUploadConfirm();
          setStatus(\`SuperApp \${currentPublishInfo.superApp.appId} 发布更新成功。\`);
        } catch (error) {
          window.alert(error.message);
          setStatus(error.message, true);
        } finally {
          setBusy(false);
        }
      }

      async function deleteArtifact(fileName) {
        if (!window.confirm(\`确认删除 \${fileName} 吗？\`)) {
          return;
        }

        setBusy(true);
        setStatus(\`正在删除 \${fileName}...\`);

        try {
          const payload = await request('/artifact', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileName })
          });
          currentPublishInfo = payload;
          currentVersionEl.textContent = payload.currentVersion;
          recommendedVersionEl.textContent = payload.recommendedVersion;
          renderArtifacts(payload.artifacts);
          setStatus(payload.message || '压缩包已删除。');
        } catch (error) {
          setStatus(error.message, true);
        } finally {
          setBusy(false);
        }
      }

      prepareButton.addEventListener('click', () => {
        prepareBuild();
      });

      previewButton.addEventListener('click', () => {
        window.open('${previewHref}', '_blank', 'noopener');
      });

      viewSettingsButton.addEventListener('click', () => {
        openSettingsPreview();
      });

      confirmBuildButton.addEventListener('click', () => {
        runBuild();
      });

      updateVersionCheckbox.addEventListener('change', () => {
        if (currentPublishInfo) {
          versionInput.value = updateVersionCheckbox.checked
            ? currentPublishInfo.recommendedVersion
            : currentPublishInfo.currentVersion;
        }
        syncVersionInputState();
      });

      confirmUploadButton.addEventListener('click', () => {
        confirmUploadArtifact();
      });

      cancelUploadButton.addEventListener('click', () => {
        closeUploadConfirm();
        setStatus('已取消发布。');
      });

      copySettingsButton.addEventListener('click', () => {
        copySettings()
          .then(() => {
            showCopySettingsHint();
            setStatus('线上配置 JSON 已拷贝。');
          })
          .catch((error) => setStatus(error.message, true));
      });

      closeSettingsButton.addEventListener('click', () => {
        closeSettingsPreview();
      });

      settingsPreviewPanel.addEventListener('click', (event) => {
        if (event.target === settingsPreviewPanel) {
          closeSettingsPreview();
        }
      });

      refreshButton.addEventListener('click', () => {
        setBusy(true);
        setStatus('正在刷新发布信息...');
        loadPublishInfo()
          .then(() => setStatus('发布信息已刷新。'))
          .catch((error) => setStatus(error.message, true))
          .finally(() => setBusy(false));
      });

      artifactList.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');

        if (!button) {
          return;
        }

        const fileName = button.dataset.fileName;

        if (!fileName) {
          return;
        }

        if (button.dataset.action === 'upload') {
          uploadArtifact(fileName);
          return;
        }

        if (button.dataset.action === 'delete') {
          deleteArtifact(fileName);
        }
      });

      setBusy(true);
      setStatus('正在读取发布信息...');
      loadCurrentUser()
        .then(() => loadPublishInfo())
        .then(() => setStatus('发布信息已加载。'))
        .catch((error) => setStatus(error.message, true))
        .finally(() => setBusy(false));
    </script>
  </body>
</html>`;
}

function normalizeRoutePath(pathname) {
    if (!pathname || pathname === '/') {
        return pathname || '/';
    }

    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function resolveRouteBase(pathname, suffix) {
    const normalizedPath = normalizeRoutePath(pathname);

    if (!normalizedPath.endsWith(suffix)) {
        return null;
    }

    return normalizedPath.slice(0, -suffix.length);
}

function resolveRoutePrefixBase(pathname, prefix) {
    const normalizedPath = normalizeRoutePath(pathname);

    if (normalizedPath === prefix) {
        return '';
    }

    if (!normalizedPath.startsWith(`${prefix}/`)) {
        return null;
    }

    return '';
}

export function createDevServerPlugin(packageJson) {
    let viteServer;
    let isPublishing = false;

    return {
        name: 'dev-config-page-plugin',
        apply: 'serve',
        configureServer(server) {
            viteServer = server;

            server.middlewares.use(async (req, res, next) => {
                const requestUrl = new URL(req.url || '/', 'http://localhost');
                const matchedDevBase = resolveRouteBase(requestUrl.pathname, '/dev');
                const matchedPublishBase = resolveRouteBase(requestUrl.pathname, '/publish');
                const matchedConfigBase = resolveRouteBase(requestUrl.pathname, '/__dev/config');
                const matchedRuntimeBase = resolveRouteBase(requestUrl.pathname, '/__dev/runtime');
                const matchedAuthConfigBase = resolveRouteBase(requestUrl.pathname, '/__dev/auth-config');
                const matchedTokenStatusBase = resolveRouteBase(requestUrl.pathname, '/__dev/token-status');
                const matchedPublishApiBase = resolveRoutePrefixBase(requestUrl.pathname, '/__dev/publish');
                const openAppsPreviewRedirectLocation =
                    req.method === 'GET' ? getOpenAppsPreviewRedirectLocation(requestUrl) : null;
                const matchedOpenAppsPreviewFile =
                    req.method === 'GET' ? resolveOpenAppsPreviewFile(requestUrl.pathname) : null;

                if (openAppsPreviewRedirectLocation !== null) {
                    res.statusCode = 302;
                    res.setHeader('Location', openAppsPreviewRedirectLocation);
                    res.end();
                    return;
                }

                if (matchedOpenAppsPreviewFile !== null) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', matchedOpenAppsPreviewFile.contentType);
                    if (Object.prototype.hasOwnProperty.call(matchedOpenAppsPreviewFile, 'body')) {
                        res.end(matchedOpenAppsPreviewFile.body);
                        return;
                    }

                    res.end(readFileSync(matchedOpenAppsPreviewFile.filePath));
                    return;
                }

                if (req.method === 'GET' && matchedDevBase !== null) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.end(buildDevPageHtml(packageJson, matchedDevBase));
                    return;
                }

                if (req.method === 'GET' && matchedRuntimeBase !== null) {
                    sendJson(res, 200, buildRuntimePayload(packageJson));
                    return;
                }

                if (matchedAuthConfigBase !== null) {
                    try {
                        if (req.method !== 'POST') {
                            sendJson(res, 405, { error: 'Method Not Allowed' });
                            return;
                        }

                        const requestBody = await readRequestBody(req);
                        const parsedBody = requestBody ? JSON.parse(requestBody) : {};
                        const envValues = parseEnvFile();
                        const nextAuthValues = {
                            VITE_BI_HOST: parsedBody.biHost ?? envValues.VITE_BI_HOST,
                            VITE_BI_LOGIN_DOMAIN: parsedBody.loginDomain ?? envValues.VITE_BI_LOGIN_DOMAIN,
                            VITE_BI_LOGIN_ID: parsedBody.loginId ?? envValues.VITE_BI_LOGIN_ID,
                            VITE_BI_LOGIN_PASSWORD: parsedBody.loginPassword ?? envValues.VITE_BI_LOGIN_PASSWORD,
                        };

                        validateBiHost(nextAuthValues.VITE_BI_HOST ?? '');

                        if (
                            !String(nextAuthValues.VITE_BI_LOGIN_DOMAIN || '').trim() ||
                            !String(nextAuthValues.VITE_BI_LOGIN_ID || '').trim() ||
                            !String(nextAuthValues.VITE_BI_LOGIN_PASSWORD || '')
                        ) {
                            writeEnvFileAfterResponse(res, nextAuthValues);
                            sendJson(res, 200, {
                                ok: false,
                                message: '账密已保存；补全三项后会自动换取新 Token。',
                            });
                            return;
                        }

                        const uidToken = await requestUidTokenByPasswordLogin(nextAuthValues);

                        const nextEnvValues = {
                            ...nextAuthValues,
                            VITE_UID_TOKEN: uidToken,
                        };

                        writeEnvFileAfterResponse(res, nextEnvValues);
                        sendJson(res, 200, {
                            ok: true,
                            uidToken,
                        });
                    } catch (error) {
                        sendJson(res, 400, {
                            error: error instanceof Error ? error.message : '未知错误',
                            shouldAlert: true,
                        });
                    }
                    return;
                }

                if (matchedTokenStatusBase !== null) {
                    try {
                        if (req.method !== 'POST') {
                            sendJson(res, 405, { error: 'Method Not Allowed' });
                            return;
                        }

                        const requestBody = await readRequestBody(req);
                        const parsedBody = requestBody ? JSON.parse(requestBody) : {};
                        const tokenValue = parsedBody.token;
                        const biHostValue = parsedBody.biHost;
                        const statusCode = await resolveUidTokenValidationHttpStatus(tokenValue, biHostValue);

                        sendJson(res, statusCode, {
                            ok: statusCode === 200,
                            statusCode,
                        });
                    } catch (error) {
                        sendJson(res, 500, {
                            ok: false,
                            statusCode: 500,
                            error: error instanceof Error ? error.message : '未知错误',
                        });
                    }
                    return;
                }

                if (matchedPublishApiBase !== null) {
                    try {
                        const normalizedPublishPath = normalizeRoutePath(requestUrl.pathname);
                        const publishPath = normalizedPublishPath.slice('/__dev/publish'.length) || '';
                        const requestBody =
                            req.method === 'GET' ? {} : JSON.parse((await readRequestBody(req)) || '{}');

                        if (req.method === 'GET' && publishPath === '') {
                            sendJson(res, 200, buildPublishPayload());
                            return;
                        }

                        if (req.method === 'GET' && publishPath === '/recommend') {
                            const publishPayload = buildPublishPayload();
                            sendJson(res, 200, {
                                currentVersion: publishPayload.currentVersion,
                                recommendedVersion: publishPayload.recommendedVersion,
                            });
                            return;
                        }

                        if (req.method === 'POST' && publishPath === '/build') {
                            if (isPublishing) {
                                sendJson(res, 409, { error: '当前已有构建任务在执行，请稍后再试。' });
                                return;
                            }

                            isPublishing = true;

                            try {
                                const updateVersion = requestBody.updateVersion === true;
                                const version = String(requestBody.version || '').trim();
                                const { artifact, version: confirmedVersion } = await buildPublishArtifact(
                                    updateVersion ? { updateVersion: true, version } : {},
                                );
                                const payload = buildPublishPayload();

                                sendJson(res, 200, {
                                    ...payload,
                                    artifact,
                                    message: `版本 ${confirmedVersion} 构建并压缩完成，已生成 ${artifact.fileName}。`,
                                });
                            } finally {
                                isPublishing = false;
                            }
                            return;
                        }

                        if (req.method === 'DELETE' && publishPath === '/artifact') {
                            deletePublishArtifact(String(requestBody.fileName || '').trim());
                            sendJson(res, 200, {
                                ...buildPublishPayload(),
                                message: '压缩包已删除。',
                            });
                            return;
                        }

                        if (req.method === 'GET' && publishPath === '/artifact-file') {
                            const fileName = String(requestUrl.searchParams.get('fileName') || '').trim();
                            const filePath = getPublishArtifactFilePath(fileName);
                            const fileBuffer = readFileSync(filePath);

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/zip');
                            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                            res.end(fileBuffer);
                            return;
                        }

                        if (req.method === 'POST' && publishPath === '/bind-app') {
                            const appId = String(requestBody.appId || '').trim();

                            if (!appId) {
                                sendJson(res, 400, { error: 'appId 不能为空。' });
                                return;
                            }

                            writeEnvFile({
                                VITE_APP_ID: appId,
                            });

                            sendJson(res, 200, {
                                ...buildPublishPayload(),
                                message: `已写入 VITE_APP_ID=${appId}`,
                            });
                            return;
                        }

                        sendJson(res, 405, { error: 'Method Not Allowed' });
                    } catch (error) {
                        isPublishing = false;
                        sendJson(res, 400, {
                            error: error instanceof Error ? error.message : '未知错误',
                        });
                    }
                    return;
                }

                if (req.method === 'GET' && matchedPublishBase !== null) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.end(buildPublishPageHtml(matchedPublishBase));
                    return;
                }

                if (matchedConfigBase === null) {
                    next();
                    return;
                }

                try {
                    if (req.method === 'GET') {
                        const values = parseEnvFile();

                        sendJson(res, 200, {
                            ...buildConfigPayload(packageJson, values),
                            error: '',
                            shouldAlert: false,
                        });
                        return;
                    }

                    if (req.method === 'POST') {
                        const requestBody = await readRequestBody(req);
                        const parsedBody = requestBody ? JSON.parse(requestBody) : {};
                        const nextValues = parsedBody.values || {};

                        validateUpdatedValues(nextValues);
                        writeEnvFile(nextValues);

                        const nextPort = resolveNextDevPort(nextValues, parseEnvFile());

                        sendJson(res, 200, {
                            message: '配置已写入 .env，dev server 正在重载。',
                            nextPort,
                        });

                        setTimeout(() => {
                            viteServer.restart();
                        }, 120);
                        return;
                    }

                    sendJson(res, 405, { error: 'Method Not Allowed' });
                } catch (error) {
                    sendJson(res, 400, {
                        error: error instanceof Error ? error.message : '未知错误',
                    });
                }
            });
        },
    };
}
