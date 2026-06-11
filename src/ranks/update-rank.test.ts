import type { CreateEntity, CreateRelation, DeleteEntity, DeleteRelation } from '@geoprotocol/grc-20';
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
  const existingVote1 = Id('cccccccc-3333-4333-8333-cccccccccccc');
  const existingVote2 = Id('dddddddd-4444-4444-8444-dddddddddddd');

  it('deletes the existing vote relations and their entities then re-emits the new votes', () => {
    const result = updateRank({
      rankId,
      rankType: 'ORDINAL',
      votes: [
        { entityId: movie2Id, spaceId }, // reordered to 1st
        { entityId: movie1Id, spaceId },
      ],
      existingVotes: [
        { relationId: existingRel1, voteEntityId: existingVote1 },
        { relationId: existingRel2, voteEntityId: existingVote2 },
      ],
    });

    expect(result.id).toBe(rankId);
    expect(result.voteIds).toHaveLength(2);

    // (2 deleteRelation + 2 deleteEntity) + 2 vote relations + 2 vote entities
    expect(result.ops).toHaveLength(8);

    // Deletes come first: each relation is deleted with its reified vote entity
    const del1 = result.ops[0] as DeleteRelation;
    const delEntity1 = result.ops[1] as DeleteEntity;
    const del2 = result.ops[2] as DeleteRelation;
    const delEntity2 = result.ops[3] as DeleteEntity;
    expect(del1.type).toBe('deleteRelation');
    expect(del1.id).toEqual(toGrcId(existingRel1));
    expect(delEntity1.type).toBe('deleteEntity');
    expect(delEntity1.id).toEqual(toGrcId(existingVote1));
    expect(del2.type).toBe('deleteRelation');
    expect(del2.id).toEqual(toGrcId(existingRel2));
    expect(delEntity2.type).toBe('deleteEntity');
    expect(delEntity2.id).toEqual(toGrcId(existingVote2));

    // New vote relations follow
    const voteRel1 = result.ops[4] as CreateRelation;
    expect(voteRel1.type).toBe('createRelation');
    expect(voteRel1.from).toEqual(toGrcId(rankId));
    expect(voteRel1.to).toEqual(toGrcId(movie2Id));
    expect(voteRel1.relationType).toEqual(toGrcId(RANK_VOTES_RELATION_TYPE));
    expect(voteRel1.toSpace).toEqual(toGrcId(spaceId));
    expect(typeof voteRel1.position).toBe('string');

    // Vote entity carries the ordinal value
    const voteEntity1 = result.ops[5] as CreateEntity;
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
    expect(result.ops.some(op => op.type === 'deleteEntity')).toBe(false);
  });

  it('emits only delete ops when the new vote list is empty', () => {
    const result = updateRank({
      rankId,
      rankType: 'ORDINAL',
      votes: [],
      existingVotes: [{ relationId: existingRel1, voteEntityId: existingVote1 }],
    });

    // deleteRelation + deleteEntity for the superseded vote
    expect(result.ops).toHaveLength(2);
    expect(result.ops[0]?.type).toBe('deleteRelation');
    expect(result.ops[1]?.type).toBe('deleteEntity');
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
        existingVotes: [{ relationId: 'invalid', voteEntityId: existingVote1 }],
      }),
    ).toThrow('Invalid id: "invalid" for `relationId` in `existingVotes` in `updateRank`');
  });

  it('throws an error if an existing voteEntityId is invalid', () => {
    expect(() =>
      updateRank({
        rankId,
        rankType: 'ORDINAL',
        votes: [{ entityId: movie1Id, spaceId }],
        existingVotes: [{ relationId: existingRel1, voteEntityId: 'invalid' }],
      }),
    ).toThrow('Invalid id: "invalid" for `voteEntityId` in `existingVotes` in `updateRank`');
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

  it('accepts ids that are not RFC 4122 UUIDs (arbitrary 16-byte hex)', () => {
    // Geo space IDs are arbitrary 16-byte values; this one has non-spec
    // version ('f') and variant ('f') nibbles.
    const nonRfcSpaceId = Id('73a82967cb12f604f9589ac4bc8024cb');
    expect(() =>
      updateRank({
        rankId,
        rankType: 'WEIGHTED',
        votes: [{ entityId: movie1Id, spaceId: nonRfcSpaceId, value: 1 }],
        existingVotes: [{ relationId: existingRel1, voteEntityId: existingVote1 }],
      }),
    ).not.toThrow();
  });
});
