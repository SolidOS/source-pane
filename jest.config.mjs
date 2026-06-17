export default {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
      customExportConditions: ['node']
  },
  setupFilesAfterEnv: ["./test/helpers/jest.setup.js"],
  transformIgnorePatterns: ['node_modules/(?!@uvdsl|uuid|@noble|lit-html|lit/|@lit/)'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^SolidLogic$': 'solid-logic',
    '^solid-logic$': '<rootDir>/__mocks__/solid-logic.js',
    '^\\$rdf$': 'rdflib',
    '\\.(css)$': '<rootDir>/test/__mocks__/styleMock.js'
  },
}
