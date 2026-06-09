import { createRank } from '../ranks/create-rank.js';
import type { CreateRankParams, CreateRankResult } from '../ranks/types.js';

/**
 * Builds create-rank ops (pure, no network access).
 *
 * Each vote carries a `spaceId` (set as `to_space_id` on the vote relation), so
 * a rank can include the same entity across multiple space perspectives; item
 * uniqueness is keyed on `(entityId, spaceId)`. Pass an optional `blockId` to
 * link the rank to a `Ranking Block`.
 *
 * For re-submissions use `geo.ranks.update(...)`, which fetches the rank's
 * existing vote relations and supersedes them.
 *
 * @example
 * ```ts
 * import { Ops } from '@geoprotocol/geo-sdk';
 *
 * const { id, ops, voteIds } = Ops.ranks.create({
 *   name: 'My Favorite Movies',
 *   rankType: 'ORDINAL',
 *   blockId, // optional
 *   votes: [
 *     { entityId: movie1Id, spaceId },
 *     { entityId: movie2Id, spaceId },
 *   ],
 * });
 * ```
 *
 * @param params Rank name, type, optional block link, and ordered votes.
 * @returns Rank entity ID, ops, and the created vote entity IDs.
 * @throws When any supplied ID is invalid, or a `(entityId, spaceId)` pair is duplicated.
 */
export const create = (params: CreateRankParams): CreateRankResult => createRank(params);
