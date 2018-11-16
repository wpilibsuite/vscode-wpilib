const path = require('path');

/**@type {import('webpack').Configuration}*/
module.exports = [{
  mode: 'none',
  entry: {
    eclipseimportpage: './src/webviews/pages/eclipseimportpage.ts',
    projectcreatorpage: './src/webviews/pages/projectcreatorpage.ts',
    riologpage: './src/riolog/shared/sharedscript.ts'
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
      {
        test: /\.js$/,
        include: [/node_modules/],
      }
    ],
  },
  resolve: {
    extensions: ['.ts', '.js']

  },
  node: {
    net: 'empty',
  },
  output: {
    path: path.resolve(__dirname, 'resources',  'dist'),
    filename: '[name].js'
  }
}, {
  target: 'node',

  entry: './src/extension.ts',
  output: { // the bundle is stored in the 'out' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: 'source-map',
  externals: {
    vscode: "commonjs vscode" // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: { // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto",
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{
          // vscode-nls-dev loader:
          // * rewrite nls-calls
          loader: 'vscode-nls-dev/lib/webpack-loader',
          options: {
            base: path.join(__dirname, 'src')
          }
        }, {
          // configure TypeScript loader:
          // * enable sources maps for end-to-end source maps
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              "sourceMap": true,
            }
          }
        }]
    }]
  },
}
];
