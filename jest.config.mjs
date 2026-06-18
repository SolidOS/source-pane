export default {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
      customExportConditions: ['node']
  },
  setupFilesAfterEnv: ["./test/helpers/jest.setup.js"],
  transform: {
    '^.+\\.m?js$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!.*(?:@uvdsl|uuid|@noble|lit-html|lit-element|lit|@lit|@lit-labs|solid-ui|solid-logic)(?:/|$))'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^SolidLogic$': 'solid-logic',
    '^solid-logic$': '<rootDir>/__mocks__/solid-logic.js',
    '^\\$rdf$': 'rdflib',
    '\\.(css)$': '<rootDir>/test/__mocks__/styleMock.js'
  },
}
