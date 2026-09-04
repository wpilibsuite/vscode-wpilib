import { sveltePreprocess } from 'svelte-preprocess';

export default {
  preprocess: sveltePreprocess({
    typescript: {
      tsconfigFile: './src/webviews/svelte/tsconfig.json',
      compilerOptions: {
        verbatimModuleSyntax: true,
      },
    },
  }),
  compilerOptions: {
    dev: process.env.NODE_ENV !== 'production',
  },
};
