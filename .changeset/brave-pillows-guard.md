---
"@geoprotocol/geo-sdk": patch
---

`uploadImage` / `Graph.createImage` now throw an `IpfsUploadError` when a source URL fetch returns a non-image body (e.g. an HTML error page served with status 200), instead of silently uploading it to IPFS and publishing a broken image. Content fetched from a URL is accepted when its `content-type` is `image/*` or its bytes parse as an image.
