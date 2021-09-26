import { execSync } from 'node:child_process';
import { testDatabaseUrl } from './testDatabaseUrl';

/** Bring the test database schema up to date once per run. */
export default function globalSetup() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'ignore',
  });
}
