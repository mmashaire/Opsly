# Opsly

Opsly is a backend-first TypeScript monorepo for a realistic warehouse and inventory operations system.

The goal is to model day-to-day warehouse workflows in software with clear business rules, predictable behavior, and practical engineering choices.

## What Is Implemented

Current backend capabilities include:

- Item catalog basics: create, list, fetch by id
- Stock adjustments with reason codes and guardrails
- Inbound receipts (stock increases)
- Outbound picks (stock decreases)
- Per-item movement history
- Low-stock alerts using per-item reorder thresholds
- Reorder-threshold updates without recreating items
- Request tracing with `x-request-id`
- Structured request logging (including role + auth source metadata)
- Role-based authorization on write endpoints (`admin` required)
- Bearer-token role resolution (`admin` / `viewer`) with header fallback
- Optional persistence backend toggle: in-memory or PostgreSQL

## Project Structure

```text
apps/
	api/
		src/
			data/
			domain/
			middleware/
			index.ts
			server.ts
		test/
packages/
	shared/
```

## Tech Stack

- TypeScript
- Node.js
- Express
- pnpm workspaces
- PostgreSQL (optional backend)
- Zod
- Vitest
- Supertest

## Run Locally

Install dependencies:

```powershell
pnpm install
```

Run API (default in-memory mode):

```powershell
pnpm --filter api run dev
```

Run tests:

```powershell
pnpm --filter api run test
```

## Optional: PostgreSQL Backend

Set environment variables before running the API:

```powershell
$env:OPSLY_DATA_BACKEND="postgres"
$env:DATABASE_URL="postgres://user:password@localhost:5432/opsly"
pnpm --filter api run dev
```

If `OPSLY_DATA_BACKEND` is unset (or set to `memory`), Opsly uses in-memory persistence.

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

## Current Focus

Next backend priorities:

- Add audit-event records for stock-changing operations
- Improve repository boundaries for cleaner persistence implementations
- Expand test depth around persistence and auth edge cases
- Add CI checks for lint/test/build
