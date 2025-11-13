const path = require('path');

const commonjs = require('@rollup/plugin-commonjs');
const html = require('@rollup/plugin-html');
const resolve = require('@rollup/plugin-node-resolve');
const typescript = require('@rollup/plugin-typescript');
const svelte = require('rollup-plugin-svelte');
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
];

function createHtmlTemplate(title) {
  return ({ attributes, bundle, files, publicPath, title: templateTitle }) => {
    // For IIFE format, entry chunks are in the bundle object
    // Filter for JavaScript entry files from bundle
    const bundleEntries = Object.values(bundle || {});
    const jsFiles = bundleEntries.filter(
      (chunk) => chunk.isEntry && chunk.fileName && chunk.fileName.endsWith('.js')
    );

    // Fallback to files array if bundle doesn't have entries
    const filesArray = Array.isArray(files) ? files : Object.values(files || {});
    const entryFiles = jsFiles.length > 0 
      ? jsFiles 
      : filesArray.filter(
          (file) => file.isEntry && file.fileName && file.fileName.endsWith('.js')
        );

    // Generate script tags with replaceresource prefix
    // WebViewBase.replaceResources will convert these to webview URIs
    const scriptTags = entryFiles
      .map((file) => `    <script src="replaceresource/dist/${file.fileName}"></script>`)
      .join('\n');

    return `<!doctype html>
<html${attributes && attributes.html ? ` ${Object.entries(attributes.html).map(([key, value]) => `${key}="${value}"`).join(' ')}` : ''}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${templateTitle || title}</title>
  </head>
  <body>
    <div id="app" data-resource-base="replaceresource"></div>
${scriptTags}
  </body>
</html>`;
  };
}

module.exports = webviews.map(({ name, input, title }) => ({
  input: path.resolve(__dirname, input),
  output: {
    dir: path.resolve(__dirname, 'resources', 'dist'),
    entryFileNames: `${name}.js`,
    format: 'iife',
    name: `${name}App`,
    sourcemap: true,
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
      dedupe: ['svelte'],
      extensions: ['.mjs', '.js', '.json', '.ts', '.svelte'],
    }),
    commonjs(),
    typescript({
      sourceMap: !production,
      tsconfig: path.resolve(__dirname, 'tsconfig.webviews.json'),
    }),
    html({
      fileName: `${name}.html`,
      title,
      template: createHtmlTemplate(title),
    }),
  ],
  watch: {
    clearScreen: false,
  },
}));

