---
"@geoprotocol/geo-sdk": patch
---

Adapt DAO proposal helpers to the latest DAO contracts. SDK-built proposals now target DAO spaces by `daoSpaceId`/`spaceId`, so callers should remove `daoSpaceAddress` from `proposeEdit`, member/editor proposal helpers, and `proposeUpdateVotingSettings` calls.

For low-level custom proposal actions, replace `{ to, value, data }` with `{ toAddress, toSpaceId, value, data }`. Use the zero address when targeting a DAO by `toSpaceId`, or use the zero bytes16 space ID when targeting a contract address directly.
