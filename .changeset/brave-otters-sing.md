---
"@geoprotocol/geo-sdk": patch
---

Fix `createRank`/`updateRank` throwing `TypeError: Invalid UUID` for valid Geo IDs that are not RFC 4122 UUIDs. The vote duplicate check now normalizes IDs as plain hex instead of parsing them as UUIDs.
