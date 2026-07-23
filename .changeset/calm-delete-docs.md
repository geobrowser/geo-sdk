---
"@geoprotocol/geo-sdk": patch
---

Document why `deleteEntity` is async and requires a `spaceId`, unlike the other op builders: GRC-20 defines a delete-entity op but the Indexer does not support it yet, so the SDK must fetch the entity's current values and relations first, and deletion is scoped to one space's data.
