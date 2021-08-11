-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('ORDER_CREATED', 'ORDER_COMPLETED', 'USER_LOGIN', 'PAYMENT_COMPLETED', 'SYSTEM_WARNING');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceName" AS ENUM ('API', 'DATABASE', 'PAYMENTS', 'NOTIFICATIONS');

-- CreateEnum
CREATE TYPE "ServiceState" AS ENUM ('ONLINE', 'DEGRADED', 'OFFLINE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "type" "EventType" NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "user_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "customer_name" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_status" (
    "service" "ServiceName" NOT NULL,
    "status" "ServiceState" NOT NULL DEFAULT 'ONLINE',
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "system_status_pkey" PRIMARY KEY ("service")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "events_created_at_idx" ON "events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "events_type_created_at_idx" ON "events"("type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_completed_at_idx" ON "orders"("completed_at");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_status" ADD CONSTRAINT "system_status_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Constraints Prisma cannot express in the schema file.
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"));
ALTER TABLE "orders" ADD CONSTRAINT "orders_amount_positive_check" CHECK ("amount" > 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_completed_at_check"
  CHECK (("status" = 'COMPLETED') = ("completed_at" IS NOT NULL));

-- Human-friendly order numbers (#1001, #1002, ...).
ALTER SEQUENCE "orders_id_seq" RESTART WITH 1001;

-- Reference data: every monitored service always has exactly one status row.
INSERT INTO "system_status" ("service", "status", "updated_at") VALUES
  ('API', 'ONLINE', CURRENT_TIMESTAMP),
  ('DATABASE', 'ONLINE', CURRENT_TIMESTAMP),
  ('PAYMENTS', 'ONLINE', CURRENT_TIMESTAMP),
  ('NOTIFICATIONS', 'ONLINE', CURRENT_TIMESTAMP);
