import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.js',
  version: '1.134.0',
  mocha: {
    timeout: 10000,
  },
});
