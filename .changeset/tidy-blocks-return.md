---
"@geoprotocol/geo-sdk": minor
---

**Breaking:** `TextBlock.make` and `DataBlock.make` now return `{ id, ops }` (a `CreateResult`, matching `createEntity` / `createRelation`) instead of a bare `Op[]`, so callers can reference the block they just created (views, columns, idempotent re-runs). They also accept an optional `id` param: pass a stable, deterministically derived id to make re-publishes detectable — a script can check whether the block already exists and skip it instead of minting a duplicate on every run.

Migration: `const ops = TextBlock.make(...)` becomes `const { ops } = TextBlock.make(...)`.
