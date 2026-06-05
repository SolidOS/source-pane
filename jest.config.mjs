export default {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
      customExportConditions: ['node']
  },
  setupFilesAfterEnv: ["./test/helpers/jest.setup.js"],
<<<<<<< HEAD
  transform: {
    '^.+\\.m?js$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!.*(?:@uvdsl|uuid|@noble|lit-html|lit-element|lit|@lit|@lit-labs|solid-ui|solid-logic)(?:/|$))'],
=======
  transformIgnorePatterns: ["/node_modules/(?!(@lit|@lit-labs|lit|lit-html|lit-element)/).+\\.js$"],
>>>>>>> cac3f76 (#171 First pass refactor to match new design)
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^SolidLogic$': 'solid-logic',
    '^\\$rdf$': 'rdflib',
    '\\.(css)$': '<rootDir>/test/__mocks__/styleMock.js'
  },
}
