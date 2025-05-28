//@ts-check

'use strict';

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
	mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file

    // LanceDB native modules
    '@lancedb/lancedb-win32-x64-msvc': 'commonjs @lancedb/lancedb-win32-x64-msvc',
    '@lancedb/lancedb-darwin-universal': 'commonjs @lancedb/lancedb-darwin-universal',
    '@lancedb/lancedb-linux-x64-gnu': 'commonjs @lancedb/lancedb-linux-x64-gnu',

    // Optional dependencies that cause issues
    'kerberos': 'commonjs kerberos',
    '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
    '@aws-sdk/credential-providers': 'commonjs @aws-sdk/credential-providers',
    'gcp-metadata': 'commonjs gcp-metadata',
    'snappy': 'commonjs snappy',
    'socks': 'commonjs socks',
    'aws4': 'commonjs aws4',
    'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
    'webworker-threads': 'commonjs webworker-threads',
    'pg-native': 'commonjs pg-native',
    'cloudflare:sockets': 'commonjs cloudflare:sockets'
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
};
module.exports = [ extensionConfig ];