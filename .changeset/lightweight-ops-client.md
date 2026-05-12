---
"@geoprotocol/geo-sdk": minor
---

Introduce the lightweight `Ops` namespace, configured `createGeoClient` workflows, first-class network configs, typed subpath exports, and deprecated compatibility adapters for legacy Graph/IPFS/space APIs.

The new personal-space creation helper now returns the initial profile ops needed to create the space entity, account entity, and personal-space type relations after the registry transaction is mined.

Entity delete op construction is now internal to `geo.entities.delete(...)` instead of being exposed on `Ops.entities`, and image op construction is internal to `geo.images.create(...)` instead of being exposed on `Ops.images`.
