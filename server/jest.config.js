/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // tsconfig sets isolatedModules, so ts-jest only transpiles; `npm run typecheck` checks types.
  transform: { '^.+\\.ts$': 'ts-jest' },
  setupFiles: ['<rootDir>/tests/setup/env.ts'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.ts',
  testTimeout: 15000,
};
