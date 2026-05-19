import { sveltePreprocess } from 'svelte-preprocess';

export default {
  preprocess: sveltePreprocess({
    typescript: {
      tsconfigFile: './tsconfig.json',
    },
  }),
  compilerOptions: {
    dev: process.env.NODE_ENV !== 'production',
  },
};
