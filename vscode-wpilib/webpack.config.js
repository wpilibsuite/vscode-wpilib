const path = require('path');
const isDevelopment = process.env.NODE_ENV !== 'production';

/**@type {import('webpack').Configuration}*/
module.exports = [
  {
    entry: {
      localeloader: './src/webviews/localeloader.ts',
      gradle2025importpage: './src/webviews/pages/gradle2025importpage.ts',
      projectcreatorpage: './src/webviews/pages/projectcreatorpage.ts',
      riologpage: ['./src/riolog/shared/sharedscript.ts', './src/riolog/script/implscript.ts'],
    },
    devtool: isDevelopment ? 'inline-source-map' : 'source-map',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
        },
        {
          test: /\.js$/,
          include: [/node_modules/],
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      fallback: {
        net: false,
      },
    },
    output: {
      path: path.resolve(__dirname, 'resources', 'dist'),
      filename: '[name].js',
      hashFunction: 'sha256',
    },
  },
  {
    target: 'node',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'out'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '../[resource-path]',
      hashFunction: 'sha256',
    },
    devtool: isDevelopment ? 'inline-source-map' : 'source-map',
    externals: {
      vscode: 'commonjs vscode',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    node: false,
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
            },
          ],
        },
      ],
    },
  },
];
