const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

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
    path: path.resolve(__dirname, 'resources', 'dist'),
    filename: '[name].js'
  }
}, {
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
  target: 'node', // extensions run in a node context
  node: {
    __dirname: false // leave the __dirname-behaviour intact
  },
  entry: {
    extension: './src/extension.ts',
  },
  resolve: {
    mainFields: ['module', 'main'],
    extensions: ['.ts', '.js'] // support ts-files and js-files
  },
  module: {
    rules: [{
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
  externals: {
    'vscode': 'commonjs vscode', // ignored because it doesn't exist
  },
  output: {
    // all output goes into `dist`.
    // packaging depends on that and this must always be like it
    filename: '[name].js',
    path: path.join(__dirname, 'out'),
    libraryTarget: "commonjs",
  },
  // yes, really source maps
  devtool: 'source-map',
  plugins: [
    new CopyWebpackPlugin([
      { from: './out/**/*', to: '.', ignore: ['*.js', '*.js.map'], flatten: true }
    ])
  ]
}
];
