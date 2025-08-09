import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([globalIgnores(["src/**/*.test.js"]), {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            Atomics: "readonly",
            SharedArrayBuffer: "readonly",
        },

        ecmaVersion: 8,
        sourceType: "commonjs",
    },

    rules: {
        "no-unused-vars": ["warn", {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
        }],
    },
}]);