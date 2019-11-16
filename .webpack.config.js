
const path = require('path');

module.exports = {
  target: 'web',
  mode: 'development',
  entry: './src/init.js',
  output: {
    library: 'demo-asteroids',
    libraryTarget: 'umd2',
    path: path.join(__dirname, '/'),
    filename: 'demo-asteroids.js'
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }  
};
