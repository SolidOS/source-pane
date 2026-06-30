export default {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
      customExportConditions: ['node']
  },
  setupFilesAfterEnv: ["./test/helpers/jest.setup.js"],
  transform: {
    '^.+\\.(ts|m?js)$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!lit-html|lit|@lit|@uvdsl/solid-oidc-client-browser|uuid|@noble|solid-logic|solid-ui)'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^SolidLogic$': 'solid-logic',
    '^\\$rdf$': 'rdflib',
    '\\.(css)$': '<rootDir>/test/__mocks__/styleMock.js'
  },
}
