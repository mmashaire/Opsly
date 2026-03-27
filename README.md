# Opsly

Opsly is a TypeScript monorepo for a realistic warehouse and inventory operations system. It currently runs as a local web application with an Express API in `apps/api`, a React/Vite frontend in `apps/web`, and a shared TypeScript contract package in `packages/shared`.

The project is meant to feel like a believable internal tool for a warehouse, distributor, or logistics operation. The focus is practical operations software: stock visibility, movement history, low-stock pressure, investigation workflows, and safe, reviewable engineering choices.

## What Is Implemented

### Backend

- Item catalog basics: create, list, fetch by id
- Stock adjustments with reason codes and inventory guardrails
- Inbound receipts that increase stock
- Outbound picks that decrease stock
- Reorder-threshold updates without recreating items
- Per-item movement history
- Per-item audit feed with cursor-style pagination metadata
- Low-stock alert reporting from reorder thresholds
- Inventory mismatch investigation summary with ranking and filters
- Operations dashboard summary for inventory health and recent activity
- API status route at `/` and health check at `/health`
- Structured request validation with Zod for payloads and query params
- Request tracing with `x-request-id`
- Structured request logging with request id, auth source, role, and duration
- Strict browser-origin allowlist via `OPSLY_ALLOWED_ORIGINS`
- Optional persistence backend toggle: in-memory or PostgreSQL

### Authorization And Access Control

- Admin-only writes for item creation, adjustments, receipts, picks, and reorder-threshold updates
- Admin-only reads for sensitive analytics and audit endpoints:
  - `/items/:itemId/audit`
  - `/investigations/inventory-mismatch`
  - `/dashboard/operations-summary`
- Bearer-token auth as the secure runtime default
- Explicit local demo mode for `x-opsly-role` via `OPSLY_AUTH_MODE=role-header`
- Auth source surfaced in response headers for easier debugging

### Frontend

- Dashboard-first warehouse operations UI in `apps/web`
- Live inventory health view backed by the API
- Low-stock watchlist for replenishment pressure
- Inventory mismatch investigation table for adjustment-driven risk
- Item inventory table for current operational visibility
- Item detail page with full movement history and audit timeline
- Client-side routing between dashboard and item detail pages
- Loading, not-found, and error states for dashboard and item-detail flows
- Environment-driven API base URL and auth configuration
- Frontend support for either role-header demo auth or bearer-token auth

### Shared Contracts

- Shared TypeScript types for items, roles, movements, investigations, dashboard summaries, and audit responses
- Single contract layer used by both backend and frontend to reduce type drift

### Quality And Tooling

- Workspace build/test flow with pnpm workspaces
- Backend coverage for health, auth, low-stock alerts, adjustments, receipts, picks, audit history, reorder-threshold updates, dashboard summaries, and mismatch investigations
- ESLint and Prettier wired at the workspace level
- GitHub Actions CI for build and test verification

## API Surface

Current API routes:

- `GET /` - API status payload
- `GET /health` - health check
- `GET /items` - list items
- `GET /items/:itemId` - fetch one item
- `POST /items` - create item (admin)
- `PATCH /items/:itemId` - update reorder threshold (admin)
- `POST /items/:itemId/adjustments` - create stock adjustment (admin)
- `POST /items/:itemId/receipts` - receive stock (admin)
- `POST /items/:itemId/picks` - pick stock (admin)
- `GET /items/:itemId/movements` - list movement history
- `GET /items/:itemId/audit` - list audit events (admin)
- `GET /alerts/low-stock` - low-stock watchlist
- `GET /dashboard/operations-summary` - operations summary (admin)
- `GET /investigations/inventory-mismatch` - ranked mismatch candidates (admin)

## Project Structure

```text
apps/
	api/
		.env.example
		package.json
		src/
			data/
			domain/
			middleware/
			index.ts
			server.ts
		test/
	web/
		.env.example
		package.json
		src/
			api.ts
			App.tsx
			Dashboard.tsx
			ItemDetail.tsx
			main.tsx
packages/
	shared/
		package.json
		src/
```

## Tech Stack

- TypeScript
- Node.js
- Express
- React 19
- React Router
- Vite
- pnpm workspaces
- PostgreSQL as an optional persistence backend
- Zod
- Vitest
- Supertest
- dotenv
- ESLint
- Prettier

## Run Locally

Install dependencies:

```powershell
pnpm install
```

Run the API only:

```powershell
pnpm --filter @opsly/api dev
```

Run the frontend only:

```powershell
pnpm --filter @opsly/web dev
```

Run both apps in parallel from the workspace root:

```powershell
pnpm dev
```

Run the workspace build:

```powershell
pnpm build
```

Run backend tests:

```powershell
pnpm --filter @opsly/api test
```

Run workspace linting:

```powershell
pnpm lint
```

Check formatting:

```powershell
pnpm format:check
```

## Local Environment Setup

### API Demo Setup

The frontend calls the API from the browser, so the API must explicitly allow the frontend origin.

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Set `OPSLY_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174`.
3. For browser demo mode, set `OPSLY_AUTH_MODE=role-header`.
4. Leave `OPSLY_DATA_BACKEND=memory` for the default in-memory experience.

### Frontend Demo Setup

1. Copy `apps/web/.env.example` to `apps/web/.env`.
2. Set `VITE_API_BASE_URL=http://localhost:3000`.
3. Choose one auth option:
   - Demo role-header mode: set `VITE_API_ROLE=admin`
   - Bearer-token mode: set `VITE_API_TOKEN=<admin-token>` and omit `VITE_API_ROLE`

This keeps browser access explicit and avoids permissive default CORS behavior.

## Optional: PostgreSQL Backend

Set environment variables before running the API:

```powershell
$env:OPSLY_DATA_BACKEND="postgres"
$env:DATABASE_URL="postgres://user:password@localhost:5432/opsly"
pnpm --filter @opsly/api dev
```

If `OPSLY_DATA_BACKEND` is unset or set to `memory`, Opsly uses in-memory persistence.

## Optional: Bearer Token Auth

Configure tokens:

```powershell
$env:OPSLY_ADMIN_TOKEN="opsly-admin-dev-token"
$env:OPSLY_VIEWER_TOKEN="opsly-viewer-dev-token"
```

Write endpoints require an admin role. Example header:

```text
Authorization: Bearer <admin-token>
```

In browser-based local demo mode, `x-opsly-role` is accepted only when the API is explicitly configured with `OPSLY_AUTH_MODE=role-header`.

## Testing And Quality

Current automated backend coverage includes:

- Authorization behavior
- Health and status endpoints
- Low-stock alerts
- Stock adjustments
- Stock receipts
- Stock picks
- Reorder-threshold updates
- Item audit history
- Inventory mismatch investigation summary
- Operations dashboard summary

The backend test suite currently passes with 98 tests.

## Current Focus

Recently completed:

- Item detail page with movement history and audit timeline
- Client-side routing for dashboard and item-detail views
- Shared audit event types promoted into the shared package
- Local runtime fixes for frontend/API connectivity and env loading
- API root response for easier local verification
- Auth hardening with secure bearer-only runtime default and explicit demo-mode opt-in

Next priorities:

- Stock action forms in the frontend for receipts, picks, and adjustments
- Location/bin-level inventory tracking instead of item-level stock only
- Formal auth/access matrix documentation for endpoint policies
- Role-based UI visibility for admin-only functionality
- Cleaner repository boundaries for persistence implementations
