---
"@geoprotocol/geo-sdk": patch
---

Add `Ops.textBlocks.create` and `Ops.dataBlocks.create`, returning `{ id, ops }` and accepting an optional stable block ID. The existing `TextBlock.make` and `DataBlock.make` helpers remain compatible with their `Op[]` return type and are now deprecated in favor of the new builders.
