# Hotel Lite

Healthy baseline hotel/travel reservation app for future RCA incident-gym evaluation. Built on the [Vercel Next.js Postgres/Auth/Tailwind template](https://github.com/vercel/nextjs-postgres-nextauth-tailwindcss-template).

## Milestone 1B (current)

Realistic Vercel baseline with **Postgres + Drizzle**, **Auth.js (GitHub)**, runtime config validation, and structured observability.

- Search / recommendations / rates from database (or mock fallback)
- Session-required reservations persisted in Postgres
- Session-required mock payments in DB mode (ownership verified)
- Health checks: app, database, auth config
- Structured JSON logs + `x-request-id` on every API response (lab app)

**Still out of scope:** scenario engine, evaluator, Datadog, Railway, Docker, Kubernetes, real payment providers, MCP.

## Quick start (real baseline)

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

Auth.js uses this as the canonical app URL.

- **Local dev:** `http://localhost:3000`
- **Vercel:** `https://<your-project>.vercel.app` (match the deployment URL, no trailing slash)

Set the GitHub OAuth **callback URL** to:

```text
{NEXTAUTH_URL}/api/auth/callback/github
```

On Vercel, add the same env vars in Project Settings → Environment Variables, or run:

```bash
vercel env pull
```

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

For UI/API exploration without Postgres or OAuth:

```bash
# .env
USE_MOCK_DATA=true
```

Then `npm run dev`. Health returns `mockMode: true` with database/auth checks **skipped**. Reservations are in-memory only.

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

Protected API routes enforce `auth()` inside the handler (middleware allows `/api/*` through).

### Lab-only: `x-request-id`

Every hotel API response includes `x-request-id` matching structured logs. Intentional for this lab — not a production norm.

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
| `npm run workload` | Run external traffic generator (`BASE_URL` required) |
| `npm run auth:save-state` | Save Playwright auth after manual GitHub login |
| `npm run workload:auth` | Run authenticated booking workload (`BASE_URL` + `.auth/user.json`) |

## Verify persistence (DB mode)

1. Sign in, create a reservation at `/reservations`
2. `curl -b cookies.txt -c cookies.txt http://localhost:3000/api/reservations` (after browser login, or use browser devtools)
3. Restart `npm run dev`
4. `GET /api/reservations` still returns your booking

## Preserved template routes

- `/login` — GitHub sign-in
- `/products` — Original admin dashboard (requires `POSTGRES_URL` + products table)

## Observability

API routes log single-line JSON to stdout (`request_id`, `route`, `operation`, `status_code`, `latency_ms`). Domain spans emit `span.start` / `span.end`.

## Milestone 2: Workload generator

Generate steady external traffic against a deployed URL so Vercel Runtime Logs and (later) alerts have something to observe.

### Prerequisites

- App deployed (e.g. `https://simple-eval-sand.vercel.app`)
- Database seeded on that deployment if using real mode (`POST /api/seed` in non-production only; seed production via migrate + one-time seed as appropriate)

### Run workload

```bash
BASE_URL=https://simple-eval-sand.vercel.app npm run workload
```

Optional env vars:

| Variable | Default | Description |
|----------|---------|-------------|
| `DURATION_SECONDS` | `60` | How long to run |
| `CONCURRENCY` | `1` | Parallel workers |
| `REQUEST_DELAY_MS` | `100` | Pause between requests per worker |
| `FLOW` | `public_browse` | `public_browse` hits health, search, recommendations, rates |
| `TARGET_ENDPOINT` | — | If set, repeat only that path (e.g. `/api/rates`) |
| `WRITE_DEBUG_LOG` | `true` | Write `evidence/runs/<run_id>/workload_debug.jsonl` |

Examples:

```bash
BASE_URL=https://simple-eval-sand.vercel.app DURATION_SECONDS=120 CONCURRENCY=2 npm run workload
BASE_URL=https://simple-eval-sand.vercel.app TARGET_ENDPOINT=/api/rates npm run workload
BASE_URL=https://simple-eval-sand.vercel.app REQUEST_DELAY_MS=250 npm run workload
```

### Verify

1. Console prints a summary: totals, error rate, p50/p95 latency.
2. Vercel **Runtime Logs** show `/api/health`, `/api/search`, etc., with `User-Agent: incident-gym-workload/0.1` and matching `request_id` in JSON logs.
3. Optional: inspect `evidence/runs/<run_id>/workload_debug.jsonl` locally (gitignored).

### Vercel alerts

See [docs/vercel-alerting.md](docs/vercel-alerting.md) for wiring Vercel alert webhooks to the RCA product.

## Milestone 2B: Authenticated workload

Logged-in booking traffic (search → rates → reservation → mock payment) via Playwright. Use this to exercise auth + DB paths in Vercel Runtime Logs.

### Prerequisites

- Deployed app with DB seeded (`h1`–`h3` in catalog)
- GitHub OAuth configured on Vercel
- One-time: `npx playwright install chromium`

### Save auth state

Opens a **headed** browser for manual GitHub sign-in. Writes `.auth/user.json` (gitignored — local secret, do not commit).

```bash
BASE_URL=https://simple-eval-sand.vercel.app npm run auth:save-state
```

Optional: `AUTH_STATE_PATH` (default `.auth/user.json`).

### Run authenticated workload

```bash
BASE_URL=https://simple-eval-sand.vercel.app npm run workload:auth
```

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_STATE_PATH` | `.auth/user.json` | Playwright storage state |
| `DURATION_SECONDS` | `60` | Run duration |
| `CONCURRENCY` | `1` | Parallel browser contexts |
| `REQUEST_DELAY_MS_MIN` | `500` | Min pause between attempts (≥ 500) |
| `REQUEST_DELAY_MS_MAX` | `1500` | Max pause between attempts |
| `WRITE_DEBUG_LOG` | `false` | Write `evidence/runs/<run_id>/auth_workload_debug.jsonl` |

Booking inputs cycle deterministically: hotels `h1`–`h3`, guests 1–4, stay lengths 1–3 nights, seven fixed check-in dates (252 combinations, then repeat). Delay between attempts varies deterministically in the configured ms range.

Examples:

```bash
BASE_URL=https://simple-eval-sand.vercel.app DURATION_SECONDS=30 npm run workload:auth
BASE_URL=https://simple-eval-sand.vercel.app WRITE_DEBUG_LOG=true npm run workload:auth
BASE_URL=https://simple-eval-sand.vercel.app REQUEST_DELAY_MS_MIN=500 REQUEST_DELAY_MS_MAX=2000 npm run workload:auth
```

### Verify

1. Console summary: booking attempts, error rate, p50/p95.
2. Vercel Runtime Logs: `reservations.create`, `payments.charge`, `reservations.list` with `User-Agent: incident-gym-workload-auth/0.1`.
3. Re-run `auth:save-state` if you see session expired / 401.

Authenticated workload output is for Vercel observability only, not RCA agent input.

## Milestone 3: Controlled incident scenarios

Scenario **definitions** live on `main` under [`scenarios/`](scenarios/). **`main` stays healthy** — intentional faults are introduced later on branches named `scenario/<scenario_id>`, deployed to Vercel for exercises, then rolled back.

| Scenario | Branch (later) | Primary workload |
|----------|----------------|------------------|
| [rates-contract-regression](scenarios/rates-contract-regression/) | `scenario/rates-contract-regression` | `npm run workload:auth` |
| [payment-path-regression](scenarios/payment-path-regression/) | `scenario/payment-path-regression` | `npm run workload:auth` |
| [reservation-db-schema-mismatch](scenarios/reservation-db-schema-mismatch/) | `scenario/reservation-db-schema-mismatch` | `npm run workload:auth` |
| [auth-session-regression](scenarios/auth-session-regression/) | `scenario/auth-session-regression` | `npm run workload:auth` |
| [data-specific-booking-failure](scenarios/data-specific-booking-failure/) | `scenario/data-specific-booking-failure` | `npm run workload:auth` (60s+) |

- **Workload** generates traffic; **Vercel** emits real alerts ([docs/vercel-alerting.md](docs/vercel-alerting.md)).
- **RCA agent** uses Vercel + GitHub evidence only — not `scenarios/**/ground_truth.json` or workload debug files.
- Each scenario folder has `manifest.yaml`, `ground_truth.json` (harness), and an operational `README.md`.

See [`scenarios/README.md`](scenarios/README.md) for branch discipline and the operator workflow.
