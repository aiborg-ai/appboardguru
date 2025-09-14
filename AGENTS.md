# Repository Guidelines

This guide helps contributors work effectively in this repository.

## Project Structure & Module Organization
- `src/app` – Next.js App Router pages, layouts, API routes (`api/*/route.ts`).
- `src/components`, `src/lib`, `src/hooks`, `src/styles` – UI, utilities, hooks, global styles.
- Feature slices: `src/01-shared` → `06-app` follow FSD-style layering.
- Tests: `src/__tests__`, `__tests__`, and `tests` (smoke/e2e). 
- Ops: `scripts` (CLIs, DB, diagnostics), `database`/`supabase` (SQL, policies), `docker`, `deployment`.

## Build, Test, and Development Commands
- `npm run dev` – Start local dev server.
- `npm run build` / `npm start` – Production build and run.
- `npm run lint` / `npm run type-check` – ESLint and TypeScript checks.
- `npm test` / `npm run test:coverage` – Jest unit/integration and coverage.
- `npm run vitest:run` – Vitest suites (see `vitest.*.config.ts`).
- `npm run e2e` – Playwright end‑to‑end tests.
- `npm run db:migrate` / `npm run db:rollback` – Supabase database migrations.

## Coding Style & Naming Conventions
- TypeScript throughout; 2‑space indentation, single quotes, semicolons per ESLint Next config.
- Components: PascalCase files and exports (e.g., `UserMenu.tsx`).
- Hooks start with `use` (e.g., `useOrg.ts`).
- Feature slice folders keep numeric prefix (`01-…` to `06-…`).
- Keep modules small and colocate tests next to code or under `src/__tests__`.

## Testing Guidelines
- Frameworks: Jest (default) and Vitest (new features); Playwright for E2E.
- Naming: `*.test.ts`/`*.test.tsx`; group by domain under `__tests__/`.
- Run locally: `npm test`, `npm run vitest:run`, `npm run e2e`.
- Aim for meaningful coverage on core flows; add snapshots sparingly.

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, etc. (history already uses `feat:`/`fix:`).
- PRs must include: clear description, linked issue(s), screenshots for UI, and migration notes when relevant.
- Before opening a PR: `npm run lint`, `npm run type-check`, `npm test`, and run E2E for affected areas.

## Security & Configuration Tips
- Environment variables: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
- Never commit secrets; use `vercel.json`, `.env.local`, or CI secrets.
- Use `npm run diagnose` scripts in `scripts/` for Supabase and policy checks when debugging.

