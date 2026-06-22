import { ensureEnvFile } from './env-tools.mjs';

const result = ensureEnvFile();

if (result.created) {
    console.log(`Created .env from .env.template: ${result.envPath}`);
} else {
    console.log(`Using existing .env: ${result.envPath}`);
}
