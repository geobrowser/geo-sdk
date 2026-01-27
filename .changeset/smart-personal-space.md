---
"@geoprotocol/geo-sdk": patch
---

Add `personalSpace` module with helper functions for personal spaces:

- `personalSpace.createSpace()` - returns `{ to, calldata }` for creating a personal space
- `personalSpace.publishEdit()` - publishes ops to IPFS and returns `{ editId, cid, to, calldata }` for on-chain submission

The validation for `Id` and `isValid` has been updated to accept both strings that resemble UUIDs with or without dashes.
