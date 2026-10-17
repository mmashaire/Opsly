# Opsly

Opsly is a warehouse inventory app. It helps a team see stock, record stock changes, and review item history. It has a web app, an API, and shared data types.

## What it does

- Shows inventory, low-stock items, and recent activity.
- Records receipts, picks, and stock adjustments from an item page.
- Shows an item's movement and audit history.
- Highlights items that may need an inventory investigation.

Stock is tracked per item, not by warehouse location or bin.

## Run locally

You need Node.js 22 and pnpm 10. From the project folder, install dependencies and copy the example environment files:

```powershell
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

For a local demo, set these values in `apps/api/.env`:

```text
OPSLY_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
OPSLY_AUTH_MODE=role-header
OPSLY_SEED_DEMO_DATA=true
```

In `apps/web/.env`, set:

```text
VITE_API_BASE_URL=http://localhost:3000
VITE_API_ROLE=admin
```

Start both apps:

```powershell
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). Role-header authentication is for local demos only; the API uses bearer tokens by default.

## Data storage

The app uses temporary in-memory storage by default, so data resets when the API restarts. To use PostgreSQL, start a local PostgreSQL server and set `OPSLY_DATA_BACKEND=postgres` and `DATABASE_URL` in `apps/api/.env`.

## Checks

Run this before sharing a change:

```powershell
pnpm check
```

It checks types, lint, formatting, builds, and API tests.

## Project folders

- `apps/api` - API and inventory rules
- `apps/web` - browser app
- `packages/shared` - types used by both apps

The next major inventory step is tracking stock by location and bin.
