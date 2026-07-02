import { buildConfig, solidPane } from 'solidos-toolkit/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: solidPane({
    litDecoratorPaths: [],
    sandbox: {
      subject: 'https://testingsolidos.solidcommunity.net/profile/card#me'
    }
  }),
  build: buildConfig({ entry: 'src/sourcePane.js' }),
  test: {
    environment: 'jsdom',
    setupFiles: ['test/helpers/setup.js'],
    coverage: {
      include: ['src/**/*.[jt]s']
    }
  }
})
