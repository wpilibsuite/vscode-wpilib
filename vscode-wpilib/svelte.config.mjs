import { sveltePreprocess } from 'svelte-preprocess';

export default {
  preprocess: sveltePreprocess({
    typescript: {
      tsconfigFile: './tsconfig.webviews.json',
    },
  }),
  compilerOptions: {
    css: true,
    dev: process.env.NODE_ENV !== 'production',
  },
};
