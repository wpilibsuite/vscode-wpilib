const path = require('path');

module.exports = {
  mode: 'none',
  entry: {
    //eclipseimportpage: './src/webviews/pages/eclipseimportpage.ts',
    //projectcreatorpage: './src/webviews/pages/projectcreatorpage.ts',
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
};
