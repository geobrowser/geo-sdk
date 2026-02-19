# @geoprotocol/geo-sdk

## 0.10.1

### Patch Changes

- ef5ad47: Add MAINTAINER_PROPERTY, ALLOCATE_PROPERTY, SUBMISSION_PROPERTY and deprecate CREATOR_PROPERTY

## 0.10.0

### Minor Changes

- 35e9844: Fix `createProperty` with `RELATION` dataType missing `DATA_TYPE` relation

### Patch Changes

- 681547e: Throw error when `publishEdit` is called with an empty ops array

## 0.9.0

### Minor Changes

- fixes publishing to use author entity id instead of derived uuid

## 0.8.0

### Minor Changes

- ae84dcc: **BREAKING:** Migrate to `@geoprotocol/grc-20` v0.4.0 type name changes.

  The following `TypedValue` type discriminants have been renamed:

  - `float64` → `float`
  - `int64` → `integer`
  - `bool` → `boolean`

  The following `ValueDataType` values have been renamed:

  - `INT64` → `INTEGER`
  - `FLOAT64` → `FLOAT`

  The following system ID exports have been renamed:

  - `INT64` → `INTEGER`
  - `FLOAT64` → `FLOAT`

## 0.7.0

### Minor Changes

- a56c52d: Add `personalSpace.hasSpace()` utility and export `TESTNET_RPC_URL` and `EMPTY_SPACE_ID` constants
- e9913b5: Update getSmartAccountWalletClient to support TESTNET and set it as default
- a7c1cb1: Remove `Graph.createSpace` in favor of `personalSpace.createSpace` and `daoSpace.createSpace`

## 0.6.0

### Minor Changes

- 75b0a34: Fix IPFS CID encoding in `publishEdit()` to use ABI-encoded string format, enabling the indexer to properly decode published edits.

## 0.5.0

### Minor Changes

- 87e08ea: Add `daoSpace.proposeEdit()` function for creating proposals to publish edits to DAO spaces.

  This function:

  - Publishes ops to IPFS using the GRC-20 binary format
  - Generates a unique proposal ID (or accepts a custom one)
  - Encodes the calldata for the SpaceRegistry's `enter()` function with PROPOSAL_CREATED action

  The proposal, when executed, will call the DAO space's `publish()` function. Since `publish()` is a valid fast-path action, with FAST voting mode and sufficient votes, the proposal will auto-execute.

  Example usage:

  ```ts
  import { daoSpace, Graph } from "@geoprotocol/geo-sdk";

  const { ops } = Graph.createEntity({ name: "New Entity" });
  const { editId, cid, to, calldata, proposalId } = await daoSpace.proposeEdit({
    name: "Add new entity",
    ops,
    author: "0x1234...",
    daoSpaceAddress: "0xDAOSpaceContractAddress...",
    callerSpaceId: "0xCallerBytes16SpaceId...",
    daoSpaceId: "0xDAOBytes16SpaceId...",
  });

  await walletClient.sendTransaction({ to, data: calldata });
  ```

## 0.4.0

### Minor Changes

- b305747: Upgrade to the latest grc-20 version

### Patch Changes

- 474a749: Add `daoSpace.createSpace` function for creating DAO spaces. This function generates a space entity, uploads the initial edit to IPFS, and returns the calldata needed to submit a transaction to the DAO Space Factory contract.

  ```ts
  import { daoSpace } from "@geoprotocol/geo-sdk";

  const { to, calldata, spaceEntityId, cid } = await daoSpace.createSpace({
    name: "My DAO Space",
    votingSettings: {
      slowPathPercentageThreshold: 50, // 50% approval needed
      fastPathFlatThreshold: 3, // 3 editors for fast path
      quorum: 2, // minimum 2 editors must vote
      durationInDays: 7, // 7 day voting period
    },
    initialEditorSpaceIds: ["0x01234567890abcdef01234567890abcd"],
    author: "0x1234567890abcdef1234567890abcdef12345678",
  });

  // Using viem
  const hash = await walletClient.sendTransaction({
    to,
    data: calldata,
  });
  ```

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
