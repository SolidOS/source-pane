import path from 'path'

/**
 * This file contains config options for babel using Lit decorators.
 *
 * @see https://lit.dev/docs/components/decorators/#using-decorators-with-babel
 */

const pathsUsingDecorators = ['src/primitives', 'src/components']

export const litDecoratorsBabelOptions = {
  assumptions: {
    setPublicClassFields: true,
    privateFieldsAsSymbols: true
  },
  plugins: [
    '@babel/plugin-transform-class-static-block',
    ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
    ['@babel/plugin-proposal-decorators', { version: '2023-05' }],
    '@babel/plugin-transform-class-properties'
  ]
}

export const litDecoratorsLoaderOptions = {
  cacheDirectory: true,
  ...litDecoratorsBabelOptions,
}

export function resolvePathsUsingDecorators (projectRoot) {
  return pathsUsingDecorators.map((_path) => path.resolve(projectRoot, _path))
}
