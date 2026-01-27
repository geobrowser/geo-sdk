---
"@geoprotocol/geo-sdk": patch
---

Add `personalSpace` module with helper functions for personal spaces:

- `personalSpace.createSpace()` - returns `{ to, calldata }` for creating a personal space
- `personalSpace.publishEdit()` - publishes ops to IPFS and returns `{ editId, cid, to, calldata }` for on-chain submission

The validation for `Id` and `isValid` has been relaxed from strict UUID validation to a simple hex-pattern match, accepting UUID-like strings with or without dashes (any 32 hex characters), which may include values that are not spec-compliant UUIDs.
