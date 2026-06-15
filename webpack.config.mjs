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
  mode: 'production',
  entry: './src/sourcePane.ts',
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
    library: {
      type: 'umd',
      name: 'SourcePane',
      export: 'default',
    },
    globalObject: 'this',
    clean: false,
  },
  optimization: {
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
    library: {
      type: 'umd',
      name: 'SourcePane',
      export: 'default',
    },
    globalObject: 'this',
    clean: false,
  },
  optimization: {
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

const esmConfig = {
  ...commonConfig,
  externals: externalsESM,
  externalsType: 'module',
  experiments: {
    outputModule: true,
  },
  output: {
    path: path.resolve(process.cwd(), 'dist'),
    filename: 'source-pane.esm.js',
    chunkFilename: '[name].esm.js',
    library: {
      type: 'module',
    },
    clean: false,
  },
  optimization: {
    minimize: false,
  },
}

export default [umdConfig, minConfig, esmConfig]
