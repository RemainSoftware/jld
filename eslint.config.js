const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');

module.exports = [
    eslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module'
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                setTimeout: 'readonly',
                __dirname: 'readonly',
                require: 'readonly',
                module: 'readonly',
                exports: 'writable'
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            '@typescript-eslint/naming-convention': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'semi': ['error', 'always'],
            'curly': 'warn',
            'eqeqeq': 'warn',
            'no-throw-literal': 'warn',
            'no-undef': 'off' // TypeScript handles this
        }
    },
    {
        ignores: ['out/**', 'dist/**', '**/*.d.ts', 'node_modules/**', '*.config.js']
    }
];
