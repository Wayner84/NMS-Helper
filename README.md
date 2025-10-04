# No Man’s Sky Helper – Refiner, Crafting, Cooking, Tech Planner + Portals, Hints & Notes (Static App)

A fully client-side (static) web app for GitHub Pages that lets you:
- **Refiner recipes** (1–3 inputs ➜ output, time, yield, value hr).
- **Crafting recipes** (components, totals, costs/values).
- **Cooking recipes** (ingredients, prepared foods, method tags).
- **Technology layout planner** (exosuit, multi-tool, starship, exocraft, freighter) with **inventory size** controls and **adjacency/supercharge** scoring.
- **Portal glyph browser** for **galaxies near the centre** (index **1…255+**) with visual **12‑glyph** rendering, address copy/share, and user-contributed additions.
- **Useful Hints**: a curated, searchable, taggable set of gameplay tips players commonly miss (with optional source attribution).
- **Notes & Resource Tracker**: record **base**, **planet**, and **system** notes; add **resources** to each entry; store **system coordinates**; filter and sort lists to quickly see *which base has what*.

Runs **offline as a PWA**, and scales nicely on **desktop and mobile**.


## Quick Start (Local)

```bash
# 1) Create app
npm create vite@latest nms-helper -- --template react-ts
cd nms-helper

# 2) Install UI and tooling
npm i
npm i -D tailwindcss postcss autoprefixer @types/lodash

# 3) Init Tailwind
npx tailwindcss init -p

# 4) Add dependencies you may want
npm i lodash zustand idb fuse.js

# 5) Dev
npm run dev
```

Configure Vite base for GitHub Pages in `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/<REPO_NAME>/', // <-- set to your repo name
})
```

Enable Tailwind in `index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```


## Deploy to GitHub Pages

Create `.github/workflows/deploy.yml`:
```yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: cp dist/index.html dist/404.html
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```


## Features & Requirements

### 1) Data & Search
- Ship with **seed JSON** for refiner, crafting, cooking, technology, **portals**, **hints**, and **notes resource taxonomy**.
- Global fuzzy **search** (Fuse.js) across names, categories, tags.
- **Filters** by rarity, value, source, input/output counts, platform, tag, etc.

### 2) Refiner Calculator
- 1–3 input slots, drag/drop items.
- Show **time**, **yield**, **value/hr**.
- **Multi-step chains** suggestion (e.g., refine A ➜ B ➜ C).

### 3) Crafting Browser
- Tree view of **components**; auto-calc **totals** and **cost**.
- Collapse/expand sub-components.
- “**Have / Need**” counters.

### 4) Cooking Explorer
- Ingredient ➜ prepared ➜ advanced dishes.
- Tag by **flavour**, **creature**, **harvest** source, **heat/refine/mix**.

### 5) Technology Planner
- Choose platform (Exosuit/Multi-tool/Starship/Exocraft/Freighter).
- Define **inventory size** (e.g., 8×6) & sub-grids (tech vs cargo, **supercharged** slots).
- Place **modules**; score **adjacency/synergy** automatically.
- Save/load **layouts** to local storage or IndexedDB.
- Export/import as JSON.

### 6) **Portal Glyphs – Near Galactic Centres**
- A dedicated page listing **galaxies 1…255+** with known **centre-adjacent** portal addresses.
- Render **12-glyph addresses** visually (0–F glyphs) with copy/share buttons.
- Allow **user submissions**: galaxy index, region/notes, portal address (12-hex), optional **vector coordinates** for the system.
- Search by **galaxy index**, **glyph pattern**, or **tags** (e.g., “near centre”, “lush”, “activated indium”).
- Disclaimer: data is community-sourced; some addresses can be out of date or mode-specific.

### 7) **Useful Hints** (Curated Tips)
- Browse a list of concise tips players commonly miss.
- Each tip: `title`, `body`, `tags`, optional `sourceName` and `url` for attribution.
- Categories: *economy*, *navigation*, *farming*, *combat*, *refiner*, *expeditions*, *freighter*, etc.
- Fully **offline**: tips stored in JSON; users can **add their own** and export/import.

### 8) **Notes & Resource Tracker** (Bases / Planets / Systems)
- Create entries at three levels: **System ➜ Planet ➜ Base** (hierarchical, but any can be standalone).
- Fields:
  - `name` (required)
  - `type` (`system` | `planet` | `base`)
  - `systemCoords` (optional string, e.g., “H:XXXX:X:XXXX:XXXX:XXXX”)
  - `galaxyIndex` (optional number)
  - `notes` (free text, markdown supported)
  - `resources` (**array of tags**, e.g., `["sulphurine","oxygen"]`)
  - `links` (optional array of {label,url})
- UI affordances:
  - **“Add Resource”** button with quick-pick chips (autocomplete + custom tags).
  - **Large list view** shows **resource chips** so it’s obvious which entry has what.
  - Filter list by resource tags (e.g., show all places with **Gravitino Balls**).
  - Bulk edit: add/remove the same tag across selected entries.
  - Import/Export JSON; data saved to IndexedDB.
