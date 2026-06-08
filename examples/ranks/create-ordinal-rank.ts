/**
 * Example: Creating an Ordinal Rank with grc-20-ts
 *
 * This example demonstrates how to use `Ops.ranks.create` to create
 * an ordinal (ordered) rank in the Knowledge Graph.
 */

import { IdUtils, Ops } from '@geoprotocol/geo-sdk';

// For this example, we'll generate some entity IDs to represent items we want to rank.
// In a real application, these would be existing entity IDs from your Knowledge Graph.
const movie1Id = IdUtils.generate();
const movie2Id = IdUtils.generate();
const movie3Id = IdUtils.generate();

// Each ranked entity is scoped to a space perspective via `spaceId`. In a real
// application this is the space the ranked entity lives in.
const spaceId = IdUtils.generate();

// =============================================================================
// Example 1: Creating an Ordinal Rank (Ordered List)
// =============================================================================
// Ordinal ranks are used when you want to rank items by position (1st, 2nd, 3rd, etc.)
// The position is derived from the array order - no need to specify position values!

const ordinalRankResult = Ops.ranks.create({
  name: 'My Favorite Movies of 2024',
  description: 'A ranked list of my top movies this year',
  rankType: 'ORDINAL',
  votes: [
    { entityId: movie1Id, spaceId }, // 1st place
    { entityId: movie2Id, spaceId }, // 2nd place
    { entityId: movie3Id, spaceId }, // 3rd place
  ],
});

console.log('=== Ordinal Rank Example ===');
console.log('Rank ID:', ordinalRankResult.id);
console.log('Number of operations:', ordinalRankResult.ops.length);
console.log('Vote entity IDs:', ordinalRankResult.voteIds);

// The ops array contains all the operations needed to create this rank:
console.log('\nOperations breakdown:');
for (const op of ordinalRankResult.ops) {
  if (op.type === 'createEntity') {
    console.log(`  - createEntity`);
  } else if (op.type === 'createRelation') {
    console.log(`  - createRelation`);
  }
}
