---
"@geoprotocol/geo-sdk": patch
---

`geo.ranks.update` now replaces every existing vote on a rank. It previously read only the first 100 (the API's default page size), so ranks with more than 100 votes kept stale vote relations and vote entities after an update.
