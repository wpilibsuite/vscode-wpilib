import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.js',
  version: '1.145.2',
  mocha: {
    timeout: 10000,
  },
});
