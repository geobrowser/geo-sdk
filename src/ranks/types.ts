import type { Id } from '../id.js';
import type { CreateResult } from '../types.js';

export type RankType = 'ORDINAL' | 'WEIGHTED';

/**
 * Vote with ordinal positioning.
 * Position is derived from the array order; fractional indexing is generated internally.
 */
export type VoteOrdinal = {
  entityId: Id | string;
  spaceId: Id | string;
};

/**
 * Vote with weighted numeric scoring.
 * Used for ranked lists where the magnitude of the score matters.
 */
export type VoteWeighted = {
  entityId: Id | string;
  spaceId: Id | string;
  value: number;
};

export type Vote = VoteOrdinal | VoteWeighted;

export type CreateRankParams = {
  id?: Id | string;
  name: string;
  description?: string;
  rankType: RankType;
  blockId?: Id | string;
  votes: Vote[];
};

export type CreateRankResult = CreateResult & {
  voteIds: Id[]; // IDs of created vote entities for reference
};

/**
 * An existing vote relation on a rank, used by {@link UpdateRankParams} to
 * supersede the previous submission. `relationId` is the `RANK_VOTES` relation
 * to delete; `voteEntityId` is its reified vote entity (the relation's `entity`),
 * deleted alongside it so the prior submission leaves no orphaned vote entity.
 */
export type ExistingVoteRelation = {
  /** The `RANK_VOTES` relation to delete. */
  relationId: Id | string;
  /** The reified vote entity carried by the relation, deleted to avoid orphans. */
  voteEntityId: Id | string;
};

export type UpdateRankParams = {
  /** The `Rank` entity to update. */
  rankId: Id | string;
  rankType: RankType;
  /** The new, ordered list of votes that replaces the rank's current votes. */
  votes: Vote[];
  /**
   * The rank's current `RANK_VOTES` relations (and their reified vote entities),
   * which will be deleted.
   */
  existingVotes: ExistingVoteRelation[];
};

export type UpdateRankResult = CreateResult & {
  voteIds: Id[]; // IDs of the newly created vote entities for reference
};
