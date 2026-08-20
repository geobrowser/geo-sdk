---
"@geoprotocol/geo-sdk": minor
---

Refuse to delete the entities that anchor a space's identity.

`geo.entities.delete(...)` (and the deprecated `Graph.deleteEntity(...)`) now
throw `ProtectedEntityError` when the target is the space's `page`/home entity
or one of the Avatar / Cover images that entity points at. Those entities carry
the space itself rather than content in it, and a caller iterating a space's
entities cannot tell them apart from anything else it is deleting — so a single
stray loop takes the space's name, description and profile image with it.

Pass `deleteAnchored: true` to delete one deliberately. The error carries
`entityId`, `spaceId` and a `reason` of `'page' | 'avatar' | 'cover'`, so a bulk
caller can skip anchored entities instead of aborting. `ProtectedEntityError`
and `anchoredEntityIds(space)` are exported for callers that want to filter a
work list before deleting anything.

The anchors are resolved in the request `deleteEntity` already makes, so this
costs no extra round-trip.

**Behavior change:** a call that previously deleted one of these entities now
throws until `deleteAnchored: true` is added.
