-- Rollback for the "init" migration. Prisma does not run down migrations
-- automatically; see README "Database migrations" for how to apply this.
DROP TABLE IF EXISTS "system_status";
DROP TABLE IF EXISTS "events";
DROP TABLE IF EXISTS "orders";
DROP TABLE IF EXISTS "users";
DROP TYPE IF EXISTS "ServiceState";
DROP TYPE IF EXISTS "ServiceName";
DROP TYPE IF EXISTS "OrderStatus";
DROP TYPE IF EXISTS "EventType";
DROP TYPE IF EXISTS "Role";
