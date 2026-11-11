---
"@geoprotocol/geo-sdk": patch
---

Add DAO-space helpers for fast-path access: `proposeUnrestrictMember` (SLOW proposal that lifts a member's `FAST_PATH_RESTRICTED` role), `proposeAddMemberWithFastPath` (SLOW proposal that runs `addMember` then `unrestrictSpace`, the way back in for a space that left while restricted), and `restrictMemberFastPath` (immediate editor restriction through `SpaceRegistry.enter`). Adds `actions.unrestrictSpace` and `SPACE_FAST_PATH_RESTRICTED_ACTION`.