- Sorting: by name, type, last updated, galaxy index.

### 9) PWA & Offline
- Installable; caches app shell + data JSON.
- “Update available” toast when a new version is published.

### 10) Accessibility & UX
- Keyboard-friendly drag/drop with roving tabindex.
- WCAG AA colour contrast; dark-first theme.
- Responsive grid; touch-friendly hit targets.
- List views with virtualization for large datasets.

### 11) Performance
- Virtualized lists for big data (tips, portal addresses).
- Pre-compute recipe graphs for quick pathfinding.
- Split data into chunks; lazy-load when opening section.


## Suggested Tech Stack

- **React + TypeScript** (Vite)  
- **State**: Zustand  
- **Storage**: localStorage + IndexedDB (`idb`)  
- **Styling**: Tailwind CSS  
- **Search**: Fuse.js (global + per-section)  
- **PWA**: Vite plugin or custom SW


## Data Schemas (Examples)

`/data/items.json`
```jsonc
[
  { "id": "ferrite_dust", "name": "Ferrite Dust", "type": "raw", "tags": ["mineral","common"], "unitValue": 14 }
]
```

`/data/refiner.json`
```jsonc
[
  { "id": "magnetised_ferrite_from_pure", "inputs": [{"item":"pure_ferrite","qty":2}], "output": {"item":"magnetised_ferrite","qty":1}, "time": 2.0 }
]
```

`/data/crafting.json`
```jsonc
[
  { "id": "microprocessor", "output": {"item":"microprocessor","qty":1}, "components": [{"item":"chromatic_metal","qty":40},{"item":"carbon_nanotubes","qty":1}] }
]
```

`/data/cooking.json`
```jsonc
[
  { "id": "mystery_meat_stew", "inputs": [{"item":"meaty_chunks","qty":1},{"item":"creamy_sauce","qty":1}], "output": {"item":"mystery_meat_stew","qty":1}, "appliesHeat": true }
]
```

`/data/tech.json`
```jsonc
[
  { "id": "pulse_engine", "platform": "starship", "slotType": "tech", "size": 1, "adjacency": { "pulse_engine": 0.05, "hyperdrive": 0.03 }, "superchargeBonus": 0.1, "limits": { "maxPerPlatform": 1 } }
]
```

`/data/portals.json`
```jsonc
[
  {
    "id": "euclid-centre-01",
    "galaxyIndex": 1,
    "region": "Near centre – lush",
    "portal": "10A2:0084:0C2B:0035",  // 12-hex (example placeholder)
    "glyphs": "🜂🜄…",                 // optional pre-rendered string; UI will render from hex
    "tags": ["near-centre","lush"],
    "systemCoords": "H:0005:00FF:0123:0ABC", // optional
    "notes": "Community-found address. Might vary by mode/updates."
  }
]
```

`/data/hints.json`
```jsonc
[
  {
    "id": "economy-scan-loop",
    "title": "Use the economy scanner to chain high-demand trade routes",
    "body": "Plot a loop of 3–4 systems with complementary economies...",
    "tags": ["economy","trading","navigation"],
    "sourceName": "Community tip",
    "url": "https://example.com/tip"  // optional, attribution only
  }
]
```

`/data/resources.json`
```jsonc
{
  "quickPick": [
    "oxygen","sulphurine","gravitino_balls","activated_indium",
    "frost_crystals","copper","paraffinium","sodium"
  ]
}
```


## Folder Structure

```
src/
  data/                # JSON datasets (items, recipes, tech, portals, hints, resources)
  lib/                 # algorithms & helpers
  components/
    search/
    refiner/
    crafting/
    cooking/
    planner/
    portals/
    hints/
    notes/
  pages/
    Refiner.tsx
    Crafting.tsx
    Cooking.tsx
    Planner.tsx
    Portals.tsx
    Hints.tsx
    Notes.tsx
  store/
  sw/                  # service worker
public/
  manifest.webmanifest
  icons/
```

## Algorithms (High Level)

- **Adjacency score**: sum of module-specific weights for orthogonal neighbours; multiply by supercharge factors where present.
- **Suggest layout**:
  - Greedy place highest-weight synergies near supercharged slots.
  - Local **hill-climb**: swap two tiles if score improves; repeat N iterations.
- **Portal glyph render**:
  - Parse 12-hex address → map nibbles (0–F) to glyphs (0–15).
  - Provide both text glyphs and accessible labels (e.g., “Sun, Bird, Face…”).
- **Notes filtering**: intersection/union queries over resource tags using Fuse.js index + set ops.

## Contributing

PRs welcome for data corrections, new recipes, portal addresses (centre-adjacent), new hints, and optimizations. Please submit changes as pull requests with:
- Updated JSON and a short rationale
- Tests for parsers/validators
- Screenshots for planner changes

**Attribution:** For hints and portal addresses, include a public link (if allowed) in the JSON `url` field. Keep tips concise and avoid copying long text verbatim.

## License

MIT. See `LICENSE`.
