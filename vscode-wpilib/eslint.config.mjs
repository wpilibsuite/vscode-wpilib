import tseslint from 'typescript-eslint';
import js from '@eslint/js';

import { defineConfig, globalIgnores } from 'eslint/config';
export default defineConfig([
  globalIgnores([
    'media/',
    'out/',
    'resources/',
    '.eslintrc.js',
    'webpack.config.js',
    'gulpfile.js',
    'dist',
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
      '@typescript-eslint/no-unused-vars': 'off',
      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      'no-case-declarations': 'off',
      'no-control-regex': 'off',
      'no-undef': 'off', // Enforced by tsc instead
      'no-unused-vars': 'off',
      semi: 'warn',
    },
    extends: [tseslint.configs.recommended, 'js/recommended'],
  },
]);
