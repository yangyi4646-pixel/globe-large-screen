import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { parseDevPort } from './env-config.mjs';
import { ensureEnvFile, parseEnvFile } from './env-tools.mjs';

const PREVIEW_PATH = '/open-apps/preview/';
const DEV_HEALTH_PATH = '/__dev/publish/recommend';
const devScriptPath = fileURLToPath(new URL('./dev.mjs', import.meta.url));

function resolveDevPort() {
    ensureEnvFile();
    const envValues = parseEnvFile();
    return parseDevPort(envValues.VITE_DEV_PORT ?? '8000');
}

function checkPortInUse(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const socket = net.createConnection({ port, host });

        socket.once('connect', () => {
            socket.end();
            resolve(true);
        });

        socket.once('error', () => {
            resolve(false);
        });
    });
}

async function waitForDevServer(port, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    const healthUrl = `http://127.0.0.1:${port}${DEV_HEALTH_PATH}`;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(healthUrl);

            if (response.ok) {
                return;
            }
        } catch {
            // Keep polling until the timeout expires.
        }

        await new Promise((resolve) => {
            setTimeout(resolve, 500);
        });
    }

    throw new Error(`开发服务未能在 ${timeoutMs}ms 内启动完成: ${healthUrl}`);
}

function startDevServer(port) {
    const child = spawn(process.execPath, [devScriptPath, '--port', String(port)], {
        detached: true,
        stdio: 'ignore',
    });

    child.unref();
}

function openInDefaultBrowser(url) {
    if (process.platform === 'darwin') {
        return spawn('open', [url], { stdio: 'ignore', detached: true });
    }

    if (process.platform === 'win32') {
        return spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true });
    }

    return spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
}

async function main() {
    const port = resolveDevPort();
    const portInUse = await checkPortInUse(port);

    if (!portInUse) {
        console.log(`Port ${port} 未被占用，正在启动本地开发服务...`);
        startDevServer(port);
        await waitForDevServer(port);
    }

    const previewUrl = `http://localhost:${port}${PREVIEW_PATH}`;

    console.log(`Preview: ${previewUrl}`);
    openInDefaultBrowser(previewUrl).unref();
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
