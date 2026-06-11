import type { CreateEntity, CreateRelation } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_PROPERTY,
  NAME_PROPERTY,
  RANK_BLOCK_RELATION_TYPE,
  RANK_TYPE,
  RANK_TYPE_PROPERTY,
  RANK_VOTES_RELATION_TYPE,
  TYPES_PROPERTY,
  VOTE_ORDINAL_VALUE_PROPERTY,
  VOTE_WEIGHTED_VALUE_PROPERTY,
} from '../core/ids/system.js';
import { Id, isValid } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { createRank } from './create-rank.js';

describe('createRank', () => {
  const movie1Id = Id('f47ac10b-58cc-4372-a567-0e02b2c3d479');
  const movie2Id = Id('550e8400-e29b-41d4-a716-446655440000');
  const movie3Id = Id('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
  const spaceId = Id('0e8d692f-1c2d-4f6b-9a0e-7b6d2c1f3a4b');
  const otherSpaceId = Id('1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d');

  describe('ordinal ranks', () => {
    it('creates a basic ordinal rank with one vote', () => {
      const rank = createRank({
        name: 'My Favorite Movie',
        rankType: 'ORDINAL',
        votes: [{ entityId: movie1Id, spaceId }],
      });

      expect(rank).toBeDefined();
      expect(typeof rank.id).toBe('string');
      expect(rank.ops).toBeDefined();
      expect(rank.voteIds).toHaveLength(1);

      // 1 createEntity (rank) + 1 createRelation (type) + 1 createRelation (vote) + 1 createEntity (vote value)
      expect(rank.ops).toHaveLength(4);

      // Check rank entity creation
      const rankEntityOp = rank.ops[0] as CreateEntity;
      expect(rankEntityOp.type).toBe('createEntity');
      expect(rankEntityOp.id).toEqual(toGrcId(rank.id));

      // Verify name value on rank entity
      const nameValue = rankEntityOp.values.find(v => {
        const propBytes = v.property;
        return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
      });
      expect(nameValue).toBeDefined();
      expect(nameValue?.value.type).toBe('text');
      if (nameValue?.value.type === 'text') {
        expect(nameValue.value.value).toBe('My Favorite Movie');
      }

      // Verify rank type property (ORDINAL)
      const rankTypeValue = rankEntityOp.values.find(v => {
        const propBytes = v.property;
        return propBytes.every((b, i) => b === toGrcId(RANK_TYPE_PROPERTY)[i]);
      });
      expect(rankTypeValue).toBeDefined();
      expect(rankTypeValue?.value.type).toBe('text');
      if (rankTypeValue?.value.type === 'text') {
        expect(rankTypeValue.value.value).toBe('ORDINAL');
      }

      // Check type relation to RANK_TYPE
      const typeRelOp = rank.ops[1] as CreateRelation;
      expect(typeRelOp.type).toBe('createRelation');
      expect(typeRelOp.from).toEqual(toGrcId(rank.id));
      expect(typeRelOp.to).toEqual(toGrcId(RANK_TYPE));
      expect(typeRelOp.relationType).toEqual(toGrcId(TYPES_PROPERTY));

      // Check vote relation
      const voteRelOp = rank.ops[2] as CreateRelation;
      expect(voteRelOp.type).toBe('createRelation');
      expect(voteRelOp.from).toEqual(toGrcId(rank.id));
      expect(voteRelOp.to).toEqual(toGrcId(movie1Id));
      expect(voteRelOp.relationType).toEqual(toGrcId(RANK_VOTES_RELATION_TYPE));
      // Vote relation is scoped to the vote's space perspective
      expect(voteRelOp.toSpace).toEqual(toGrcId(spaceId));
      // Vote relation carries the order in its `position` field
      expect(typeof voteRelOp.position).toBe('string');
      expect((voteRelOp.position as string).length).toBeGreaterThan(0);

      // Check vote entity with ordinal value
      const voteEntityOp = rank.ops[3] as CreateEntity;
      expect(voteEntityOp.type).toBe('createEntity');
      // biome-ignore lint/style/noNonNullAssertion: test file - we verified voteIds has 1 element
      expect(voteEntityOp.id).toEqual(toGrcId(rank.voteIds[0]!));

      // Verify ordinal value property matches the relation position
      const ordinalValue = voteEntityOp.values.find(v => {
        const propBytes = v.property;
        return propBytes.every((b, i) => b === toGrcId(VOTE_ORDINAL_VALUE_PROPERTY)[i]);
      });
      expect(ordinalValue).toBeDefined();
      expect(ordinalValue?.value.type).toBe('text');
      if (ordinalValue?.value.type === 'text') {
        expect(typeof ordinalValue.value.value).toBe('string');
        expect(ordinalValue.value.value.length).toBeGreaterThan(0);
        expect(ordinalValue.value.value).toBe(voteRelOp.position);
      }
    });

    it('creates an ordinal rank with multiple votes in order', () => {
      const rank = createRank({
        name: 'Top 3 Movies',
        rankType: 'ORDINAL',
        votes: [
          { entityId: movie1Id, spaceId },
          { entityId: movie2Id, spaceId },
          { entityId: movie3Id, spaceId },
        ],
      });

      expect(rank.voteIds).toHaveLength(3);
      // 1 createEntity + 1 type relation + 3 vote relations + 3 vote entities = 8 ops
      expect(rank.ops).toHaveLength(8);

      // Extract ordinal values and verify they are in ascending order
      const voteEntityOps = [rank.ops[3], rank.ops[5], rank.ops[7]] as CreateEntity[];

      const ordinalValues: string[] = [];
      for (const op of voteEntityOps) {
        expect(op.type).toBe('createEntity');
        const ordinalValue = op.values.find(v => {
          const propBytes = v.property;
          return propBytes.every((b, i) => b === toGrcId(VOTE_ORDINAL_VALUE_PROPERTY)[i]);
        });
        expect(ordinalValue?.value.type).toBe('text');
        if (ordinalValue?.value.type === 'text') {
          ordinalValues.push(ordinalValue.value.value);
        }
      }

      // Verify fractional indices are in ascending order
      expect(ordinalValues.length).toBe(3);
      // biome-ignore lint/style/noNonNullAssertion: test file - we just verified length is 3
      expect(ordinalValues[0]! < ordinalValues[1]!).toBe(true);
      // biome-ignore lint/style/noNonNullAssertion: test file - we just verified length is 3
      expect(ordinalValues[1]! < ordinalValues[2]!).toBe(true);

      // Vote relation positions match the ordinal values and ascend with array order
      const voteRelOps = [rank.ops[2], rank.ops[4], rank.ops[6]] as CreateRelation[];
      const positions = voteRelOps.map(op => op.position as string);
      expect(positions).toEqual(ordinalValues);
      // biome-ignore lint/style/noNonNullAssertion: test file - we just verified length is 3
      expect(positions[0]! < positions[1]!).toBe(true);
      // biome-ignore lint/style/noNonNullAssertion: test file - we just verified length is 3
      expect(positions[1]! < positions[2]!).toBe(true);
    });

    it('creates an ordinal rank with optional description', () => {
      const rank = createRank({
        name: 'My Movies',
        description: 'A ranked list of my favorite movies',
        rankType: 'ORDINAL',
        votes: [{ entityId: movie1Id, spaceId }],
      });

      const rankEntityOp = rank.ops[0] as CreateEntity;
      expect(rankEntityOp.type).toBe('createEntity');

      // Verify name value
      const nameValue = rankEntityOp.values.find(v => {
        const propBytes = v.property;
        return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
      });
      expect(nameValue?.value.type).toBe('text');
      if (nameValue?.value.type === 'text') {
        expect(nameValue.value.value).toBe('My Movies');
      }

      // Verify rank type value
      const rankTypeValue = rankEntityOp.values.find(v => {
        const propBytes = v.property;
        return propBytes.every((b, i) => b === toGrcId(RANK_TYPE_PROPERTY)[i]);
      });
      expect(rankTypeValue?.value.type).toBe('text');
      if (rankTypeValue?.value.type === 'text') {
        expect(rankTypeValue.value.value).toBe('ORDINAL');
      }

      // Verify description value
      const descValue = rankEntityOp.values.find(v => {
        const propBytes = v.property;
        return propBytes.every((b, i) => b === toGrcId(DESCRIPTION_PROPERTY)[i]);
      });
      expect(descValue).toBeDefined();
      expect(descValue?.value.type).toBe('text');
      if (descValue?.value.type === 'text') {
        expect(descValue.value.value).toBe('A ranked list of my favorite movies');
      }
    });
  });

  describe('weighted ranks', () => {
    it('creates a basic weighted rank with one vote', () => {
      const rank = createRank({
        name: 'Restaurant Rating',
        rankType: 'WEIGHTED',
        votes: [{ entityId: movie1Id, spaceId, value: 4.5 }],
      });

      expect(rank).toBeDefined();
      expect(rank.voteIds).toHaveLength(1);
      expect(rank.ops).toHaveLength(4);

      // Check rank entity has WEIGHTED type
      const rankEntityOp = rank.ops[0] as CreateEntity;
      expect(rankEntityOp.type).toBe('createEntity');

      const rankTypeValue = rankEntityOp.values.find(v => {
        const propBytes = v.property;
        return propBytes.every((b, i) => b === toGrcId(RANK_TYPE_PROPERTY)[i]);
      });
      expect(rankTypeValue?.value.type).toBe('text');
      if (rankTypeValue?.value.type === 'text') {
        expect(rankTypeValue.value.value).toBe('WEIGHTED');
      }

      // Weighted vote relations still carry a position for stable ordering
      const voteRelOp = rank.ops[2] as CreateRelation;
      expect(voteRelOp.toSpace).toEqual(toGrcId(spaceId));
      expect(typeof voteRelOp.position).toBe('string');

      // Check vote entity with weighted value
      const voteEntityOp = rank.ops[3] as CreateEntity;
      expect(voteEntityOp.type).toBe('createEntity');

      const weightedValue = voteEntityOp.values.find(v => {
        const propBytes = v.property;
        return propBytes.every((b, i) => b === toGrcId(VOTE_WEIGHTED_VALUE_PROPERTY)[i]);
      });
      expect(weightedValue).toBeDefined();
      expect(weightedValue?.value.type).toBe('float');
      if (weightedValue?.value.type === 'float') {
        expect(weightedValue.value.value).toBe(4.5);
      }
    });

    it('creates a weighted rank with multiple votes', () => {
      const rank = createRank({
        name: 'Movie Scores',
        rankType: 'WEIGHTED',
        votes: [
          { entityId: movie1Id, spaceId, value: 9.2 },
          { entityId: movie2Id, spaceId, value: 8.5 },
          { entityId: movie3Id, spaceId, value: 7.8 },
        ],
      });

      expect(rank.voteIds).toHaveLength(3);
      expect(rank.ops).toHaveLength(8);

      // Verify weighted values are correct
      const voteEntityOps = [rank.ops[3], rank.ops[5], rank.ops[7]] as CreateEntity[];
      const expectedValues = [9.2, 8.5, 7.8];

      voteEntityOps.forEach((op, i) => {
        expect(op.type).toBe('createEntity');
        const weightedValue = op.values.find(v => {
          const propBytes = v.property;
          return propBytes.every((b, j) => b === toGrcId(VOTE_WEIGHTED_VALUE_PROPERTY)[j]);
        });
        expect(weightedValue?.value.type).toBe('float');
        if (weightedValue?.value.type === 'float') {
          expect(weightedValue.value.value).toBe(expectedValues[i]);
        }
      });
    });

    it('handles integer weighted values', () => {
      const rank = createRank({
        name: 'Star Ratings',
        rankType: 'WEIGHTED',
        votes: [{ entityId: movie1Id, spaceId, value: 5 }],
      });

      const voteEntityOp = rank.ops[3] as CreateEntity;
      expect(voteEntityOp.type).toBe('createEntity');

      const weightedValue = voteEntityOp.values.find(v => {
        const propBytes = v.property;
        return propBytes.every((b, i) => b === toGrcId(VOTE_WEIGHTED_VALUE_PROPERTY)[i]);
      });
      expect(weightedValue?.value.type).toBe('float');
      if (weightedValue?.value.type === 'float') {
        expect(weightedValue.value.value).toBe(5);
      }
    });
  });

  describe('per-item space', () => {
    it('sets the vote relation `toSpace` to each vote’s spaceId', () => {
      const rank = createRank({
        name: 'Cross-space rank',
        rankType: 'ORDINAL',
        votes: [
          { entityId: movie1Id, spaceId },
          { entityId: movie2Id, spaceId: otherSpaceId },
        ],
      });

      const voteRel1 = rank.ops[2] as CreateRelation;
      const voteRel2 = rank.ops[4] as CreateRelation;
      expect(voteRel1.toSpace).toEqual(toGrcId(spaceId));
      expect(voteRel2.toSpace).toEqual(toGrcId(otherSpaceId));
    });

    it('allows the same entity across multiple spaces (perspectives)', () => {
      expect(() =>
        createRank({
          name: 'Perspectives on crypto',
          rankType: 'ORDINAL',
          votes: [
            { entityId: movie1Id, spaceId },
            { entityId: movie1Id, spaceId: otherSpaceId },
          ],
        }),
      ).not.toThrow();
    });
  });

  describe('block link', () => {
    const blockId = Id('9f8e7d6c-5b4a-4938-8271-605f4e3d2c1b');

    it('emits a Rank → Ranking Block relation when blockId is provided', () => {
      const rank = createRank({
        name: 'Block-linked rank',
        rankType: 'ORDINAL',
        blockId,
        votes: [{ entityId: movie1Id, spaceId }],
      });

      // rank entity + type relation + block link relation + vote relation + vote entity
      expect(rank.ops).toHaveLength(5);

      const blockRelOp = rank.ops[2] as CreateRelation;
      expect(blockRelOp.type).toBe('createRelation');
      expect(blockRelOp.from).toEqual(toGrcId(rank.id));
      expect(blockRelOp.to).toEqual(toGrcId(blockId));
      expect(blockRelOp.relationType).toEqual(toGrcId(RANK_BLOCK_RELATION_TYPE));

      // Votes follow the block link
      const voteRelOp = rank.ops[3] as CreateRelation;
      expect(voteRelOp.relationType).toEqual(toGrcId(RANK_VOTES_RELATION_TYPE));
    });

    it('does not emit a block link when blockId is omitted', () => {
      const rank = createRank({
        name: 'No block',
        rankType: 'ORDINAL',
        votes: [{ entityId: movie1Id, spaceId }],
      });
      const hasBlockRel = rank.ops.some(
        op =>
          op.type === 'createRelation' &&
          (op as CreateRelation).relationType.every((b, i) => b === toGrcId(RANK_BLOCK_RELATION_TYPE)[i]),
      );
      expect(hasBlockRel).toBe(false);
    });

    it('throws an error if blockId is invalid', () => {
      expect(() =>
        createRank({
          name: 'Bad block',
          rankType: 'ORDINAL',
          blockId: 'invalid',
          votes: [{ entityId: movie1Id, spaceId }],
        }),
      ).toThrow('Invalid id: "invalid" for `blockId` in `createRank`');
    });
  });

  describe('provided id', () => {
    it('uses provided id when specified', () => {
      const providedId = Id('b1dc6e5c-63e1-43ba-b3d4-755b251a4ea1');
      const rank = createRank({
        id: providedId,
        name: 'My Rank',
        rankType: 'ORDINAL',
        votes: [{ entityId: movie1Id, spaceId }],
      });

      expect(rank.id).toBe(providedId);

      // Verify the entity op uses the provided ID
      const rankEntityOp = rank.ops[0] as CreateEntity;
      expect(rankEntityOp.id).toEqual(toGrcId(providedId));

      // Verify the type relation uses the provided ID
      const typeRelOp = rank.ops[1] as CreateRelation;
      expect(typeRelOp.from).toEqual(toGrcId(providedId));
    });

    it('generates id when not provided', () => {
      const rank = createRank({
        name: 'My Rank',
        rankType: 'ORDINAL',
        votes: [{ entityId: movie1Id, spaceId }],
      });

      expect(typeof rank.id).toBe('string');
      expect(isValid(rank.id)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('throws an error if the provided id is invalid', () => {
      expect(() =>
        createRank({
          id: 'invalid',
          name: 'My Rank',
          rankType: 'ORDINAL',
          votes: [{ entityId: movie1Id, spaceId }],
        }),
      ).toThrow('Invalid id: "invalid" for `id` in `createRank`');
    });

    it('throws an error if a vote entityId is invalid', () => {
      expect(() =>
        createRank({
          name: 'My Rank',
          rankType: 'ORDINAL',
          votes: [{ entityId: 'invalid-entity-id', spaceId }],
        }),
      ).toThrow('Invalid id: "invalid-entity-id" for `entityId` in `votes` in `createRank`');
    });

    it('throws an error if a vote spaceId is invalid', () => {
      expect(() =>
        createRank({
          name: 'My Rank',
          rankType: 'ORDINAL',
          votes: [{ entityId: movie1Id, spaceId: 'invalid-space-id' }],
        }),
      ).toThrow('Invalid id: "invalid-space-id" for `spaceId` in `votes` in `createRank`');
    });

    it('throws an error if a duplicate (entityId, spaceId) is in votes', () => {
      expect(() =>
        createRank({
          name: 'My Rank',
          rankType: 'ORDINAL',
          votes: [
            { entityId: movie1Id, spaceId },
            { entityId: movie2Id, spaceId },
            { entityId: movie1Id, spaceId },
          ],
        }),
      ).toThrow(`Duplicate (entityId, spaceId) in votes: "${movie1Id}:${spaceId}".`);
    });

    it('throws an error for duplicate (entityId, spaceId) in weighted ranks', () => {
      expect(() =>
        createRank({
          name: 'My Scores',
          rankType: 'WEIGHTED',
          votes: [
            { entityId: movie1Id, spaceId, value: 5 },
            { entityId: movie1Id, spaceId, value: 3 },
          ],
        }),
      ).toThrow(`Duplicate (entityId, spaceId) in votes: "${movie1Id}:${spaceId}".`);
    });

    it('accepts ids that are not RFC 4122 UUIDs (arbitrary 16-byte hex)', () => {
      // Geo space IDs are arbitrary 16-byte values; this one has non-spec
      // version ('f') and variant ('f') nibbles.
      const nonRfcSpaceId = Id('73a82967cb12f604f9589ac4bc8024cb');
      expect(() =>
        createRank({
          name: 'My Rank',
          rankType: 'WEIGHTED',
          votes: [{ entityId: movie1Id, spaceId: nonRfcSpaceId, value: 1 }],
        }),
      ).not.toThrow();
    });

    it('detects duplicates for ids that are not RFC 4122 UUIDs', () => {
      const nonRfcSpaceId = Id('73a82967cb12f604f9589ac4bc8024cb');
      expect(() =>
        createRank({
          name: 'My Rank',
          rankType: 'ORDINAL',
          votes: [
            { entityId: movie1Id, spaceId: nonRfcSpaceId },
            { entityId: movie1Id, spaceId: nonRfcSpaceId },
          ],
        }),
      ).toThrow('Duplicate (entityId, spaceId) in votes');
    });

    it('detects duplicates across dashed and dashless forms of the same id', () => {
      const dashless = String(movie1Id).replaceAll('-', '');
      expect(() =>
        createRank({
          name: 'My Rank',
          rankType: 'ORDINAL',
          votes: [
            { entityId: movie1Id, spaceId }, // dashed
            { entityId: dashless, spaceId }, // same id, dashless
          ],
        }),
      ).toThrow('Duplicate (entityId, spaceId) in votes');
    });

    it('throws when a weighted vote is missing its numeric value', () => {
      expect(() =>
        createRank({
          name: 'My Scores',
          rankType: 'WEIGHTED',
          // `Vote` is not discriminated by rankType, so this compiles; runtime guards it.
          votes: [{ entityId: movie1Id, spaceId } as never],
        }),
      ).toThrow(`Weighted vote for "${movie1Id}" must have a finite numeric \`value\``);
    });

    it('throws when a weighted vote value is not finite', () => {
      expect(() =>
        createRank({
          name: 'My Scores',
          rankType: 'WEIGHTED',
          votes: [{ entityId: movie1Id, spaceId, value: Number.NaN }],
        }),
      ).toThrow(`Weighted vote for "${movie1Id}" must have a finite numeric \`value\``);
    });
  });

  describe('empty votes', () => {
    it('creates a rank with no votes', () => {
      const rank = createRank({
        name: 'Empty Rank',
        rankType: 'ORDINAL',
        votes: [],
      });

      expect(rank.voteIds).toHaveLength(0);
      // Only createEntity (rank) + createRelation (type)
      expect(rank.ops).toHaveLength(2);

      // Verify rank entity was created
      const rankEntityOp = rank.ops[0] as CreateEntity;
      expect(rankEntityOp.type).toBe('createEntity');
      expect(rankEntityOp.id).toEqual(toGrcId(rank.id));

      // Verify type relation was created
      const typeRelOp = rank.ops[1] as CreateRelation;
      expect(typeRelOp.type).toBe('createRelation');
      expect(typeRelOp.to).toEqual(toGrcId(RANK_TYPE));
    });
  });

  describe('vote relations', () => {
    it('creates vote relations with correct entity references', () => {
      const rank = createRank({
        name: 'My Rank',
        rankType: 'ORDINAL',
        votes: [
          { entityId: movie1Id, spaceId },
          { entityId: movie2Id, spaceId },
        ],
      });

      // Vote relations are at indices 2 and 4 (after rank entity and type relation)
      const voteRel1 = rank.ops[2] as CreateRelation;
      const voteRel2 = rank.ops[4] as CreateRelation;

      // Verify first vote relation
      expect(voteRel1.type).toBe('createRelation');
      expect(voteRel1.from).toEqual(toGrcId(rank.id));
      expect(voteRel1.to).toEqual(toGrcId(movie1Id));
      expect(voteRel1.relationType).toEqual(toGrcId(RANK_VOTES_RELATION_TYPE));
      // biome-ignore lint/style/noNonNullAssertion: test file - we verified voteIds has 2 elements
      expect(voteRel1.entity).toEqual(toGrcId(rank.voteIds[0]!));

      // Verify second vote relation
      expect(voteRel2.type).toBe('createRelation');
      expect(voteRel2.from).toEqual(toGrcId(rank.id));
      expect(voteRel2.to).toEqual(toGrcId(movie2Id));
      expect(voteRel2.relationType).toEqual(toGrcId(RANK_VOTES_RELATION_TYPE));
      // biome-ignore lint/style/noNonNullAssertion: test file - we verified voteIds has 2 elements
      expect(voteRel2.entity).toEqual(toGrcId(rank.voteIds[1]!));
    });
  });
});
