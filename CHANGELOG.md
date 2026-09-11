# Changelog

## 0.2.0 — Cosmos data and correctness update

- Updated from the source's No Man's Sky 7.00 extraction, reviewed as compatible through patch 7.01.
- Replaced the blocked Fandom Cargo synchronizer with the current `bradhave94/nms` data export.
- Updated refining recipes from 357 to 361, including the four Cosmos conversions.
- Updated Nutrient Processor recipes from 1,232 to 1,323.
- Added source commit and generation metadata to the app footer.
- Fixed Cooking search so output dish names are searchable and shown as card titles.
- Removed cooking-method filters whose source flags were not populated.
- Fixed duplicate React keys for recipes with repeated generalized ingredients.
- Added an explicit warning that Planner scoring and optimisation are experimental.
- Fixed the Notes dialog's mobile/short-viewport scrolling and accessible name.
- Fixed Playwright server isolation and Notes flow selectors.
- Added data validation, unit tests and lint to the deployment quality gate.
- Added hydration fallback when browser storage cannot be opened.
- Removed invalid nested Planner buttons and updated `nanoid`; production dependency audit is clean.
