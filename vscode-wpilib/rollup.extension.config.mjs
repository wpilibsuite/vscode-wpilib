import path from 'node:path';
import { fileURLToPath } from 'node:url';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const production = process.env.NODE_ENV === 'production';

export default {
  input: path.resolve(__dirname, 'src/extension.ts'),
  output: {
    file: path.resolve(__dirname, 'out/extension.js'),
    format: 'cjs',
    sourcemap: production ? 'hidden' : 'inline',
    exports: 'named',
  },
  external: ['vscode'],
  plugins: [
    resolve({
      preferBuiltins: true,
      extensions: ['.mjs', '.js', '.json', '.ts'],
    }),
    json(),
    commonjs(),
    typescript({
      tsconfig: path.resolve(__dirname, 'tsconfig.rollup.extension.json'),
    }),
  ],
};
