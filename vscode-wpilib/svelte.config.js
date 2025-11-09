const preprocess = require('svelte-preprocess');

/** @type {import('svelte/types/compiler/preprocess').PreprocessorGroup | import('svelte/types/compiler/preprocess').PreprocessorGroup[]} */
module.exports = {
  preprocess: preprocess({
    typescript: {
      tsconfigFile: './tsconfig.webviews.json',
    },
  }),
  compilerOptions: {
    css: true,
    dev: process.env.NODE_ENV !== 'production',
  },
};

