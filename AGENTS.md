# AGENTS.md – Roles, Responsibilities & Definitions of Done

This document describes the autonomous agents (or human roles) that collaborate to build and maintain the **No Man’s Sky Helper** static web app.

---

## Product Lead
**Mission:** Define scope, prioritize features, validate UX with players.  
**Backlog:** Refiner, Crafting, Cooking, Planner, **Portals**, **Hints**, **Notes**.  
**DoD:**
- Feature has clear user story and acceptance criteria.
- Mobile + desktop wireframes exist.
- Telemetry events defined (anonymous, client-side).

## Data Curator (Items/Recipes)
**Mission:** Maintain item/recipe/tech datasets.  
**Tasks:**
- Author JSON in `/src/data/` following schemas in README.
- Write data **validation script** (ts-node) that checks referential integrity (ids exist, quantities > 0, no cycles unless intended).
- Keep **changelogs** for additions/removals.
**DoD:**
- `npm run validate:data` passes.
- 100% of ids referenced resolve to items.
- Recipe graphs topologically sort or are flagged as loops intentionally.

## Portals Curator
**Mission:** Maintain **centre-adjacent** portal addresses per galaxy.  
**Tasks:**
- Keep `portals.json` with fields: `galaxyIndex`, `portal` (12-hex), `tags`, `systemCoords?`, `notes?`, `url?`.
- Validate addresses (format, glyph mapping) with a script.
- Tag by biome/traits (“lush”, “rich economy”, “activated indium”, etc.).
**DoD:**
- Validation script passes; no malformed addresses.
- Entries searchable by galaxy index and glyph pattern.
- At least one verified entry per early galaxies (if known).

## Hints Curator
**Mission:** Collect concise gameplay tips often missed.  
**Tasks:**
- Store tips in `hints.json` with `title`, `body`, `tags`, optional `sourceName` and `url`.
- Ensure wording is **original** (no long quotes) and keep tips < 280 chars when possible.
**DoD:**
- Lint script confirms length and required fields.
- Tips are categorized and searchable by tags.

## Notes Librarian
**Mission:** Ensure Notes & Resource Tracker is delightful.  
**Tasks:**
- Maintain `resources.json` quick-pick list and synonyms.
- Ensure list UI shows **resource chips** prominently.
- Validate import/export and migrations.
**DoD:**
- Bulk tagging operations tested.
- Large lists (1k+ entries) remain smooth via virtualization.

## Frontend Engineer
**Mission:** Implement UI, interactions, and algorithms.  
**Tasks:**
- Build pages: Refiner, Crafting, Cooking, Planner, **Portals**, **Hints**, **Notes**.
- Implement search/filter; virtualized lists.
- Planner adjacency scoring + layout optimizer (greedy + hill-climb).
- IndexedDB persistence, JSON import/export.
**DoD:**
- CI builds green; Lighthouse performance ≥ 90 mobile.
- Keyboard-only flows reachable; axe-core shows 0 critical issues.
- Unit tests for core algorithms ≥ 80% coverage.

## UI/UX Designer
**Mission:** Make it clear, fast, and delightful.  
**Tasks:**
- Dark-first theme; high-contrast colours.
- Responsive layouts, touch-friendly targets.
- Empty-state and error-state designs.
**DoD:**
- Passes WCAG 2.1 AA contrast checks.
- Critical flows tested on 360×640 and 1440×900.

## QA Engineer
**Mission:** Prevent regressions.  
**Tasks:**
- Author Playwright tests for routes and core flows.
- Snapshot tests for planner grid rendering and portal glyphs.
**DoD:**
- CI runs e2e on PR; red/green reports with artifacts.
- Core scenarios stable across Chromium/Firefox/WebKit.

## DevOps (Pages)
**Mission:** Ship to GitHub Pages.  
**Tasks:**
- Configure Vite `base`.
- Workflow `.github/workflows/deploy.yml` in README.
- Cache busting and 404 fallback for SPA routes.
**DoD:**
- Automatic deploys on `main` push.
- PWA install works; update toast on new build.

---

## Coding Standards
- TypeScript strict mode ON.
- No blocking network calls; everything is local/offline.
- Avoid game-proprietary assets; use generic icons or your own.

## Testing
- **Unit**: algorithms (adjacency, layout scoring, path suggestions, glyph mapping, tips lint).
- **e2e**: navigation, search, drag/drop, PWA offline, notes CRUD, portal copy/share.

## Telemetry (Optional, Privacy-First)
- Store client-only counts (no PII): feature usage, planner saves, notes count.
- Offer an Opt-out toggle (default: on-device only, no network).

