const webpack = require('webpack');

module.exports = {
  context: __dirname,
  // devtool: false,
  entry: ['@babel/polyfill', './index.jsx'],
  module: {
    rules: [
      {
        include: /node_modules/,
        test: /\.mjs$/,
        type: 'javascript/auto'
      },
      {
        exclude: /(node_modules)/,
        test: /\.(js|jsx)$/,
        use: [
          'babel-loader'
        ]
      }
    ]
  },
  output: {
    filename: './build.js'
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser.js'
    }),
  ],
  resolve: {
    alias: {
      'react/jsx-runtime': require.resolve('react/jsx-runtime')
    },
    extensions: ['.js', '.jsx'],
    fallback: {
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      process: require.resolve('process/browser'),
      stream: require.resolve('stream-browserify')
    }
  }
};
