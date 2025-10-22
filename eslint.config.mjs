import globals from 'globals'

export default [
    {
        ignores: [
            'node_modules/**',
            'coverage/**'
        ],
    }, 
    {
        files: ['src/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                Atomics: 'readonly',
                SharedArrayBuffer: 'readonly',
            },
        },

        rules: {
            semi: ['error', 'never'],
            quotes: ['error', 'single'],
            'no-console': 'warn',
            'no-unused-vars': 'warn',
            'no-undef': 'error'
        },
    }
]