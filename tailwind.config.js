/** @type {import('tailwindcss').Config} */
export default {
    // 扫 TowerX 样板代码 + D3 原语库(DarkGlobe 等用 fixed/inset-0/z-0 等 utility,
    // 不入 content 则 JIT 不生成对应 class,wrapper div 会失去 fixed inset-0 全屏定位)。
    content: ['./src/components/towerx/**/*.{ts,tsx}', './src/primitives/**/*.{ts,tsx}', './src/App.tsx'],
    theme: {
        extend: {
            colors: {
                'bg-0': '#08041a',
                'bg-1': '#0a0518',
                'bg-2': '#120a28',
                blue: '#4d8bff',
                violet: '#8b5cf6',
                magenta: '#ff4d8f',
                fg: '#eef4ff',
            },
            fontFamily: {
                sans: ['Inter', 'Noto Sans SC', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
                serif: ['Source Serif 4', 'ui-serif', 'Georgia', 'serif'],
            },
        },
    },
    plugins: [],
};
