const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

// Shared settings to avoid duplication
const commonConfig = {
  mode: 'production',
  entry: './src/index.ts', // Ensure this file exports your main class
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};

module.exports = [
  // ---------------------------------------------------------------------------
  // 1. UMD Config: For <script src="..."> (Global Variable)
  // ---------------------------------------------------------------------------
  Object.assign({}, commonConfig, {
    output: {
      path: path.resolve(__dirname, 'dist/browser'),
      filename: 'openwakewordjs.umd.js',
      library: {
        name: 'OpenWakeWordJS',
        type: 'umd',
        export: 'default'
      },
      globalObject: 'this'
    },
    // We only need to run CopyPlugin once (so we put it here)
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: "node_modules/onnxruntime-web/dist/*.wasm", to: "onnx/[name][ext]" },
          { from: "models/", to: "models/" }
        ],
      }),
    ],
  }),

  // ---------------------------------------------------------------------------
  // 2. ESM Config: For <script type="module"> (Import)
  // ---------------------------------------------------------------------------
  Object.assign({}, commonConfig, {
    experiments: {
      outputModule: true, // Required for Webpack 5 to output native ESM
    },
    output: {
      path: path.resolve(__dirname, 'dist/browser'),
      filename: 'openwakewordjs.esm.js', // Different filename
      library: {
        type: 'module', // Tells Webpack to use native "export" syntax
      },
    },
    // No CopyPlugin here (it's already running in the first config)
  }),
];