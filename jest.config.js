module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
      customExportConditions: ['node']
  },
  setupFilesAfterEnv: ["./test/helpers/jest.setup.js"],
  transformIgnorePatterns: ["/node_modules/(?!lit-html).+\\.js"],
  roots: ['<rootDir>/src', '<rootDir>/test'],
}
