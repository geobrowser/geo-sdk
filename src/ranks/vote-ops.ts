import {
  type PropertyValue as GrcPropertyValue,
  createEntity as grcCreateEntity,
  createRelation as grcCreateRelation,
  languages,
  type Op,
} from '@geoprotocol/grc-20';
import { generateNJitteredKeysBetween } from 'fractional-indexing-jittered';
import {
  RANK_VOTES_RELATION_TYPE,
  VOTE_ORDINAL_VALUE_PROPERTY,
  VOTE_WEIGHTED_VALUE_PROPERTY,
} from '../core/ids/system.js';
import type { Id } from '../id.js';
import { assertValid, generate, toGrcId } from '../id-utils.js';
import type { RankType, Vote, VoteWeighted } from './types.js';

function normalizeIdKey(id: string): string {
  return id.replaceAll('-', '').toLowerCase();
}

/**
 * Validates every vote and enforces `(entityId, spaceId)` uniqueness within a
 * rank. A rank may include the same `entityId` under multiple `spaceId`s (ranking
 * perspectives), so uniqueness is keyed on the pair rather than the entity alone.
 * The pair is compared after normalizing each ID, so a dashed and a dashless form
 * of the same UUID still collide.
 *
 * For `WEIGHTED` ranks every vote must carry a finite numeric `value` — the `Vote`
 * union is not discriminated by `rankType`, so this is enforced at runtime to stop
 * weighted ranks from emitting `undefined` float values.
 *
 * @throws When any `entityId`/`spaceId` is invalid, a weighted vote is missing a
 *   finite numeric `value`, or a `(entityId, spaceId)` pair is duplicated.
 */
export function validateVotes(votes: Vote[], rankType: RankType, context: string): void {
  const seen = new Set<string>();
  for (const vote of votes) {
    assertValid(vote.entityId, `\`entityId\` in \`votes\` in \`${context}\``);
    assertValid(vote.spaceId, `\`spaceId\` in \`votes\` in \`${context}\``);

    if (rankType === 'WEIGHTED') {
      const { value } = vote as VoteWeighted;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(
          `Weighted vote for "${String(vote.entityId)}" must have a finite numeric \`value\` in \`${context}\`.`,
        );
      }
    }

    // Key on the canonical (lowercase, dashless) form so a dashed and a dashless
    // — or differently-cased — spelling of the same UUID still collide.
    const key = `${normalizeIdKey(vote.entityId)}:${normalizeIdKey(vote.spaceId)}`;
    if (seen.has(key)) {
      throw new Error(
        `Duplicate (entityId, spaceId) in votes: "${String(vote.entityId)}:${String(vote.spaceId)}". Each entity can only be voted once per space perspective in a rank.`,
      );
    }
    seen.add(key);
  }
}

/**
 * Builds the vote relation + reified vote entity ops for a rank's votes.
 *
 * A fractional index is generated from the array order for every vote and set as
 * the vote relation's `position`, so clients can order votes natively by the
 * relation's `position` field. For ordinal ranks the same fractional index is
 * also stored as the ordinal value on the reified vote entity; weighted ranks
 * store the provided numeric value.
 *
 * Each vote relation also sets `toSpace` to the vote's `spaceId`, scoping the
 * ranked entity to a space perspective.
 *
 * Callers are expected to have validated the votes via {@link validateVotes}.
 */
export function buildVoteOps(rankId: Id | string, rankType: RankType, votes: Vote[]): { ops: Op[]; voteIds: Id[] } {
  const ops: Op[] = [];
  const voteIds: Id[] = [];

  const fractionalIndices = generateNJitteredKeysBetween(null, null, votes.length);

  votes.forEach((vote, i) => {
    const voteEntityId = generate();
    const relationId = generate();
    const position = fractionalIndices[i] as string;

    voteIds.push(voteEntityId);

    // Relation from rank to voted entity, scoped to the vote's space perspective.
    // `position` carries the order so clients can sort votes by the relation field.
    ops.push(
      grcCreateRelation({
        id: toGrcId(relationId),
        entity: toGrcId(voteEntityId),
        from: toGrcId(rankId),
        to: toGrcId(vote.entityId),
        relationType: toGrcId(RANK_VOTES_RELATION_TYPE),
        toSpace: toGrcId(vote.spaceId),
        position,
      }),
    );

    const voteValue: GrcPropertyValue =
      rankType === 'ORDINAL'
        ? {
            property: toGrcId(VOTE_ORDINAL_VALUE_PROPERTY),
            value: {
              type: 'text',
              value: position,
              language: languages.english(),
            },
          }
        : {
            property: toGrcId(VOTE_WEIGHTED_VALUE_PROPERTY),
            value: {
              type: 'float',
              value: (vote as VoteWeighted).value,
            },
          };

    ops.push(
      grcCreateEntity({
        id: toGrcId(voteEntityId),
        values: [voteValue],
      }),
    );
  });

  return { ops, voteIds };
}
