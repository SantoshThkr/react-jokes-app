# Real-Time Operations Dashboard

A full-stack dashboard for monitoring operational metrics as they happen: active users, orders, revenue, errors, service health and a live activity feed. Authenticated users see changes pushed over WebSockets without refreshing the page.

```text
Browser (React)
   │  REST: initial state, mutations         Socket.IO: live updates
   ▼                                          ▲
Node.js API (Express + Socket.IO) ────────────┘
   │
   ▼
PostgreSQL (Prisma)
```

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Database migrations and seed data](#database-migrations-and-seed-data)
- [Architecture](#architecture)
- [REST API](#rest-api)
- [Real-time events](#real-time-events)
- [Security](#security)
- [Testing](#testing)
- [Docker](#docker)
- [Continuous integration](#continuous-integration)
- [Design decisions and limitations](#design-decisions-and-limitations)

## Features

- **Live dashboard**: active users, orders today, revenue today and errors today, all computed on the server. Updates arrive over Socket.IO.
- **Activity feed**: new events appear at the top. The browser keeps only the newest 50.
- **System status**: API, Database, Payments and Notifications can each be Online, Degraded or Offline. Admins change them; every dashboard updates immediately.
- **Orders**: server-side pagination, status filter and debounced search (by customer or `#order-number`). Admins create orders and move them through `PENDING → PROCESSING → COMPLETED` (or `CANCELLED`).
- **Events**: server-side pagination and type filter. Admins can create test events.
- **Users**: admin-only list of accounts.
- **Connection indicator**: shows `● Live`, `● Reconnecting…` or `● Offline` (with a Retry button). After a reconnect the app refetches over REST, so events missed during the gap are not lost.
- **Authentication and roles**: registration, login and logout with JWTs; `ADMIN` and `VIEWER` roles enforced on the server.

| Capability | ADMIN | VIEWER |
| --- | :---: | :---: |
| View dashboard, orders, events, system status | ✓ | ✓ |
| Create orders / change order status | ✓ | |
| Create (test) events | ✓ | |
| Change system status | ✓ | |
| View users | ✓ | |

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router, Axios, Socket.IO client, SCSS | Standard, well-supported SPA stack. State is kept in `useReducer` and Context (auth and the socket connection only). No Redux: the state is not complex enough to need it. |
| Backend | Node.js, Express 5, TypeScript, Socket.IO | Express 5 forwards async errors to the error middleware. Socket.IO provides auth middleware, rooms and reconnection. |
| Database | PostgreSQL 16 with Prisma | Type-safe queries, versioned SQL migrations, one ORM. |
| Auth | JWT (`jsonwebtoken`, HS256), `bcrypt` | Stateless API authentication; industry-standard password hashing. |
| Validation | Zod | One schema per input: it validates, normalises (trim, lowercase) and gives the TypeScript type. |
| Logging | pino / pino-http | Structured JSON logs with redaction of credentials. |
| Tests | Jest and Supertest (server), Vitest and React Testing Library (client) | Server tests use a real PostgreSQL database; client tests use a fake socket. |
| Delivery | Docker, Docker Compose, GitHub Actions | Reproducible stack and CI on every push and pull request. |

## Getting started

### Prerequisites

- Node.js 22 (see `.nvmrc`; 20+ works)
- Docker (for PostgreSQL, or for the full stack)

### Option A: run everything in Docker

```bash
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD and JWT_SECRET (32+ characters)
docker compose up --build
```

Open <http://localhost:8080>. Migrations run automatically when the API container starts. The database starts empty, so register an account, then promote it to admin (see [Creating an admin](#creating-an-admin)). To load demo data instead, see [Seed data](#seed-data).

### Option B: local development (hot reload)

1. **Start PostgreSQL** (the compose file publishes it on port 5433):

   ```bash
   cp .env.example .env          # set POSTGRES_PASSWORD and JWT_SECRET
   docker compose up -d db
   ```

2. **API** (http://localhost:4000):

   ```bash
   cd server
   cp .env.example .env          # set JWT_SECRET; make DATABASE_URL match the db password
   npm install
   npm run db:migrate            # apply migrations
   npm run db:seed               # optional demo data and users
   npm run dev
   ```

3. **Client** (http://localhost:5173, proxies `/api` and `/socket.io` to the API):

   ```bash
   cd client
   npm install
   npm run dev
   ```

With seed data you can sign in as:

| Email | Password | Role |
| --- | --- | --- |
| `admin@example.com` | `Password123!` | ADMIN |
| `viewer@example.com` | `Password123!` | VIEWER |

These are development-only credentials. The seed script refuses to run when `NODE_ENV=production`.

### Creating an admin

Self-registration always creates `VIEWER` accounts, so nobody can make themselves an admin. To promote a user:

```bash
cd server && npm run user:set-role -- someone@example.com ADMIN
# inside the production container:
docker compose exec api node dist/scripts/setUserRole.js someone@example.com ADMIN
```

### Useful scripts

| Server (`server/`) | |
| --- | --- |
| `npm run dev` | API with reload and pretty logs |
| `npm run lint` / `typecheck` / `test` / `build` | Quality checks and the production build |
| `npm run db:migrate` | Create and apply migrations in development |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:seed` | Load development data |
| `npm run user:set-role -- <email> <ADMIN\|VIEWER>` | Change a user's role |

| Client (`client/`) | |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run lint` / `typecheck` / `test` / `build` | Quality checks and the production build |

## Configuration

All configuration comes from environment variables. The API validates them at start-up and **refuses to start** with a clear message if anything is missing or invalid, for example a `JWT_SECRET` shorter than 32 characters. Real `.env` files are git-ignored; only `.env.example` files are committed.

**API (`server/.env`)**

| Variable | Required | Default | Description |
| --- | :---: | --- | --- |
| `DATABASE_URL` | ✓ | | PostgreSQL connection string |
| `JWT_SECRET` | ✓ | | JWT signing secret, at least 32 characters |
| `CLIENT_URL` | ✓ | | Allowed browser origin(s) for CORS and Socket.IO, comma separated |
| `NODE_ENV` | | `development` | `development`, `test` or `production` |
| `PORT` | | `4000` | HTTP and Socket.IO port |
| `JWT_EXPIRES_IN` | | `8h` | Token lifetime (`15m`, `8h`, `1d`, …) |
| `BCRYPT_ROUNDS` | | `12` | bcrypt cost factor (4–15) |
| `AUTH_RATE_LIMIT_MAX` | | `20` | Login/register attempts per IP per window |
| `AUTH_RATE_LIMIT_WINDOW_MINUTES` | | `15` | Rate-limit window |
| `LOG_LEVEL` | | `info` | pino log level |

**Docker Compose (root `.env`)**: `POSTGRES_PASSWORD` and `JWT_SECRET` are required. Optional: `POSTGRES_USER`, `POSTGRES_DB`, `WEB_PORT` (8080), `DB_PORT` (5433), `CLIENT_URL`.

**Client**: `VITE_API_URL` is optional and only needed when the API is on a different origin. By default the client calls its own origin, which the Vite dev server or nginx proxies to the API.

## Database migrations and seed data

The schema lives in [`server/prisma/schema.prisma`](server/prisma/schema.prisma). Migrations are versioned SQL in [`server/prisma/migrations`](server/prisma/migrations).

| Table | Purpose | Notable constraints and indexes |
| --- | --- | --- |
| `users` | Accounts | Unique email, `CHECK` email is lowercase, role enum |
| `orders` | Orders | `CHECK amount > 0`, `CHECK` `completed_at` is set only when `COMPLETED`; indexes on `created_at`, `(status, created_at)`, `completed_at`; ids start at 1001 |
| `events` | Activity feed | Indexes on `created_at` and `(type, created_at)` |
| `system_status` | One row per service | Primary key is the service enum; the four rows are inserted by the migration |

**Apply migrations**

- Development: `npm run db:migrate` (`prisma migrate dev`).
- Production: `npm run db:deploy` (`prisma migrate deploy`). The Docker image runs this on start.

Never change production tables by hand; add a migration.

**Rollback**: Prisma has no automatic down migrations. Each migration that needs a rollback ships a hand-written `down.sql` next to its `migration.sql`. To roll back the initial migration:

```bash
cd server
npx prisma db execute --file prisma/migrations/20260923120700_init/down.sql --schema prisma/schema.prisma
npx prisma migrate resolve --rolled-back 20260923120700_init
```

<a id="seed-data"></a>**Seed data**: `npm run db:seed` creates two users, about 60 orders spread over three days, and matching events. It clears existing orders and events first, and refuses to run in production. Against the Docker database, run it from `server/` with `DATABASE_URL` pointing at `localhost:${DB_PORT}`.

## Architecture

### Backend layout (`server/src`)

```text
config/       Environment validation (Zod) and the pino logger
db/           Prisma client
routes/       URL → middleware → controller wiring only
middleware/   authenticate, requireRole, validateBody, rate limiting, error handling
controllers/  HTTP in/out: parse params and query, call a service, shape the response
services/     Business logic: auth, orders, events, system status, dashboard summary, presence
validators/   Zod schemas for every request body and query string
sockets/      Socket.IO server (handshake auth, rooms, presence) and the broadcast helper
types/        DTOs and typed Socket.IO event maps
utils/        HttpError, pagination, input parsing, dates
scripts/      Operational CLI (setUserRole)
```

A request flows **route → middleware → controller → service → Prisma**. Any error thrown along the way ends up in the error middleware, which returns `{ "error": { "message" } }` with the right status code.

### Real-time flow

```text
Admin: PATCH /api/orders/1042 {status: COMPLETED}
  → requireRole('ADMIN') → validateBody
  → orderService.updateOrderStatus
      transaction: conditional update + PAYMENT_COMPLETED + ORDER_COMPLETED events
  → after commit: publish('order.updated'), publish('activity.created') ×2, publishSummary()
  → Socket.IO room "dashboard" (authenticated sockets only)
  → every open dashboard updates its reducer state; no refresh needed
```

- **REST first, sockets second.** Each page loads its initial state over REST. Socket events are applied on top of that state, and every change goes through REST.
- **Broadcast after commit.** Events are published only once the transaction has succeeded, so clients never see a change that was rolled back.
- **Socket authentication.** The handshake reuses the same `authenticateToken` as the HTTP middleware. Invalid or missing tokens get `Unauthorized` and never join the `dashboard` room. A socket is disconnected when its token expires.
- **Presence.** Active users are counted per user, not per tab, from live socket connections.
- **Client.** A single `SocketProvider` owns one connection per session. `useSocketEvent` subscribes components and removes the listener on unmount. `useResyncOnConnect` refetches after a connection gap.

### Frontend layout (`client/src`)

```text
api/          Axios instance (token injection, 401 handling) and one module per resource
context/      AuthContext (session) and SocketContext (connection and status)
hooks/        useAuth, useSocket/useSocketEvent/useResyncOnConnect, useDashboard, usePaginatedQuery, useDebouncedValue
pages/        Login, Register, Dashboard, Orders, Events, Users, NotFound
components/   common/ (layout, route guard, status, pagination), dashboard/, orders/, events/
types/        API contracts and the Socket.IO event map
utils/        Formatting, dashboard reducer, URL search params, token storage
styles/       SCSS partials
```

## REST API

All responses use `{ "data": … }` for success and `{ "error": { "message": "…", "details"?: [{ "path", "message" }] } }` for failure. Every endpoint except register, login and health requires `Authorization: Bearer <token>`.

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | public | `{ name, email, password }` → `201 { user, token }`. Always creates a VIEWER. Rate limited. |
| `POST` | `/api/auth/login` | public | `{ email, password }` → `{ user, token }`. Rate limited. |
| `GET` | `/api/auth/me` | any | Current user |
| `GET` | `/api/dashboard/summary` | any | `{ activeUsers, ordersToday, revenueToday, errorsToday, periodStart, generatedAt }` |
| `GET` | `/api/orders` | any | `?page&pageSize(≤100)&status&search` → `{ items, pagination }` |
| `GET` | `/api/orders/:id` | any | Includes `nextStatuses` (the valid next statuses) |
| `POST` | `/api/orders` | ADMIN | `{ customerName, amount, status?: PENDING\|PROCESSING }` → `201` |
| `PATCH` | `/api/orders/:id` | ADMIN | `{ status }`. Invalid or concurrent transitions → `409` |
| `GET` | `/api/events` | any | `?page&pageSize&type` |
| `POST` | `/api/events` | ADMIN | `{ type, message, metadata? }` → `201` |
| `GET` | `/api/system-status` | any | All four services |
| `PUT` | `/api/system-status/:service` | ADMIN | `{ status: ONLINE\|DEGRADED\|OFFLINE }` |
| `GET` | `/api/users` | ADMIN | `?page&pageSize` |
| `GET` | `/api/health` | public | Liveness check that includes the database; used by Docker |

Status codes: `400` invalid input, `401` missing, invalid or expired token, `403` wrong role, `404` not found, `409` conflict, `413` body too large, `429` rate limited, `500` unexpected error (generic message only).

**Logout**: tokens are stateless, so logging out discards the token on the client.

## Real-time events

Clients connect to the same origin with `io({ auth: { token } })`. Events the server emits to the `dashboard` room:

| Event | Payload | Emitted when |
| --- | --- | --- |
| `activity.created` | Event | Any event is recorded (login, order, warning, manual) |
| `order.created` | Order | An order is created |
| `order.updated` | Order | An order's status changes |
| `system.status.changed` | SystemStatus | A service status changes |
| `summary.updated` | DashboardSummary | Orders, revenue or error counts may have changed |
| `presence.updated` | `{ activeUsers }` | A user's first tab connects or last tab disconnects |

## Security

- Passwords are hashed with **bcrypt** (cost 12 by default). Hashes are excluded from every query that feeds a response.
- Login failures return the same message and take similar time whether or not the email exists (dummy hash comparison).
- JWTs are HS256 only (the algorithm is pinned on verify), carry only the user id, and expire. The user is reloaded on every request, so deleted accounts and role changes take effect immediately.
- **Authorization is enforced on the server** (`requireRole`). Hiding UI controls is for convenience only.
- **Helmet** security headers on the API; nginx adds CSP and frame protection for the SPA.
- **CORS** and Socket.IO accept only the configured `CLIENT_URL` origin(s).
- **Rate limiting** on login and register (per IP; `trust proxy` is set for the nginx hop).
- Zod validation on every body and query. JSON bodies are capped at 100 kB.
- Errors never expose stack traces, SQL or paths. Logs redact `authorization` headers, cookies, passwords and tokens.
- No secrets in git: `.env` files are ignored, compose refuses to start without secrets, and the API refuses to start without a strong `JWT_SECRET`.

## Testing

```bash
cd server && npm test     # needs PostgreSQL; see below
cd client && npm test
```

- **Server (Jest + Supertest, 64 tests).** Tests run against a real PostgreSQL database set by `TEST_DATABASE_URL`, by default `ops_dashboard_test` on `localhost:5433`. Create it once with `createdb` or `CREATE DATABASE ops_dashboard_test;`. Migrations are applied automatically, and tables are truncated between tests. As a safeguard, the suite refuses to run against a database whose name does not contain `test`. Covered: registration, login, rate limiting, auth middleware, role authorization (including that refused requests change nothing), dashboard figures, orders, events, system status, validation, error responses, CORS and headers, and Socket.IO authentication, rejection and broadcasts.
- **Client (Vitest + React Testing Library, 27 tests).** Covered: the login form, protected routes and roles, dashboard rendering, the error state with retry, live updates from a fake socket, resync after reconnect, listener cleanup, the connection-state machine (Live → Reconnecting → Offline → Live, sign-out on Unauthorized), and the reducer's feed cap and de-duplication.

The tests target behaviour rather than a coverage percentage.

## Docker

| Service | Image | Role |
| --- | --- | --- |
| `db` | `postgres:16-alpine` | Data, persisted in the `pgdata` volume |
| `api` | `server/Dockerfile` (multi-stage, non-root `node` user) | Runs `prisma migrate deploy`, then the API with a health check |
| `web` | `client/Dockerfile` (Vite build, served by nginx) | Serves the SPA and proxies `/api` and `/socket.io` (with WebSocket upgrade) to `api` |

Only `web` (8080) and `db` (5433, for local tooling) are published; the API is reachable only through nginx.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to `master`/`main` and on every pull request:

- **server**: `npm ci` → lint → typecheck → test (against a PostgreSQL service container) → build
- **client**: `npm ci` → lint → typecheck → test → build
- **docker**: builds the compose images once both jobs pass

## Design decisions and limitations

- **Single API instance.** Presence and Socket.IO fan-out live in process memory. Running several instances would need a shared Socket.IO adapter; that complexity isn't needed until there's a scaling requirement.
- **Token storage.** The JWT is kept in `localStorage` and sent as a bearer token, which keeps REST and socket authentication identical and avoids CSRF handling. The trade-off is exposure if an XSS bug existed. It is mitigated by React's escaping, a strict CSP and short token lifetimes. An httpOnly cookie session would be the next step if requirements tighten.
- **"Today" is the UTC day** for all summary figures, so every viewer sees the same numbers.
- **Summary recomputation.** The summary is recomputed with three indexed aggregate queries after each relevant change, which is cheap at this scale.
- **Search** uses a case-insensitive `contains` on customer names, which cannot use a B-tree index. A `pg_trgm` index would be the fix if the orders table grows large.
- **Dependency audit.** `npm audit` reports an advisory in `deepmerge-ts`, a dependency of the Prisma CLI's config loader. It is used only when running migrations, not in request handling. The fix requires a Prisma major-version upgrade.
