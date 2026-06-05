import { RANK_VOTES_RELATION_TYPE } from '../core/ids/system.js';
import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import { createRank } from '../ranks/create-rank.js';
import type { CreateRankParams, CreateRankResult, RankType, UpdateRankResult, Vote } from '../ranks/types.js';
import { updateRank } from '../ranks/update-rank.js';
import { graphqlData } from './api.js';
import type { GeoClientContext } from './context.js';

class UpdateRankError extends Error {
  readonly _tag = 'UpdateRankError';
}

type RankRelationsResponse = {
  entity: {
    relationsList: Array<{ id: string }>;
  } | null;
};

export type UpdateRankClientParams = {
  /** The `Rank` entity to update. */
  rankId: Id | string;
  /** Whether the rank stores ordinal positions or weighted scores. */
  rankType: RankType;
  /** The new, ordered list of votes that replaces the rank's current votes. */
  votes: Vote[];
};

/**
 * Builds rank creation ops. Thin wrapper over the pure {@link createRank}
 * builder, exposed on the client so all rank workflows share one namespace.
 *
 * @example
 * ```ts
 * const { id, ops, voteIds } = geo.ranks.create({
 *   name: 'My Favorite Movies',
 *   rankType: 'ORDINAL',
 *   blockId,
 *   votes: [
 *     { entityId: movie1Id, spaceId },
 *     { entityId: movie2Id, spaceId },
 *   ],
 * });
 * ```
 *
 * @param params Rank name, type, optional block link, and ordered votes.
 * @returns Rank entity ID, ops, and the created vote entity IDs.
 */
export function create(params: CreateRankParams): CreateRankResult {
  return createRank(params);
}

/**
 * Fetches the rank's current `RANK_VOTES` relations from the configured Geo API,
 * then builds ops that delete them and re-emit the new ordered votes.
 *
 * This keeps the update self-contained — no indexer involvement is required to
 * supersede a prior submission, because the SDK resolves the relations to delete
 * itself. Use the pure `Rank.updateRank(...)` builder when the existing vote
 * relations are already known.
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

  const query = `query entity {
    entity(id: "${rankId}") {
      relationsList(filter: { typeId: { in: ["${RANK_VOTES_RELATION_TYPE}"] } }) {
        id
      }
    }
  }`;

  let response: RankRelationsResponse;
  try {
    response = await graphqlData<RankRelationsResponse>(context, query);
  } catch (error) {
    throw new UpdateRankError(`Could not fetch existing votes for rank ${rankId}: ${error}`);
  }

  if (!response.entity) {
    throw new UpdateRankError(`Rank ${rankId} not found`);
  }

  const existingVotes = response.entity.relationsList.map(relation => ({ relationId: relation.id }));

  return updateRank({ rankId, rankType, votes, existingVotes });
}
