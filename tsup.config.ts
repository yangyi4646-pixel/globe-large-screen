import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    minify: false,
    target: 'es2020',
    external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@react-three/fiber',
        '@react-three/drei',
        '@react-three/postprocessing',
        'three',
    ],
});
