import path from 'path';
import { fileURLToPath } from 'url';

import svelte from 'rollup-plugin-svelte';
import svelteConfig from './svelte.config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const bundleEntries = Object.fromEntries(
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

export default {
  input: bundleEntries,
  platform: 'browser',
  tsconfig: path.resolve(__dirname, 'tsconfig.webviews.json'),
  resolve: {
    conditionNames: production ? ['production'] : ['development'],
    extensions: ['.mjs', '.js', '.json', '.ts', '.svelte'],
  },
  output: {
    dir: path.resolve(__dirname, 'resources', 'dist'),
    entryFileNames: '[name].js',
    format: 'es',
    sourcemap: !production,
    minify: production
      ? {
          compress: {
            passes: 2,
          },
          mangle: true,
        }
      : false,
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
    generateWebviewHtmlFiles(),
  ].filter(Boolean),
  watch: {
    clearScreen: false,
  },
};
