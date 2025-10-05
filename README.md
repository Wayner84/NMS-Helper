# No Man's Sky Helper – Static PWA

A fully static, offline-ready helper for **No Man's Sky** designed for GitHub Pages. The app ships recipe calculators, portal directories, and resource tracking tools that work without a backend once cached by the service worker.

## Features

- **Refiner** – three-slot refiner calculator with value/hour estimates and chain suggestions up to depth three.
- **Crafting** – component tree viewer with have/need tracking, collapsible sub-recipes, and a copyable shopping list.
- **Cooking** – ingredient ➜ dish explorer with heat/refine/mix flags and quick filtering.
- **Planner** – tech layout editor with adjacency scoring, supercharged slot handling, greedy + stochastic optimisation, and IndexedDB persistence.
- **Portals** – centre-adjacent portal glyph directory with glyph visualisation, share/copy, filters, and local submission workflow.
- **Hints** – curated gameplay tips with tag filters, local editing, import/export, and validation.
- **Notes** – hierarchical systems/planets/bases tracker with resource chips, bulk tagging, quick-pick resources, and JSON import/export.

### Refiner Planner Modes

- **Strict Mode (default)** – uses the locked canonical refiner recipes without expanding intermediate materials. Plans surface a single step with the scaled canonical inputs.
- **Synthesis Mode** – opt-in depth-limited expansions (≤ 2) that only traverse categories already present in the target recipe. The UI annotates each step with its depth and synthesis justification.

## Tech Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Zustand](https://github.com/pmndrs/zustand) for state management
- [idb](https://github.com/jakearchibald/idb) for IndexedDB persistence
- [@tanstack/react-virtual](https://tanstack.com/virtual) for list virtualisation
- Service worker + manifest for PWA/offline support

## Getting Started

```bash
npm install
npm run dev
```

Vite serves the SPA at `http://localhost:5173/`. The Pages-ready base path is `/NMS-Helper/` and is configured in `vite.config.ts`.

### Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type check and produce production build |
| `npm run preview` | Preview built output |
| `npm run test` | Run Vitest unit suite |
| `npm run test:watch` | Watch mode for unit tests |
| `npm run test:e2e` | Execute Playwright e2e tests |
| `npm run validate:data` | Validate JSON datasets |
| `npm run lint` | Run ESLint (project uses recommended configs) |

## Data Schema

Seed data lives in [`src/data/`](src/data):

- `items.json` – base items with `id`, `name`, `group`, `value`.
- `refiner.json` – `inputs[]`, `output`, and `timeSeconds`.
- `recipes_canonical.json` – locked canonical refiner dataset powering Strict/Synthesis modes.
- `item_categories.json` – item id → category map used for synthesis guards.
- `overrides.json` – runtime patches or replacements for canonical recipes.
- `crafting.json` – nested component tree; components can reference other recipes via `viaRecipe`.
- `cooking.json` – inputs ➜ output with method flags (`heated`, `refined`, `mixed`).
- `tech.json` – module metadata, adjacency weights, and supercharge multipliers.
- `portals.json` – centre-adjacent addresses with tags, notes, and optional links.
- `hints.json` – curated gameplay tips with optional attribution.
- `resources.json` – quick-pick resource taxonomy and alias map.

Run `npm run validate:data` to check referential integrity, hint length, and portal address formatting before committing dataset changes.

## Persistence & Storage

- Hints, planner layouts, notes, and local portal contributions persist via IndexedDB (`idb` wrapper).
- Import/export modals enable manual backup of JSON collections.
- Service worker (`public/sw.js`) caches the app shell and runtime resources to enable offline usage after the first visit.

## Testing

- **Unit** (`vitest`): core algorithms including refiner chain generation, planner scoring, glyph mapping, and JSON validation helpers.
- **E2E** (`@playwright/test`): navigation, copy/share actions, notes CRUD, tag filtering, and PWA installability smoke tests.

## Accessibility & UX

- Tabbed navigation with roving tabindex for keyboard support.
- Large (≥44px) interactive targets and high-contrast dark theme (WCAG AA).
- Virtualised portal/hint/note lists keep scrolling smooth with large datasets.

## Deployment

1. Build with `npm run build`.
2. Copy `dist/index.html` to `dist/404.html` for SPA fallback.
3. Deploy the `dist` folder to GitHub Pages (automation provided in `.github/workflows/deploy.yml`).

## Contributing

1. Fork and clone the repository.
2. Create a feature branch.
3. Update data/logic and run `npm run validate:data`, unit tests, and e2e tests.
4. Include screenshots (mobile + desktop) in `docs/` for UI changes.
5. Submit a pull request summarising changes and tests.

Community PRs for new hints, portal addresses, recipes, or planner tweaks are welcome—keep datasets concise and well-sourced.
