import { RANK_VOTES_RELATION_TYPE } from '../core/ids/system.js';
import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import type { RankType, UpdateRankResult, Vote } from '../ranks/types.js';
import { updateRank } from '../ranks/update-rank.js';
import { graphqlData } from './api.js';
import type { GeoClientContext } from './context.js';
import { type ConnectionPage, collectPages, PAGE_INFO_FIELDS, pageArgs } from './paginate.js';

class UpdateRankError extends Error {
  readonly _tag = 'UpdateRankError';
}

type VoteNode = { id: string; entityId: string };

type RankVotesResponse = {
  entity?: { id: string } | null;
  relationsConnection: ConnectionPage<VoteNode> | null;
};

function rankVotesQuery(rankId: string, after: string | null): string {
  // The first page also checks the rank exists; later pages only need the votes.
  const rankCheck = after === null ? `entity(id: "${rankId}") { id }` : '';
  return `query rankVotes {
    ${rankCheck}
    relationsConnection(
      ${pageArgs(after)}
      filter: { fromEntityId: { is: "${rankId}" }, typeId: { is: "${RANK_VOTES_RELATION_TYPE}" } }
    ) {
      nodes {
        id
        entityId
      }
      ${PAGE_INFO_FIELDS}
    }
  }`;
}

/**
 * Reads every `RANK_VOTES` relation on the rank, following cursors until the
 * last page, so ranks with more than 100 votes are fully superseded.
 */
async function fetchExistingVotes(
  context: GeoClientContext,
  rankId: string,
): Promise<Array<{ relationId: string; voteEntityId: string }>> {
  const fetchPage = async (after: string | null): Promise<RankVotesResponse> => {
    try {
      return await graphqlData<RankVotesResponse>(context, rankVotesQuery(rankId, after));
    } catch (error) {
      throw new UpdateRankError(`Could not fetch existing votes for rank ${rankId}: ${error}`);
    }
  };
  const votesOf = (response: RankVotesResponse): ConnectionPage<VoteNode> => {
    if (!response.relationsConnection) {
      throw new UpdateRankError(`Could not fetch existing votes for rank ${rankId}: missing relationsConnection`);
    }
    return response.relationsConnection;
  };

  const first = await fetchPage(null);
  if (!first.entity) {
    throw new UpdateRankError(`Rank ${rankId} not found`);
  }

  const nodes = await collectPages(
    votesOf(first),
    async after => votesOf(await fetchPage(after)),
    reason => new UpdateRankError(`Could not fetch existing votes for rank ${rankId}: ${reason}`),
  );

  return nodes.map(relation => ({ relationId: relation.id, voteEntityId: relation.entityId }));
}

export type UpdateRankClientParams = {
  /** The `Rank` entity to update. */
  rankId: Id | string;
  /** Whether the rank stores ordinal positions or weighted scores. */
  rankType: RankType;
  /** The new, ordered list of votes that replaces the rank's current votes. */
  votes: Vote[];
};

/**
 * Fetches all of the rank's current `RANK_VOTES` relations from the configured Geo API
 * (paging through them, so ranks with more than 100 votes are fully replaced),
 * then builds ops that delete them (and their reified vote entities) and re-emit
 * the new ordered votes.
 *
 * @example
 * ```ts
 * const { ops } = await geo.ranks.update({
 *   rankId,
 *   rankType: 'ORDINAL',
 *   votes: [
 *     { entityId: movie2Id, spaceId }, // reordered submission
 *     { entityId: movie1Id, spaceId },
 *   ],
 * });
 * ```
 *
 * @param context Client context containing API origin and fetch configuration.
 * @param params Rank ID, type, and the new ordered votes.
 * @returns Rank entity ID, ops, and the created vote entity IDs.
 * @throws When IDs are invalid, fetch is unavailable, GraphQL fails, the response
 *   is malformed, or the rank is not found.
 */
export async function update(
  context: GeoClientContext,
  { rankId, rankType, votes }: UpdateRankClientParams,
): Promise<UpdateRankResult> {
  assertValid(rankId, '`rankId` in `updateRank`');

  const existingVotes = await fetchExistingVotes(context, rankId);

  return updateRank({ rankId, rankType, votes, existingVotes });
}
