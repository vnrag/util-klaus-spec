const path = require('path');
const webpack = require('webpack');
const pkg = require('./package.json')

const NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: pkg.main,
    path: path.resolve(__dirname),
    library: 'KlausSpec',
    libraryTarget: 'umd'
  },
  mode: NODE_ENV,
  devtool: NODE_ENV === 'development' ? 'eval-source-map' : false,
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin()
  ],
  externals: {
    he: 'he',
    mustache: 'Mustache',
    react: 'React'
  },
  resolve: {
    extensions: ['*', '.js', '.jsx', '.ts', '.tsx']
  },
  module: {
    rules: [{
      test: /\.(js|jsx|ts|tsx)$/,
      loader: 'babel-loader',
      exclude: /node_modules/
    }]
  }
};
