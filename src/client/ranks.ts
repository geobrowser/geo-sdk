import { RANK_VOTES_RELATION_TYPE } from '../core/ids/system.js';
import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import type { RankType, UpdateRankResult, Vote } from '../ranks/types.js';
import { updateRank } from '../ranks/update-rank.js';
import { graphqlData } from './api.js';
import type { GeoClientContext } from './context.js';

class UpdateRankError extends Error {
  readonly _tag = 'UpdateRankError';
}

/**
 * Page size for reading a rank's existing votes. The Geo API rejects `first`
 * above 1000 and injects a default of 100 when `first` is omitted, so an
 * unpaginated read silently drops every vote past the 100th.
 */
const VOTE_PAGE_SIZE = 1000;

type RankVotesPage = {
  nodes: Array<{ id: string; entityId: string }>;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

type RankVotesResponse = {
  entity?: { id: string } | null;
  relationsConnection: RankVotesPage | null;
};

function rankVotesQuery(rankId: string, after: string | null): string {
  // The first page also checks the rank exists; later pages only need the votes.
  const rankCheck = after === null ? `entity(id: "${rankId}") { id }` : '';
  const afterArg = after === null ? '' : `, after: ${JSON.stringify(after)}`;
  return `query rankVotes {
    ${rankCheck}
    relationsConnection(
      first: ${VOTE_PAGE_SIZE}${afterArg}
      filter: { fromEntityId: { is: "${rankId}" }, typeId: { is: "${RANK_VOTES_RELATION_TYPE}" } }
    ) {
      nodes {
        id
        entityId
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }`;
}

/**
 * Reads every `RANK_VOTES` relation on the rank, following cursors until the
 * last page. Cursor paging rather than `offset`, because the API also caps
 * `offset` at 1000.
 */
async function fetchExistingVotes(
  context: GeoClientContext,
  rankId: string,
): Promise<Array<{ relationId: string; voteEntityId: string }>> {
  const votes: Array<{ relationId: string; voteEntityId: string }> = [];
  let after: string | null = null;

  while (true) {
    let response: RankVotesResponse;
    try {
      response = await graphqlData<RankVotesResponse>(context, rankVotesQuery(rankId, after));
    } catch (error) {
      throw new UpdateRankError(`Could not fetch existing votes for rank ${rankId}: ${error}`);
    }

    if (after === null && !response.entity) {
      throw new UpdateRankError(`Rank ${rankId} not found`);
    }

    const page = response.relationsConnection;
    if (!page) {
      throw new UpdateRankError(`Could not fetch existing votes for rank ${rankId}: missing relationsConnection`);
    }

    for (const relation of page.nodes) {
      votes.push({ relationId: relation.id, voteEntityId: relation.entityId });
    }

    if (!page.pageInfo.hasNextPage) return votes;

    const next = page.pageInfo.endCursor;
    if (!next || next === after) {
      throw new UpdateRankError(`Could not fetch existing votes for rank ${rankId}: pagination cursor did not advance`);
    }
    after = next;
  }
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
