# @geoprotocol/geo-sdk

## 0.2.2

### Patch Changes

- 2573d63: Add `personalSpace` module with helper functions for personal spaces:

  - `personalSpace.createSpace()` - returns `{ to, calldata }` for creating a personal space
  - `personalSpace.publishEdit()` - publishes ops to IPFS and returns `{ editId, cid, to, calldata }` for on-chain submission

  The validation for `Id` and `isValid` has been relaxed from strict UUID validation to a simple hex-pattern match, accepting UUID-like strings with or without dashes (any 32 hex characters), which may include values that are not spec-compliant UUIDs.

## 0.2.1

### Patch Changes

- 4be9218: upgrade grc-20 with a validation improvement

## 0.2.0

### Minor Changes

- 6779290: upgrade grc-20 with changed date, datetime, time encoding (date now will always return a timezone as well)

## 0.1.1

### Minor Changes

- only expose TESTNET and use it as the default network
- initial release
