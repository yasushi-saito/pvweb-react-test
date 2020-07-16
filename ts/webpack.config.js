var path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const autoprefixer = require('autoprefixer');

// https://github.com/webpack/webpack-dev-server/issues/1406

module.exports = (env, argv) => ({
  mode: "development",
  output: {
    path: path.join(__dirname, "dist"),
    filename: 'app.bundle.js'
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      PVWStyle: path.resolve(__dirname, './node_modules/paraviewweb/style'),
    },
  },
  devtool: 'source-map',
  entry: ['./src/index.tsx'],
  module: {
      rules: [
        {
          test: /\.ts(x?)$/,
          exclude: /node_modules/,
          loader: 'ts-loader',
        }, {
          test: /\.js$/,
          include: /node_modules(\/|\\)paraviewweb(\/|\\)/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env', '@babel/preset-react'],
              },
            },
          ],
        }, {
          test: /\.c$/i,
          include: /node_modules(\/|\\)paraviewweb(\/|\\)/,
          loader: 'shader-loader',
        }, {
          test: /\.js$/,
          include: /node_modules(\/|\\)vtk.js(\/|\\)/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env'],
              },
            },
          ],
        }, {
          test: /\.glsl$/i,
          include: /node_modules(\/|\\)vtk.js(\/|\\)/,
          loader: 'shader-loader',
        }, {
          test: /\.css$/,
          use: [
            { loader: 'style-loader' },
            { loader: 'css-loader' },
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => [autoprefixer('last 2 version', 'ie >= 10')],
              },
            },
          ],
        },
      ]
  },
  plugins: [
    new CopyPlugin([
      { from: 'index.html', to: 'dist/index.html' },
    ]),
  ],
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    disableHostCheck: true,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
  }
});
