import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

const commonGlobals = {
    ...globals.browser,
    ...globals.node,
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
}

const commonRules = {
    semi: ['error', 'never'],
    quotes: ['error', 'single'],
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
}

export default [
    {
        ignores: [
            'node_modules/**',
            'coverage/**',
            'lib/**'
        ],
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            globals: {
                ...commonGlobals,
            },
        },

        rules: {
        ...commonRules,
        'no-unused-vars': 'warn',
        'no-undef': 'error',
        strict: ['error', 'global'],
        'no-implicit-globals': 'error',
        'no-redeclare': 'error'
        }
    },
    {
        files: ['src/**/*.ts', '**/*.d.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                sourceType: 'module',
            },
            globals: {
                ...commonGlobals,
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
        ...commonRules,
        'no-unused-vars': 'off',
        'no-undef': 'off',
        'no-redeclare': 'off',
        '@typescript-eslint/no-unused-vars': 'warn'
        }
    }
]
