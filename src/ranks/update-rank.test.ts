import type { CreateEntity, CreateRelation, DeleteRelation } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import { RANK_VOTES_RELATION_TYPE, VOTE_ORDINAL_VALUE_PROPERTY } from '../core/ids/system.js';
import { Id } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { updateRank } from './update-rank.js';

describe('updateRank', () => {
  const rankId = Id('b1dc6e5c-63e1-43ba-b3d4-755b251a4ea1');
  const movie1Id = Id('f47ac10b-58cc-4372-a567-0e02b2c3d479');
  const movie2Id = Id('550e8400-e29b-41d4-a716-446655440000');
  const spaceId = Id('0e8d692f-1c2d-4f6b-9a0e-7b6d2c1f3a4b');
  const existingRel1 = Id('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
  const existingRel2 = Id('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb');

  it('deletes the existing vote relations then re-emits the new votes', () => {
    const result = updateRank({
      rankId,
      rankType: 'ORDINAL',
      votes: [
        { entityId: movie2Id, spaceId }, // reordered to 1st
        { entityId: movie1Id, spaceId },
      ],
      existingVotes: [{ relationId: existingRel1 }, { relationId: existingRel2 }],
    });

    expect(result.id).toBe(rankId);
    expect(result.voteIds).toHaveLength(2);

    // 2 deleteRelation + 2 vote relations + 2 vote entities
    expect(result.ops).toHaveLength(6);

    // Deletes come first
    const del1 = result.ops[0] as DeleteRelation;
    const del2 = result.ops[1] as DeleteRelation;
    expect(del1.type).toBe('deleteRelation');
    expect(del1.id).toEqual(toGrcId(existingRel1));
    expect(del2.type).toBe('deleteRelation');
    expect(del2.id).toEqual(toGrcId(existingRel2));

    // New vote relations follow
    const voteRel1 = result.ops[2] as CreateRelation;
    expect(voteRel1.type).toBe('createRelation');
    expect(voteRel1.from).toEqual(toGrcId(rankId));
    expect(voteRel1.to).toEqual(toGrcId(movie2Id));
    expect(voteRel1.relationType).toEqual(toGrcId(RANK_VOTES_RELATION_TYPE));
    expect(voteRel1.toSpace).toEqual(toGrcId(spaceId));
    expect(typeof voteRel1.position).toBe('string');

    // Vote entity carries the ordinal value
    const voteEntity1 = result.ops[3] as CreateEntity;
    expect(voteEntity1.type).toBe('createEntity');
    const ordinalValue = voteEntity1.values.find(v =>
      v.property.every((b, i) => b === toGrcId(VOTE_ORDINAL_VALUE_PROPERTY)[i]),
    );
    expect(ordinalValue?.value.type).toBe('text');
  });

  it('emits only new votes when there are no existing votes', () => {
    const result = updateRank({
      rankId,
      rankType: 'ORDINAL',
      votes: [{ entityId: movie1Id, spaceId }],
      existingVotes: [],
    });

    // 1 vote relation + 1 vote entity, no deletes
    expect(result.ops).toHaveLength(2);
    expect(result.ops.some(op => op.type === 'deleteRelation')).toBe(false);
  });

  it('emits only delete ops when the new vote list is empty', () => {
    const result = updateRank({
      rankId,
      rankType: 'ORDINAL',
      votes: [],
      existingVotes: [{ relationId: existingRel1 }],
    });

    expect(result.ops).toHaveLength(1);
    expect(result.ops[0]?.type).toBe('deleteRelation');
    expect(result.voteIds).toHaveLength(0);
  });

  it('throws an error if the rankId is invalid', () => {
    expect(() =>
      updateRank({
        rankId: 'invalid',
        rankType: 'ORDINAL',
        votes: [{ entityId: movie1Id, spaceId }],
        existingVotes: [],
      }),
    ).toThrow('Invalid id: "invalid" for `rankId` in `updateRank`');
  });

  it('throws an error if an existing relationId is invalid', () => {
    expect(() =>
      updateRank({
        rankId,
        rankType: 'ORDINAL',
        votes: [{ entityId: movie1Id, spaceId }],
        existingVotes: [{ relationId: 'invalid' }],
      }),
    ).toThrow('Invalid id: "invalid" for `relationId` in `existingVotes` in `updateRank`');
  });

  it('throws an error on duplicate (entityId, spaceId) in new votes', () => {
    expect(() =>
      updateRank({
        rankId,
        rankType: 'ORDINAL',
        votes: [
          { entityId: movie1Id, spaceId },
          { entityId: movie1Id, spaceId },
        ],
        existingVotes: [],
      }),
    ).toThrow(`Duplicate (entityId, spaceId) in votes: "${movie1Id}:${spaceId}".`);
  });
});
