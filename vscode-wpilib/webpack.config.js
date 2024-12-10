const path = require("path");

/**@type {import('webpack').Configuration}*/
module.exports = [
  {
    mode: "none",
    entry: {
      localeloader: "./src/webviews/localeloader.ts",

      gradle2020importpage: "./src/webviews/pages/gradle2020importpage.ts",
      projectcreatorpage: "./src/webviews/pages/projectcreatorpage.ts",
      riologpage: "./src/riolog/shared/sharedscript.ts",
    },
    devtool: "inline-source-map",
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
        },
        {
          test: /\.js$/,
          include: [/node_modules/],
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".js"],
    },
    node: {
      net: "empty",
    },
    output: {
      path: path.resolve(__dirname, "resources", "dist"),
      filename: "[name].js",
      hashFunction: "sha256",
    },
  },
  {
    target: "node", // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

    entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
      // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
      path: path.resolve(__dirname, "out"),
      filename: "extension.js",
      libraryTarget: "commonjs2",
      devtoolModuleFilenameTemplate: "../[resource-path]",
      hashFunction: "sha256",
    },
    devtool: "source-map",
    externals: {
      vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    },
    resolve: {
      // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
      extensions: [".ts", ".js"],
    },
    node: false, // no polyfill for node context
    module: {
      rules: [

        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
            },
          ],
        },
      ],
    },
  },
];
