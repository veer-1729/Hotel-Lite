# Hotel Lite

Deployable hotel/travel reservation application used as the **fake customer app** in the EvalGym incident-gym program. Built on the [Vercel Next.js Postgres/Auth/Tailwind template](https://github.com/vercel/nextjs-postgres-nextauth-tailwindcss-template).

**Companion repo:** [simple_eval](../simple_eval/) — workloads, controlled incident scenarios, and operator docs. Run traffic and exercises from there; this repo is the app only.

For a full cross-repo architecture map, see [REPO_MAP.md](../REPO_MAP.md).

## What this repo contains

- **Next.js 15** app with hotel search, rates, reservations, and mock payments
- **Postgres + Drizzle** persistence (or `USE_MOCK_DATA` in-memory fallback)
- **Auth.js (GitHub)** for session-protected booking
- **Structured JSON logs** and `x-request-id` on every API response (lab observability for Vercel)

**Not in this repo:** scenario definitions, workload generators, evaluator, RCA product code. Those live in **simple_eval**.

## Quick start

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

| Variable | Required (real mode) | Notes |
|----------|----------------------|--------|
| `POSTGRES_URL` | Yes | Vercel Postgres or Neon |
| `AUTH_SECRET` | Yes | [Generate](https://generate-secret.vercel.app/32) |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth app |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth app |
| `NEXTAUTH_URL` | Yes | See below |
| `USE_MOCK_DATA` | No | Set `true` for local in-memory fallback only |

#### `NEXTAUTH_URL`

- **Local dev:** `http://localhost:3000`
- **Vercel:** `https://<your-project>.vercel.app` (no trailing slash)

GitHub OAuth callback:

```text
{NEXTAUTH_URL}/api/auth/callback/github
```

On Vercel: Project Settings → Environment Variables, or `vercel env pull`.

### 3. Database migrate + seed

```bash
npm run db:migrate
curl -X POST http://localhost:3000/api/seed
```

`POST /api/seed` is disabled in production.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in via GitHub to book at `/reservations`.

```bash
npm run build
npm start
```

## Mock fallback (local only)

```bash
# .env
USE_MOCK_DATA=true
```

Health returns `mockMode: true`; database and auth checks are skipped. Reservations are in-memory only.

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | App + DB + auth config status |
| GET | `/api/search` | No | Search hotels |
| GET | `/api/recommendations` | No | Recommended hotels |
| GET | `/api/rates` | No | Rate quote |
| GET | `/api/reservations` | **Yes** | List current user's reservations |
| POST | `/api/reservations` | **Yes** | Create reservation |
| POST | `/api/payments` | **Yes** (DB mode) | Mock charge; verifies reservation ownership |
| POST | `/api/seed` | No | Seed hotels (non-production only) |

Protected routes call `auth()` in the handler (middleware allows `/api/*` through).

### Lab-only: `x-request-id`

Every hotel API response includes `x-request-id` matching structured logs.

```bash
curl -i -H 'x-request-id: lab-test-1' 'http://localhost:3000/api/search?city=Paris'
```

### Mock payment decline

Use card last four `0000`.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migration from schema |
| `npm run db:migrate` | Apply migrations |

Workload scripts under `scripts/` are legacy copies; prefer running workloads from **simple_eval** against your deployed `BASE_URL`.

## Pages

| Path | Description |
|------|-------------|
| `/` | Home |
| `/search` | Hotel search |
| `/reservations` | Book (requires sign-in) |
| `/login` | GitHub sign-in |
| `/products` | Original Vercel template admin dashboard |

## Project layout

```
app/              # Routes and API handlers
lib/domain/       # Business logic (hotels, rates, reservations, payments)
lib/db/           # Drizzle schema, queries, seed catalog
lib/api/          # Observability wrapper, session guards
lib/observability/# Structured logging and spans
lib/config/       # Env validation
drizzle/          # SQL migrations
components/       # UI primitives and auth nav
```

## Observability

API routes log single-line JSON to stdout (`request_id`, `route`, `operation`, `status_code`, `latency_ms`). Domain spans emit `span.start` / `span.end`. Vercel Runtime Logs are the primary surface for incident exercises.

## Incident exercises

Controlled faults are **not** defined here. Scenario specs, workload commands, and branch discipline live in **[simple_eval](../simple_eval/)**. Introduce bad code on `scenario/<scenario_id>` branches in this repo, deploy to Vercel, run workloads from simple_eval, then roll back `main`.

## Verify persistence (DB mode)

1. Sign in, create a reservation at `/reservations`
2. `GET /api/reservations` returns your booking
3. Restart `npm run dev`
4. Booking still present
