import path from 'path'
import { createRequire } from 'module'
import TerserPlugin from 'terser-webpack-plugin'
import { moduleRules } from './webpack.module.rules.mjs'

const require = createRequire(import.meta.url)

const externalsBase = {
  'solid-ui': {
    commonjs: 'solid-ui',
    commonjs2: 'solid-ui',
    amd: 'solid-ui',
    root: 'UI',
  },
  rdflib: {
    commonjs: 'rdflib',
    commonjs2: 'rdflib',
    amd: 'rdflib',
    root: '$rdf',
  },
}

const externalsESM = {
  'solid-ui': 'solid-ui',
  rdflib: 'rdflib',
}

const commonConfig = {
  entry: './src/sourcePane.ts',
  mode: 'production',
  module: {
    rules: moduleRules,
  },
  resolve: {
    extensions: ['.js', '.ts'],
    fallback: {
      path: require.resolve('path-browserify'),
    },
  },
  devtool: 'source-map',
}

const umdConfig = {
  ...commonConfig,
  externals: externalsBase,
  output: {
    path: path.resolve(process.cwd(), 'dist'),
    filename: 'source-pane.js',
    chunkFilename: '[name].js',
    publicPath: 'auto',
    library: {
      type: 'umd',
      name: 'SourcePane',
      export: 'default',
    },
    globalObject: 'this',
  },
  optimization: {
    concatenateModules: false,
    minimize: false,
  },
}

const minConfig = {
  ...commonConfig,
  externals: externalsBase,
  output: {
    path: path.resolve(process.cwd(), 'dist'),
    filename: 'source-pane.min.js',
    chunkFilename: '[name].min.js',
    publicPath: 'auto',
    library: {
      type: 'umd',
      name: 'SourcePane',
      export: 'default',
    },
    globalObject: 'this',
  },
  optimization: {
    concatenateModules: false,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
}

const esmPaneConfig = {
  ...commonConfig,
  devtool: false,
  externals: externalsESM,
  externalsType: 'module',
  experiments: {
    outputModule: true,
  },
  output: {
    path: path.resolve(process.cwd(), 'dist/esm'),
    filename: 'source-pane.esm.js',
    chunkFilename: '[name].esm.js',
    publicPath: '',
    library: {
      type: 'module',
    },
  },
  optimization: {
    concatenateModules: false,
    runtimeChunk: false,
    splitChunks: false,
    minimize: false,
  },
}

export default [umdConfig, minConfig, esmPaneConfig]
