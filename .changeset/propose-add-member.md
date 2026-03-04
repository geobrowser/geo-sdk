---
"@geoprotocol/geo-sdk": patch
---

Add `proposeAddMember` function to `dao-space` module.

Encodes a governance proposal that calls `addMember()` on a DAO space contract, submitted via `SpaceRegistry.enter()`. Returns `to`, `calldata`, and `proposalId` — no IPFS publication required.
