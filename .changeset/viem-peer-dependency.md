---
"@geoprotocol/geo-sdk": minor
---

Move `viem` from dependencies to peerDependencies. This is a breaking change: consumers must now install `viem` themselves (e.g. add `viem` to your project's `dependencies`) to avoid runtime/module resolution errors.
