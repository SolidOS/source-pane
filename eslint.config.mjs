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
<<<<<<< HEAD
            semi: ['error', 'never'],
            quotes: ['error', 'single'],
            'no-console': 'warn',
            'no-unused-vars': 'warn',
            'no-undef': 'error'
        },
=======
        // Code style - match TypeScript settings
        semi: ['error', 'never'],
        quotes: ['error', 'single'],

        // Strict checking - match TypeScript strictness
        'no-console': 'warn',
        'no-unused-vars': 'warn', // Match TypeScript noUnusedLocals: true
        'no-undef': 'error',
        strict: ['error', 'global'], // Match TypeScript alwaysStrict: true

        // Additional strictness to match TypeScript behavior
        'no-implicit-globals': 'error',
        'prefer-const': 'error', // Encourage immutability
        'no-var': 'error', // Use let/const only
        'no-redeclare': 'error'
        }
>>>>>>> d5d9ce1f6d78ef6f4c1e5107dddc1f14bf9b080f
    }
]