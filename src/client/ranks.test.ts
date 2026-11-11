import type { CreateEntity, CreateRelation, DeleteEntity, DeleteRelation } from '@geoprotocol/grc-20';
import { describe, expect, it, vi } from 'vitest';
import { createGeoClient } from '../client.js';
import { RANK_VOTES_RELATION_TYPE } from '../core/ids/system.js';
import { toGrcId } from '../id-utils.js';
import { defineGeoNetworkConfig } from '../networks.js';

const RANK_ID = 'b1dc6e5c63e143bab3d4755b251a4ea1';
const MOVIE_1 = 'f47ac10b58cc4372a5670e02b2c3d479';
const MOVIE_2 = '550e8400e29b41d4a716446655440000';
const SPACE_ID = 'd4bc2f205e2d415e971eb0b9fbf6b6fc';
const EXISTING_REL_1 = 'aaaaaaaa11114111811aaaaaaaaaaaaa';
const EXISTING_REL_2 = 'bbbbbbbb22224222822bbbbbbbbbbbbb';
const EXISTING_VOTE_1 = 'cccccccc33334333833ccccccccccccc';
const EXISTING_VOTE_2 = 'dddddddd44444444844ddddddddddddd';

function customNetwork() {
  return defineGeoNetworkConfig({
    id: 'LOCAL',
    name: 'Local Geo',
    apiOrigin: 'http://localhost:3000',
  });
}

function voteRelations(ops: Array<{ type: string }>) {
  return ops.filter(
    (op): op is CreateRelation =>
      op.type === 'createRelation' &&
      (op as CreateRelation).relationType.every((byte, index) => byte === toGrcId(RANK_VOTES_RELATION_TYPE)[index]),
  );
}

type VoteNode = { id: string; entityId: string };

/** A GraphQL response for one page of a rank's votes, as `geo.ranks.update` reads them. */
function votesPage(
  nodes: VoteNode[],
  { rankExists, endCursor = null }: { rankExists?: boolean; endCursor?: string | null } = {},
) {
  return {
    data: {
      ...(rankExists === undefined ? {} : { entity: rankExists ? { id: RANK_ID } : null }),
      relationsConnection: { nodes, pageInfo: { hasNextPage: endCursor !== null, endCursor } },
    },
  };
}

/** `count` distinct, valid relation/vote id pairs. */
function existingVotes(count: number, offset = 0): VoteNode[] {
  return Array.from({ length: count }, (_, i) => {
    const n = (offset + i).toString(16).padStart(8, '0');
    return { id: `${n}11114111811aaaaaaaaaaaaa`, entityId: `${n}22224222822bbbbbbbbbbbbb` };
  });
}

function requestBody(fetch: ReturnType<typeof vi.fn>, call: number): string {
  const init = fetch.mock.calls[call]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body)).query as string;
}

