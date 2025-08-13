# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` with Next.js App Router (`src/app`), UI in `src/components`, utilities in `src/lib`, types in `src/types`.
- Config: `next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`, `.eslintrc.json`.
- Data: SQL and migrations in project root (e.g., `db.sql`, `migration_supplier_eksklusif.sql`).
- Env: `.env.local` for local secrets; see `.env.local.example`.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server at `http://localhost:3000`.
- `npm run build`: Compile production build.
- `npm start`: Run the production server locally.
- `npm run lint`: Lint code using Next.js ESLint config.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`); path alias `@/*` → `src/*`.
- Components: React function components; file names `PascalCase.tsx` in `src/components/*`.
- Modules/helpers: `camelCase.ts` in `src/lib/*`.
- Indentation: 2 spaces; prefer named exports.
- Styling: Tailwind CSS; keep global styles in `src/app/globals.css`.
- Linting: Extends `next/core-web-vitals`; run `npm run lint` before PRs.

## Testing Guidelines
- Automated tests are not configured in this repo. If you add tests:
  - Place unit tests alongside files or under `src/__tests__`.
  - Name files `*.test.ts`/`*.test.tsx`.
  - Add scripts (e.g., Jest or Vitest) in `package.json` and document usage.
- Until then, provide clear manual test steps in PRs.

## Commit & Pull Request Guidelines
- Commits: Keep messages short and imperative (examples from history: "bahan baku", "menu", "build pagi").
  - Prefer adding scope for clarity, e.g., `feat: bahan-baku table`.
- Branches: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
- PRs: Include purpose, screenshots for UI changes, env/config notes, and any DB migration impacts (e.g., updates to `db.sql`). Link issues when applicable.
- Quality gates: CI not configured; run app locally, self-review diffs, and pass `npm run lint` before requesting review.

## Security & Configuration Tips
- Supabase: Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
- Secrets: Never commit `.env.local` or keys; use `.env.local.example` to document required vars.
- Images/domains and server actions are configured in `next.config.mjs`; update cautiously and test both dev and Vercel environments.

