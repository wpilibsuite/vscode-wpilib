const path = require('path');

module.exports = {
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
        use: 'ts-loader',
        exclude: '/node_modules/'
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'resources',  'dist'),
    filename: '[name].js'
  }
};