describe('geo.ranks', () => {
  describe('update', () => {
    it('fetches existing vote relations then supersedes them with new votes', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response(
          JSON.stringify(
            votesPage(
              [
                { id: EXISTING_REL_1, entityId: EXISTING_VOTE_1 },
                { id: EXISTING_REL_2, entityId: EXISTING_VOTE_2 },
              ],
              { rankExists: true },
            ),
          ),
        ),
      );
      const geo = createGeoClient({ network: customNetwork(), fetch });

      const result = await geo.ranks.update({
        rankId: RANK_ID,
        rankType: 'ORDINAL',
        votes: [{ entityId: MOVIE_2, spaceId: SPACE_ID }],
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/graphql', expect.objectContaining({ method: 'POST' }));

      // Two relation deletes for the fetched relations
      const deletes = result.ops.filter((op): op is DeleteRelation => op.type === 'deleteRelation');
      expect(deletes).toHaveLength(2);
      expect(deletes[0]?.id).toEqual(toGrcId(EXISTING_REL_1));
      expect(deletes[1]?.id).toEqual(toGrcId(EXISTING_REL_2));

      // Each superseded vote also deletes its reified vote entity
      const entityDeletes = result.ops.filter((op): op is DeleteEntity => op.type === 'deleteEntity');
      expect(entityDeletes).toHaveLength(2);
      expect(entityDeletes[0]?.id).toEqual(toGrcId(EXISTING_VOTE_1));
      expect(entityDeletes[1]?.id).toEqual(toGrcId(EXISTING_VOTE_2));

      // One new vote relation + entity
      expect(voteRelations(result.ops)).toHaveLength(1);
      const voteEntity = result.ops.find((op): op is CreateEntity => op.type === 'createEntity');
      expect(voteEntity).toBeDefined();
      expect(result.voteIds).toHaveLength(1);
    });

    it('emits only new votes when the rank has no existing votes', async () => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(JSON.stringify(votesPage([], { rankExists: true }))));
      const geo = createGeoClient({ network: customNetwork(), fetch });

      const result = await geo.ranks.update({
        rankId: RANK_ID,
        rankType: 'ORDINAL',
        votes: [{ entityId: MOVIE_1, spaceId: SPACE_ID }],
      });

      expect(result.ops.some(op => op.type === 'deleteRelation')).toBe(false);
      expect(voteRelations(result.ops)).toHaveLength(1);
    });

    it('pages through every existing vote, so ranks with more than 100 votes are fully replaced', async () => {
      const firstPage = existingVotes(1000);
      const secondPage = existingVotes(250, 1000);
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(votesPage(firstPage, { rankExists: true, endCursor: 'cursor-1' }))),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify(votesPage(secondPage))));
      const geo = createGeoClient({ network: customNetwork(), fetch });

      const result = await geo.ranks.update({
        rankId: RANK_ID,
        rankType: 'ORDINAL',
        votes: [{ entityId: MOVIE_1, spaceId: SPACE_ID }],
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(requestBody(fetch, 0)).toContain('first: 1000');
      expect(requestBody(fetch, 0)).not.toContain('after:');
      expect(requestBody(fetch, 1)).toContain('after: "cursor-1"');

      const deletes = result.ops.filter((op): op is DeleteRelation => op.type === 'deleteRelation');
      expect(deletes).toHaveLength(1250);
      expect(deletes[1249]?.id).toEqual(toGrcId(secondPage[249]?.id ?? ''));
      expect(result.ops.filter(op => op.type === 'deleteEntity')).toHaveLength(1250);
      expect(voteRelations(result.ops)).toHaveLength(1);
    });

    it('throws instead of looping when the pagination cursor does not advance', async () => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(votesPage(existingVotes(1), { rankExists: true, endCursor: 'stuck' }))),
        )
        .mockResolvedValue(new Response(JSON.stringify(votesPage(existingVotes(1, 1), { endCursor: 'stuck' }))));
      const geo = createGeoClient({ network: customNetwork(), fetch });

      await expect(
        geo.ranks.update({
          rankId: RANK_ID,
          rankType: 'ORDINAL',
          votes: [{ entityId: MOVIE_1, spaceId: SPACE_ID }],
        }),
      ).rejects.toThrow('pagination cursor did not advance');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('throws when the rank is not found', async () => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(JSON.stringify(votesPage([], { rankExists: false }))));
      const geo = createGeoClient({ network: customNetwork(), fetch });

      await expect(
        geo.ranks.update({
          rankId: RANK_ID,
          rankType: 'ORDINAL',
          votes: [{ entityId: MOVIE_1, spaceId: SPACE_ID }],
        }),
      ).rejects.toThrow(`Rank ${RANK_ID} not found`);
    });

    it('throws when the rankId is invalid', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const geo = createGeoClient({ network: customNetwork(), fetch });

      await expect(
        geo.ranks.update({
          rankId: 'invalid',
          rankType: 'ORDINAL',
          votes: [{ entityId: MOVIE_1, spaceId: SPACE_ID }],
        }),
      ).rejects.toThrow('Invalid id: "invalid" for `rankId` in `updateRank`');
    });
  });
});
