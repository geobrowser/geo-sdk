import type { CreateRelation } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import { RANK_BLOCK_RELATION_TYPE, RANK_VOTES_RELATION_TYPE } from '../core/ids/system.js';
import { toGrcId } from '../id-utils.js';
import { create } from './ranks.js';

const MOVIE_1 = 'f47ac10b58cc4372a5670e02b2c3d479';
const MOVIE_2 = '550e8400e29b41d4a716446655440000';
const SPACE_ID = 'd4bc2f205e2d415e971eb0b9fbf6b6fc';
const BLOCK_ID = '9f8e7d6c5b4a49388271605f4e3d2c1b';

function relationsOfType(ops: Array<{ type: string }>, typeId: string) {
  return ops.filter(
    (op): op is CreateRelation =>
      op.type === 'createRelation' &&
      (op as CreateRelation).relationType.every((byte, index) => byte === toGrcId(typeId)[index]),
  );
}

describe('Ops.ranks.create', () => {
  it('builds rank creation ops (pure, no network)', () => {
    const result = create({
      name: 'Top movies',
      rankType: 'ORDINAL',
      votes: [
        { entityId: MOVIE_1, spaceId: SPACE_ID },
        { entityId: MOVIE_2, spaceId: SPACE_ID },
      ],
    });

    expect(result.voteIds).toHaveLength(2);
    expect(relationsOfType(result.ops, RANK_VOTES_RELATION_TYPE)).toHaveLength(2);
  });

  it('links the rank to a Ranking Block when blockId is provided', () => {
    const result = create({
      name: 'Block-linked rank',
      rankType: 'ORDINAL',
      blockId: BLOCK_ID,
      votes: [{ entityId: MOVIE_1, spaceId: SPACE_ID }],
    });

    expect(relationsOfType(result.ops, RANK_BLOCK_RELATION_TYPE)).toHaveLength(1);
  });
});
