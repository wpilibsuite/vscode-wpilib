const path = require('path');

const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const typescript = require('@rollup/plugin-typescript');
const svelte = require('rollup-plugin-svelte');
const terser = require('terser');
const svelteConfig = require('./svelte.config');

const production = process.env.NODE_ENV === 'production';

const webviews = [
  {
    name: 'help',
    input: 'src/webviews/svelte/help/main.ts',
    title: 'WPILib Help',
  },
  {
    name: 'projectcreator',
    input: 'src/webviews/svelte/projectcreator/main.ts',
    title: 'WPILib Project Creator',
  },
  {
    name: 'gradle2025import',
    input: 'src/webviews/svelte/gradle2025import/main.ts',
    title: 'WPILib Gradle 2025 Import',
  },
  {
    name: 'dependencyview',
    input: 'src/webviews/svelte/dependencyview/main.ts',
    title: 'WPILib Vendor Dependencies',
  },
  {
    name: 'riolog',
    input: 'src/webviews/svelte/riolog/main.ts',
    title: 'WPILib RioLog',
  },
  {
    name: 'localeloader',
    input: 'src/webviews/localeloader.ts',
    title: 'Locale Loader',
  },
];

function createWebviewHtml(title, entryFileName) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="app" data-resource-base="replaceresource"></div>
    <script type="module" src="replaceresource/dist/${entryFileName}"></script>
  </body>
</html>`;
}

function generateWebviewHtmlFiles() {
  return {
    name: 'generate-webview-html-files',
    generateBundle(_outputOptions, bundle) {
      const entryFileNames = new Map();

      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk' && file.isEntry) {
          entryFileNames.set(file.name, file.fileName);
        }
      }

      for (const webview of webviews) {
        const entryFileName = entryFileNames.get(webview.name);
        if (!entryFileName) {
          this.error(`Missing entry chunk for webview '${webview.name}'`);
        }

        this.emitFile({
          type: 'asset',
          fileName: `${webview.name}.html`,
          source: createWebviewHtml(webview.title, entryFileName),
        });
      }
    },
  };
}

function minifyWithTerser() {
  return {
    name: 'minify-with-terser',
    async renderChunk(code) {
      const result = await terser.minify(code, {
        module: true,
        toplevel: true,
        compress: {
          module: true,
          toplevel: true,
          passes: 2,
        },
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,
        },
      });

      if (result.code === undefined) {
        throw new Error('Terser failed to produce output code');
      }

      return {
        code: result.code,
        map: result.map || null,
      };
    },
  };
}

const webviewInputs = Object.fromEntries(
  webviews.map(({ name, input }) => [name, path.resolve(__dirname, input)])
);

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function isSharedWebviewModule(moduleId) {
  const modulePath = toPosixPath(moduleId);
  return (
    modulePath.includes('/node_modules/') ||
    modulePath.includes('/src/webviews/svelte/lib/') ||
    modulePath.includes('/src/webviews/svelte/components/shared/') ||
    modulePath.endsWith('/src/formatter.ts')
  );
}

module.exports = {
  input: webviewInputs,
  output: {
    dir: path.resolve(__dirname, 'resources', 'dist'),
    entryFileNames: '[name].js',
    chunkFileNames: 'chunks/[name]-[hash].js',
    format: 'es',
    sourcemap: !production,
    manualChunks(id) {
      if (isSharedWebviewModule(id)) {
        return 'webview-shared';
      }
      return undefined;
    },
  },
  onwarn(warning, handler) {
    if (
      warning.code === 'CIRCULAR_DEPENDENCY' &&
      Array.isArray(warning.ids) &&
      warning.ids.every((id) => id.includes(`${path.sep}node_modules${path.sep}svelte${path.sep}`))
    ) {
      return;
    }
    handler(warning);
  },
  plugins: [
    svelte({
      compilerOptions: {
        dev: !production,
      },
      emitCss: false,
      preprocess: svelteConfig.preprocess,
    }),
    resolve({
      browser: true,
      exportConditions: production ? ['production'] : ['development'],
      dedupe: ['svelte'],
      extensions: ['.mjs', '.js', '.json', '.ts', '.svelte'],
    }),
    commonjs(),
    typescript({
      sourceMap: !production,
      tsconfig: path.resolve(__dirname, 'tsconfig.webviews.json'),
      outDir: path.resolve(__dirname, 'resources', 'dist', '.tsbuild'),
    }),
    production && minifyWithTerser(),
    generateWebviewHtmlFiles(),
  ].filter(Boolean),
  watch: {
    clearScreen: false,
  },
};
