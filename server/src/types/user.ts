import type { Role } from '@prisma/client';

/** The only user shape that is ever sent to clients: no password hash. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
