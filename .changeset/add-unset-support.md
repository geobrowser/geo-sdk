---
"@geoprotocol/geo-sdk": minor
---

Add property unsetting support to `Graph.updateEntity`

**Breaking changes:**
- `updateEntity` now generates `updateEntity` ops instead of `createEntity` ops
- Uses grc-20's `updateEntity()` function with proper `set` and `unset` arrays

**New features:**
- Added `unset` parameter to `updateEntity` for unsetting property values
- Supports language-aware unsetting using grc-20's `languages` helpers

```typescript
import { languages, languageId } from '@geoprotocol/grc-20';

updateEntity({
  id: entityId,
  unset: [
    { property: propertyId },                        // unset all languages
    { property: propertyId2, language: languages.english() },  // specific language
    { property: propertyId3, language: languageId('de') },     // by BCP 47 code
  ],
});
```
