import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const production = process.env.NODE_ENV === 'production';

export default {
  input: path.resolve(__dirname, 'src/extension.ts'),
  platform: 'node',
  tsconfig: path.resolve(__dirname, 'tsconfig.rolldown.extension.json'),
  resolve: {
    extensions: ['.mjs', '.js', '.json', '.ts'],
    mainFields: ['module', 'main'],
  },
  output: {
    file: path.resolve(__dirname, 'out/extension.js'),
    format: 'cjs',
    sourcemap: production ? 'hidden' : 'inline',
    exports: 'named',
  },
  external: ['vscode'],
};
