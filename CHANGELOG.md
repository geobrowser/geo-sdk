# @geoprotocol/geo-sdk

## 0.3.1

### Patch Changes

- 74ce4e7: Add missing datatype options to TypedValue: `int64`, `decimal`, `bytes`, and `embedding`
- 5b0dcfb: Add new IDs for GitHub property, LinkedIn property, works at property, bounty-related types and properties, and community call types and properties
- 168356f: Deprecate ROLE_PROPERTY and add ROLE_TYPE with the same ID

## 0.3.0

### Minor Changes

- da51eb5: Add property unsetting support to `Graph.updateEntity`

  **Breaking changes:**

  - `updateEntity` now generates `updateEntity` ops instead of `createEntity` ops
  - Uses grc-20's `updateEntity()` function with proper `set` and `unset` arrays

  **New features:**

  - Added `unset` parameter to `updateEntity` for unsetting property values
  - Supports language-aware unsetting using grc-20's `languages` helpers

  ```typescript
  import { languages, languageId } from "@geoprotocol/grc-20";

  updateEntity({
    id: entityId,
    unset: [
      { property: propertyId }, // unset all languages
      { property: propertyId2, language: languages.english() }, // specific language
      { property: propertyId3, language: languageId("de") }, // by BCP 47 code
    ],
  });
  ```

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
