---
"@geoprotocol/geo-sdk": minor
---

Ranking submissions: extend the ranks module with per-item space, block links, and updates.

- Rank creation moves to `Ops.ranks.create(...)` (pure op generation), alongside `Ops.properties`/`Ops.types`. **Breaking:** the `Rank.createRank(...)` namespace export is removed.
- Every vote now requires a `spaceId` (set as `to_space_id` on the vote relation), so a rank can include the same entity across multiple space perspectives. Item uniqueness is keyed on `(entityId, spaceId)`. **Breaking:** votes previously only took `entityId`.
- `Ops.ranks.create(...)` accepts an optional `blockId` to link the rank to a `Ranking Block` via a `Rank → Ranking Block` relation.
- Each vote relation now carries a fractional-index `position`, so clients can order votes natively by the relation's `position` field.
- New `geo.ranks.update(...)` re-submits a rank: it fetches the rank's current vote relations from the configured Geo API, deletes them and their reified vote entities, then re-emits the new ordered votes — no indexer involvement required. The lower-level `updateRank` op-builder is internal.
