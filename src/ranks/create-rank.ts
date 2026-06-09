import {
  type PropertyValue as GrcPropertyValue,
  createEntity as grcCreateEntity,
  createRelation as grcCreateRelation,
  languages,
  type Op,
} from '@geoprotocol/grc-20';
import {
  DESCRIPTION_PROPERTY,
  NAME_PROPERTY,
  RANK_BLOCK_RELATION_TYPE,
  RANK_TYPE,
  RANK_TYPE_PROPERTY,
  TYPES_PROPERTY,
} from '../core/ids/system.js';
import { Id } from '../id.js';
import { assertValid, generate, toGrcId } from '../id-utils.js';
import type { CreateRankParams, CreateRankResult } from './types.js';
import { buildVoteOps, validateVotes } from './vote-ops.js';

/**
 * Creates a rank entity with the given name, description, rankType, and votes.
 * All IDs passed to this function are validated. If any invalid ID is provided,
 * the function will throw an error.
 *
 * Each vote must carry a `spaceId` that scopes the ranked entity to a space
 * perspective (set as `to_space_id` on the vote relation). A rank may therefore
 * include the same entity across multiple spaces; item uniqueness is keyed on
 * `(entityId, spaceId)`.
 *
 * A fractional index is generated from the array order and set as each vote
 * relation's `position`, so clients can order votes natively. For ORDINAL ranks
 * the same fractional index is stored on the reified vote entity.
 *
 * When `blockId` is provided, a `Rank → Ranking Block` relation is emitted to
 * associate the rank with a ranking block. The link may also be added later.
 *
 * @example
 * ```ts
 * // Create an ordinal rank (ordered list) - position derived from array order
 * const { id, ops, voteIds } = createRank({
 *   id: rankId, // optional, will be generated if not provided
 *   name: 'My Favorite Movies',
 *   description: 'A ranked list of my favorite movies', // optional
 *   rankType: 'ORDINAL',
 *   blockId, // optional, links the rank to a Ranking Block
 *   votes: [
 *     { entityId: movie1Id, spaceId },  // 1st place
 *     { entityId: movie2Id, spaceId },  // 2nd place
 *     { entityId: movie3Id, spaceId },  // 3rd place
 *   ],
 * });
 *
 * // Create a weighted rank (scored list)
 * const { id, ops, voteIds } = createRank({
 *   name: 'Restaurant Ratings',
 *   rankType: 'WEIGHTED',
 *   votes: [
 *     { entityId: restaurant1Id, spaceId, value: 4.5 },  // numeric score
 *     { entityId: restaurant2Id, spaceId, value: 3.8 },
 *   ],
 * });
 * ```
 *
 * @param params – {@link CreateRankParams}
 * @returns – {@link CreateRankResult}
 * @throws Will throw an error if any provided ID is invalid
 * @throws Will throw an error if any `(entityId, spaceId)` pair is duplicated in votes
 */
export const createRank = ({
  id: providedId,
  name,
  description,
  rankType,
  blockId,
  votes,
}: CreateRankParams): CreateRankResult => {
  // Validate all input IDs
  if (providedId) {
    assertValid(providedId, '`id` in `createRank`');
  }
  if (blockId) {
    assertValid(blockId, '`blockId` in `createRank`');
  }
  validateVotes(votes, rankType, 'createRank');

  const id = providedId ?? generate();
  const ops: Op[] = [];

  // Create rank entity values
  const rankValues: GrcPropertyValue[] = [
    {
      property: toGrcId(NAME_PROPERTY),
      value: {
        type: 'text',
        value: name,
        language: languages.english(),
      },
    },
    {
      property: toGrcId(RANK_TYPE_PROPERTY),
      value: {
        type: 'text',
        value: rankType,
        language: languages.english(),
      },
    },
  ];

  if (description) {
    rankValues.push({
      property: toGrcId(DESCRIPTION_PROPERTY),
      value: {
        type: 'text',
        value: description,
        language: languages.english(),
      },
    });
  }

  // Create createEntity op for the rank
  ops.push(
    grcCreateEntity({
      id: toGrcId(id),
      values: rankValues,
    }),
  );

  // Create relation linking rank to RANK_TYPE (type relation)
  ops.push(
    grcCreateRelation({
      id: toGrcId(generate()),
      entity: toGrcId(generate()),
      from: toGrcId(id),
      to: toGrcId(RANK_TYPE),
      relationType: toGrcId(TYPES_PROPERTY),
    }),
  );

  // Optionally link the rank to its Ranking Block
  if (blockId) {
    ops.push(
      grcCreateRelation({
        id: toGrcId(generate()),
        entity: toGrcId(generate()),
        from: toGrcId(id),
        to: toGrcId(blockId),
        relationType: toGrcId(RANK_BLOCK_RELATION_TYPE),
      }),
    );
  }

  // Create vote relations + reified vote entities
  const { ops: voteOps, voteIds } = buildVoteOps(id, rankType, votes);
  ops.push(...voteOps);

  return { id: Id(id), ops, voteIds };
};
