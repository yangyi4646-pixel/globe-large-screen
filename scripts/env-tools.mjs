import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));
const envTemplatePath = fileURLToPath(new URL('../.env.template', import.meta.url));
const envPath = fileURLToPath(new URL('../.env', import.meta.url));

export function ensureEnvFile() {
    if (existsSync(envPath)) {
        return {
            created: false,
            envPath,
        };
    }

    copyFileSync(envTemplatePath, envPath);

    return {
        created: true,
        envPath,
    };
}

function decodeEnvValue(rawValue) {
    if (!rawValue) {
        return '';
    }

    if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
        try {
            if (rawValue.startsWith('"')) {
                return JSON.parse(rawValue);
            }

            return rawValue.slice(1, -1);
        } catch {
            return rawValue.slice(1, -1);
        }
    }

    return rawValue;
}

function encodeEnvValue(rawValue = '') {
    const value = String(rawValue);

    if (!value) {
        return '';
    }

    if (/^[A-Za-z0-9_./:@-]+$/.test(value)) {
        return value;
    }

    return JSON.stringify(value);
}

export function parseEnvContent(content) {
    const values = {};

    for (const rawLine of content.split(/\r?\n/)) {
        const trimmedLine = rawLine.trim();

        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }

        const separatorIndex = rawLine.indexOf('=');

        if (separatorIndex === -1) {
            continue;
        }

        const key = rawLine.slice(0, separatorIndex).trim();
        const rawValue = rawLine.slice(separatorIndex + 1);
        values[key] = decodeEnvValue(rawValue);
    }

    return values;
}

export function parseEnvFile(targetPath = envPath) {
    if (!existsSync(targetPath)) {
        return {};
    }

    return parseEnvContent(readFileSync(targetPath, 'utf8'));
}

export function parseEnvTemplate() {
    const templateContent = readFileSync(envTemplatePath, 'utf8');
    const definitions = [];
    let commentBuffer = [];

    for (const rawLine of templateContent.split(/\r?\n/)) {
        const trimmedLine = rawLine.trim();

        if (!trimmedLine) {
            commentBuffer = [];
            continue;
        }

        if (trimmedLine.startsWith('#')) {
            commentBuffer.push(trimmedLine.replace(/^#\s?/, ''));
            continue;
        }

        const separatorIndex = rawLine.indexOf('=');

        if (separatorIndex === -1) {
            commentBuffer = [];
            continue;
        }

        const key = rawLine.slice(0, separatorIndex).trim();
        const defaultValue = decodeEnvValue(rawLine.slice(separatorIndex + 1));

        definitions.push({
            key,
            defaultValue,
            description: commentBuffer.join('\n'),
        });

        commentBuffer = [];
    }

    return definitions;
}

export function writeEnvFile(nextValues) {
    const definitions = parseEnvTemplate();
    const currentValues = parseEnvFile();
    const mergedValues = { ...currentValues, ...nextValues };
    const knownKeys = new Set(definitions.map((definition) => definition.key));
    const lines = [];

    for (const definition of definitions) {
        if (definition.description) {
            for (const descriptionLine of definition.description.split('\n')) {
                lines.push(`# ${descriptionLine}`);
            }
        }

        const value = Object.prototype.hasOwnProperty.call(mergedValues, definition.key)
            ? mergedValues[definition.key]
            : definition.defaultValue;

        lines.push(`${definition.key}=${encodeEnvValue(value)}`);
        lines.push('');
    }

    const extraEntries = Object.entries(mergedValues).filter(([key]) => !knownKeys.has(key));

    if (extraEntries.length > 0) {
        lines.push('# 额外配置');

        for (const [key, value] of extraEntries) {
            lines.push(`${key}=${encodeEnvValue(value)}`);
        }

        lines.push('');
    }

    writeFileSync(envPath, `${lines.join('\n').trimEnd()}\n`, 'utf8');
}

export { envPath, envTemplatePath, workspaceRoot };
