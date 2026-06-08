import { deleteEntity as grcDeleteEntity, deleteRelation as grcDeleteRelation, type Op } from '@geoprotocol/grc-20';
import { Id } from '../id.js';
import { assertValid, toGrcId } from '../id-utils.js';
import type { UpdateRankParams, UpdateRankResult } from './types.js';
import { buildVoteOps, validateVotes } from './vote-ops.js';

/**
 * Updates an existing rank's votes (a re-submission). This is the pure
 * op-builder: it deletes the rank's current `RANK_VOTES` relations and their
 * reified vote entities (passed in `existingVotes`) and re-emits the new ordered
 * votes. Deleting the reified vote entity prevents the prior submission from
 * leaving orphaned entities behind.
 *
 * Because the SDK does not read from the graph, callers must supply the current
 * vote relations to supersede. Prefer the `geo.ranks.update(...)` client helper,
 * which fetches them from the configured Geo API and delegates here.
 *
 * The new votes follow the same rules as {@link createRank}: each vote carries a
 * `spaceId` (set as `to_space_id`), uniqueness is keyed on `(entityId, spaceId)`,
 * and a fractional index is generated per vote and set as the relation
 * `position`.
 *
 * @example
 * ```ts
 * const { id, ops, voteIds } = updateRank({
 *   rankId,
 *   rankType: 'ORDINAL',
 *   votes: [
 *     { entityId: movie2Id, spaceId }, // promoted to 1st
 *     { entityId: movie1Id, spaceId },
 *   ],
 *   existingVotes: [
 *     { relationId: existingRelation1Id, voteEntityId: existingVote1Id },
 *     { relationId: existingRelation2Id, voteEntityId: existingVote2Id },
 *   ],
 * });
 * ```
 *
 * @param params – {@link UpdateRankParams}
 * @returns – {@link UpdateRankResult}
 * @throws Will throw an error if any provided ID is invalid
 * @throws Will throw an error if any `(entityId, spaceId)` pair is duplicated in votes
 */
export const updateRank = ({ rankId, rankType, votes, existingVotes }: UpdateRankParams): UpdateRankResult => {
  assertValid(rankId, '`rankId` in `updateRank`');
  for (const existing of existingVotes) {
    assertValid(existing.relationId, '`relationId` in `existingVotes` in `updateRank`');
    assertValid(existing.voteEntityId, '`voteEntityId` in `existingVotes` in `updateRank`');
  }
  validateVotes(votes, 'updateRank');

  const ops: Op[] = [];

  // Delete the rank's current vote relations and their reified vote entities to
  // supersede the prior submission without leaving orphaned entities behind.
  for (const existing of existingVotes) {
    ops.push(grcDeleteRelation(toGrcId(existing.relationId)));
    ops.push(grcDeleteEntity(toGrcId(existing.voteEntityId)));
  }

  // Re-emit the new ordered votes.
  const { ops: voteOps, voteIds } = buildVoteOps(rankId, rankType, votes);
  ops.push(...voteOps);

  return { id: Id(rankId), ops, voteIds };
};
