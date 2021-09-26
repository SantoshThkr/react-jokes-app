/**
 * Tests run against a dedicated database and wipe it between tests, so the
 * URL must never fall back to the development database.
 */
export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://ops:ops_dev_password@localhost:5433/ops_dashboard_test?schema=public';

if (!/test/i.test(new URL(testDatabaseUrl).pathname)) {
  throw new Error(`Refusing to run tests against a non-test database: ${new URL(testDatabaseUrl).pathname}`);
}
