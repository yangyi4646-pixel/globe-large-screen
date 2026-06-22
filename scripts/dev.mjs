import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { parseDevPort } from './env-config.mjs';
import { ensureEnvFile, writeEnvFile } from './env-tools.mjs';

const require = createRequire(import.meta.url);

export function parseDevCommandArgs(argv) {
    let port;

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];

        if (argument === '--port') {
            const rawPort = argv[index + 1];

            if (!rawPort || rawPort.startsWith('--')) {
                throw new Error('缺少 --port 参数值。');
            }

            port = parseDevPort(rawPort);
            index += 1;
            continue;
        }

        if (argument.startsWith('--port=')) {
            port = parseDevPort(argument.slice('--port='.length));
            continue;
        }
    }

    return {
        port,
    };
}

export function prepareDevServerEnv(argv, currentEnv = process.env) {
    const initResult = ensureEnvFile();

    if (initResult.created) {
        console.log(`Created .env from .env.template: ${initResult.envPath}`);
    }

    const { port } = parseDevCommandArgs(argv);

    if (port === undefined) {
        return currentEnv;
    }

    const nextPort = String(port);
    writeEnvFile({
        VITE_DEV_PORT: nextPort,
    });
    console.log(`Updated .env VITE_DEV_PORT=${nextPort}`);

    return {
        ...currentEnv,
        VITE_DEV_PORT: nextPort,
    };
}

export function resolveViteCliPath(requireImpl = require) {
    const vitePackageJsonPath = requireImpl.resolve('vite/package.json');
    return path.join(path.dirname(vitePackageJsonPath), 'bin', 'vite.js');
}

export function runDevServer(argv = process.argv.slice(2)) {
    const child = spawn(process.execPath, [resolveViteCliPath()], {
        stdio: 'inherit',
        env: prepareDevServerEnv(argv),
    });

    child.on('exit', (code, signal) => {
        if (signal) {
            process.kill(process.pid, signal);
            return;
        }

        process.exit(code ?? 0);
    });

    return child;
}

const entryFileUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';

if (import.meta.url === entryFileUrl) {
    runDevServer();
}
