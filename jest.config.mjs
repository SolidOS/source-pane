export default {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ["./test/helpers/jest.setup.js"],
  transformIgnorePatterns: ["/node_modules/(?!lit-html).+\\.js"],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^SolidLogic$': 'solid-logic',
    '^\\$rdf$': '<rootDir>/test/helpers/rdfMock.js',
    '^solid-ui$': '<rootDir>/test/helpers/solidUiMock.js',
'\\.(css|less|scss|sass)$': '<rootDir>/test/helpers/styleMock.js'
  },
}
