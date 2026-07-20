---
"@geoprotocol/geo-sdk": patch
---

Document why `deleteEntity` is async and requires a `spaceId`, unlike the other op builders: there is no single delete op in GRC-20, so the SDK must fetch the entity's current values and relations first, and deletion is scoped to one space's data.
