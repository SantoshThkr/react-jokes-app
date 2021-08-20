/**
 * Change a user's role from the command line. This is the supported way to
 * create the first ADMIN in a fresh environment, since self-registration
 * always produces VIEWER accounts.
 *
 *   npm run user:set-role -- someone@example.com ADMIN
 *   node dist/scripts/setUserRole.js someone@example.com ADMIN   (production image)
 */
import 'dotenv/config';
import { Role } from '@prisma/client';
import { prisma } from '../db/prisma';

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !role || !(role in Role)) {
    throw new Error(`Usage: setUserRole <email> <${Object.keys(Role).join('|')}>`);
  }

  const user = await prisma.user.update({
    where: { email: email.trim().toLowerCase() },
    data: { role: role as Role },
    select: { email: true, role: true },
  });
  process.stdout.write(`${user.email} is now ${user.role}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
