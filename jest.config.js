module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  testEnvironmentOptions: {
    customExportConditions: [''],
    // Workaround for Node.js v25+ localStorage issue
    // Provide a temporary file path for localStorage
    url: 'http://localhost',
  },
  // Set NODE_OPTIONS to disable web storage if needed
  setupFiles: [],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};

