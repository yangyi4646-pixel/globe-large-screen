import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sourceFiles = ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'];
const testFiles = ['tests/**/*.{test,spec}.{ts,tsx}'];
const sharedLimitRules = {
    complexity: ['error', 10],
    'max-len': [
        'error',
        {
            code: 200,
            ignorePattern: '^import\\s.+$',
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreUrls: true,
        },
    ],
    'max-lines': [
        'error',
        {
            max: 400,
            skipBlankLines: true,
            skipComments: true,
        },
    ],
    'max-params': ['error', 4],
};

export default tseslint.config(
    {
        ignores: ['coverage', 'dist', 'node_modules'],
    },
    {
        files: sourceFiles,
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            reactHooks.configs['recommended-latest'],
            eslintConfigPrettier,
        ],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            ...sharedLimitRules,
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['src/core/chart-zone-spec.ts'],
        rules: {
            // 声明式 zone 规格表:行数由 prettier 表格展开决定,非逻辑复杂度;上限放宽并保留天花板
            'max-lines': ['error', { max: 650 }],
        },
    },
    {
        files: testFiles,
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.vitest,
            },
        },
    },
    {
        files: ['scripts/**/*.mjs', 'vite.config.mjs'],
        extends: [js.configs.recommended, eslintConfigPrettier],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
    },
);
