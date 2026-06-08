---
"@geoprotocol/geo-sdk": minor
---

Ranking submissions: extend the ranks module with per-item space, block links, and updates.

- `createRank` now requires a `spaceId` on every vote (set as `to_space_id` on the vote relation), so a rank can include the same entity across multiple space perspectives. Item uniqueness is keyed on `(entityId, spaceId)`. **Breaking:** votes previously only took `entityId`.
- `createRank` accepts an optional `blockId` to link the rank to a `Ranking Block` via a `Rank → Ranking Block` relation.
- Each vote relation now carries a fractional-index `position`, so clients can order votes natively by the relation's `position` field.
- New `Rank.updateRank(...)` pure op-builder deletes a rank's existing vote relations and their reified vote entities, then re-emits the new ordered votes.
- New `geo.ranks` client namespace: `geo.ranks.create(...)` and `geo.ranks.update(...)`, where `update` fetches the rank's current vote relations from the configured Geo API and supersedes them — no indexer involvement required.
