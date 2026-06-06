import path from 'path'
import { fileURLToPath } from 'url'
import { resolvePathsUsingDecorators, litDecoratorsBabelOptions } from './config/babel.mjs'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const pathsUsingDecorators = resolvePathsUsingDecorators(projectRoot)

export default {
  presets: [
    '@babel/preset-typescript',
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['> 1%', 'last 3 versions', 'not dead']
        },
      },
    ],
  ],
  plugins: [
    'babel-plugin-transform-import-meta',
    [
      'babel-plugin-inline-import', {
        extensions: [
          '.ttl'
        ]
      }
    ]
  ],
  overrides: [
    {
      include: pathsUsingDecorators,
      ...litDecoratorsBabelOptions,
    }
  ]
}
