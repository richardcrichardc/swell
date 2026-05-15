# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start client (Vite :5173) and server (Express :3001) concurrently
npm run dev:client   # Client only
npm run dev:server   # Server only (tsx watch)
npm test             # Run Vitest in watch mode
npm run test:run     # Single test run
npm run coverage     # Coverage report
npm run build        # Production build
npm start            # Run production server

npm run db:push      # Push schema changes to SQLite (dev)
npm run db:generate  # Generate Drizzle migration files
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio UI
```

## Architecture

**Monorepo layout:** `/src` (React client), `/server` (Express backend), `/shared` (shared types/utilities), `/data` (runtime SQLite files — gitignored).

**Two-database design:** There is one main SQLite database (`./data/swell.db`) managed by Drizzle ORM that holds users and books metadata. Each book also gets its own SQLite database (`./data/books/book{id}.db`) managed directly via better-sqlite3, containing `account`, `transaction`, `line`, and `kvp` tables. Connections are cached in `server/src/db/bookDb.ts`.

**API layer:** tRPC 11 mounts at `/trpc`. The Vite dev server proxies `/trpc` to `:3001`. All procedures are defined in `server/src/router.ts` (root) and `server/src/books.ts` (books sub-router). Protected procedures extract a JWT from the `Authorization: Bearer` header and resolve it to a user via middleware in `server/src/trpc.ts`.

**Auth:** JWT (HS256, 30-day expiry) via the `jose` library. Passwords hashed with scrypt + random salt. The token and user object are persisted to `localStorage` via Zustand (`src/store/useAuthStore.ts`) and injected into every tRPC request via `httpBatchLink`.

**Frontend routing:** React Router 7 with nested routes — `/books/:bookId/*` renders `BookLayout` (sidebar nav) wrapping Dashboard, Chart of Accounts, and Journal pages.

**Amounts:** All monetary amounts are stored as integer cents. The `AccountTypeSign` in `shared/accounts.ts` defines the debit-positive/credit-negative convention: Assets and Expenses are `+1`; Liabilities, Income, and Equity are `-1`.

**Wave import:** `server/src/waveImport.ts` parses Wave Accounting CSV exports, validates account types and transaction balance, and populates a new book's database. The `/wave-export` directory contains sample CSVs for testing.

## Key files

| Path | Purpose |
|------|---------|
| `server/src/db/schema.ts` | Main DB schema (users, books) |
| `server/src/db/bookDb.ts` | Per-book DB schema + connection cache |
| `server/src/router.ts` | tRPC root router |
| `server/src/books.ts` | Books sub-router (accounts, journal, import) |
| `server/src/trpc.ts` | tRPC context, protected procedure middleware |
| `shared/accounts.ts` | AccountType enum, labels, debit/credit sign convention |
| `src/lib/trpc.ts` | tRPC client with auth header injection |
| `src/store/useAuthStore.ts` | Zustand auth store (persisted to localStorage) |

## Code style

Prettier enforces: no semicolons, single quotes, 100-char line width, trailing commas, 2-space indent.
