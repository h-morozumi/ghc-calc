# AGENTS.md

Project conventions and technical guidance for contributors and AI coding agents working on **GitHub Copilot Cost Estimator**.

## Project overview

A client-side **what-if calculator** for GitHub Copilot Business & Enterprise licensing and AI Credit (usage-based billing) costs. It runs entirely in the browser, is deployed to **GitHub Pages**, and lets users share estimates via encoded URLs.

The product itself is described in [`README.md`](./README.md). This file is the source of truth for **how the project is built**.

## Tech stack

| Concern | Choice |
|---|---|
| UI framework | **React** |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** |
| Components | **shadcn/ui** |
| Package manager | **pnpm** (required — do not use npm or yarn) |
| Hosting | **GitHub Pages** |
| CI/CD | **GitHub Actions** |

## URL state

- Serialize estimate state as base64-encoded JSON appended as a query parameter (e.g., `?s=<base64>`).
- Include a schema version field (e.g., `v: 1`) in the serialized object.
- If deserialization fails or the version is unrecognized, silently reset to default state and do not throw.

## Architecture principles

- **Static, client-only.** No backend, no database, no server-side runtime. Everything must work as static assets served from GitHub Pages.
- **Prices as data, not code.** All pricing (seat prices, model rates, included AI Credits, Pre-Purchase Plan discount tiers) lives in **JSON** files so they can be audited and updated without touching application logic.
- **State in the URL.** Estimate scenarios are serialized into the URL so they can be shared as public links (à la the Azure Pricing Calculator). No external storage.
- **Extensible plans.** Phase 1 targets Copilot **Business** and **Enterprise**, but the data and calculation model must be designed so other plans (including individual tiers) can be added later.
- **Print-friendly.** A dedicated print/PDF layout is a first-class requirement, not an afterthought.

## Conventions

- Use **pnpm** for all dependency and script operations (`pnpm install`, `pnpm dev`, `pnpm build`).
- Add shadcn/ui components via the shadcn CLI rather than hand-copying, and keep them in `src/components/ui` (the shadcn/ui default for Vite/React projects).
- Keep pricing/config data in JSON; never hardcode monetary values in components.
- If a pricing entry referenced by the UI is missing from the JSON data files, the component must render a visible error state for that line item (e.g., "Price unavailable") rather than silently using 0 or crashing.
- Prefer TypeScript types/interfaces for all pricing and estimate data structures.
- The GitHub Pages base path must match the repository name (`/ghc-calc/`) — ensure the build is configured accordingly.

## Local development

```bash
pnpm install     # install dependencies
pnpm dev         # start the local dev server (http://localhost:5173/ghc-calc/)
pnpm build       # type-check (tsc -b) + produce the static production build
pnpm preview     # preview the production build locally
pnpm test        # run unit tests (Vitest)
```

## Testing

- Use **Vitest** for unit tests.
- Place test files alongside source files using the `.test.ts(x)` suffix.
- All pricing calculation functions must have unit tests.
- Run tests with `pnpm test`.

## Deployment

Deployment to **GitHub Pages** is automated via **GitHub Actions** on push to the default branch. The workflow builds the static site and publishes the artifact to Pages.

## Out of scope / non-goals

- No server-side components or APIs.
- No collection or transmission of user data / telemetry.
- Bundled prices are best-effort; this is an unofficial tool and not a billing system of record.
