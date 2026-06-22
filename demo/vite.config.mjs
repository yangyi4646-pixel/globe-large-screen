import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: __dirname,
    plugins: [react()],
    // src/core/url.ts references compile-time globals declared in src/vite-env.d.ts;
    // demo must define them so vite replaces the identifiers (otherwise main.tsx
    // throws `__DEV__ is not defined` at first render and the React tree never mounts).
    define: {
        __DEV__: JSON.stringify(true),
        __DEV_BI_HOST__: JSON.stringify(''),
    },
    resolve: {
        alias: {
            '@towerx': path.resolve(__dirname, '../src'),
            '@': path.resolve(__dirname, '../src'),
        },
    },
    publicDir: 'public',
    server: {
        host: '0.0.0.0',
        port: 8001,
    },
});
