import tseslint from 'typescript-eslint';
import js from '@eslint/js';

import { defineConfig, globalIgnores } from 'eslint/config';
export default defineConfig([
  globalIgnores([
    'media/',
    'out/',
    'resources/',
    'eslint.config.mjs',
    'rolldown.config.mjs',
    'svelte.config.mjs',
    'gulpfile.mjs',
    'dist',
    'node_modules/',
    '.vscode-test/',
    '.rollup.cache/',
    '.vscode-test.mjs',
  ]),
  {
    files: ['**/*.ts'],
  },
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      js,
    },

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },

    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      curly: 'error',
      eqeqeq: 'error',
      'no-throw-literal': 'error',
      'no-case-declarations': 'off',
      'no-control-regex': 'off',
      'no-undef': 'off', // Enforced by tsc instead
      'no-unused-vars': 'off',
      semi: 'error',
    },
    extends: [tseslint.configs.recommended, 'js/recommended'],
  },
]);
