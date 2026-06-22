import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    // src/core/url.ts references compile-time globals declared in src/vite-env.d.ts;
    // vitest must define them so the identifiers resolve (otherwise any test importing
    // src/core/url.ts throws `__DEV__ is not defined`).
    define: {
        __DEV__: JSON.stringify(true),
        __DEV_BI_HOST__: JSON.stringify(''),
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './tests/setup.ts',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
        },
    },
});
