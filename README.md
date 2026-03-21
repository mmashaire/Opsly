# Opsly

Opsly is a backend-first TypeScript monorepo for a realistic **Warehouse / Inventory Operations** system.

The project is being built as a portfolio piece to demonstrate practical software engineering ability through a structured backend codebase rather than toy examples.

## Purpose

Opsly exists to showcase:

- backend engineering skills
- TypeScript proficiency
- monorepo/workspace setup
- API design
- validation and type safety
- testing
- maintainable project structure
- step-by-step engineering growth

The aim is to make the repository credible to recruiters, hiring managers, and engineers reviewing it for software engineering or IT roles.

## Current State

Implemented so far:

- pnpm workspace monorepo
- `apps/api` Express + TypeScript backend
- `packages/shared` shared TypeScript package
- health endpoint
- initial item domain
- validation with Zod
- in-memory data layer
- basic integration testing with Vitest and Supertest

## Architecture

Current API structure:

```text
apps/api/src
├── domain
├── data
├── routes
├── app.ts
└── server.ts
```

This separation is intentional:

- `domain/` contains business logic
- `data/` contains storage concerns
- `routes/` contains HTTP layer concerns

## Product Direction

Opsly is evolving into an internal operations backend for warehouse and inventory management, with future support for:

- items and stock management
- stock movements
- user roles and permissions
- workflow/task handling
- audit logging
- repository abstractions
- database persistence

## Tech Stack

- TypeScript
- Node.js
- Express
- pnpm workspaces
- Zod
- Vitest
- Supertest

## Running the Project

Install dependencies:

```powershell
pnpm install
```

Run the API:

```powershell
pnpm --filter api run dev
```

Run tests:

```powershell
pnpm --filter api run test
```

## Near-Term Goals

- add `GET /items/:id`
- improve error handling and API response consistency
- introduce repository interfaces
- add stock movement rules
- expand test coverage
- improve repo hygiene and developer experience

## Why This Matters

This project is intended to show the ability to:

- build a real backend foundation
- troubleshoot TypeScript and workspace issues
- structure code cleanly
- make practical engineering tradeoffs
- grow a codebase deliberately