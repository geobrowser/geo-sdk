---
"@geoprotocol/geo-sdk": patch
---

`geo.ranks.update` and `geo.entities.delete` now read every row they need instead of only the first 100 (the API's default page size). Before, updating a rank with more than 100 votes left stale vote relations and vote entities behind, and deleting an entity with more than 100 values or relations in a space left the rest in place.
