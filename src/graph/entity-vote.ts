import { createGeoClient } from '../client.js';
import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import type { Network } from '../types.js';

export type EntityVoteParams = {
  /** The author's personal space ID. */
  authorSpaceId: Id | string;
  /** The space ID where the entity is being voted on. */
  spaceId: Id | string;
  /** The entity ID being voted on. */
  entityId: Id | string;
  /** Network to use (defaults to TESTNET). */
  network?: Network;
};

export type EntityVoteResult = {
  /** The contract address to send the transaction to (Space Registry). */
  to: `0x${string}`;
  /** The calldata for the Space Registry `enter()` function call. */
  calldata: `0x${string}`;
};

function validateEntityVoteId(id: Id | string, sourceHint: string) {
  const normalized = id.startsWith('0x') ? id.slice(2) : id.replaceAll('-', '');
  assertValid(normalized, sourceHint);
}

/**
 * Creates calldata for upvoting an entity.
 *
 * @deprecated Use `createGeoClient({ network }).entityVotes.upvote(...)`.
 */
export function upvoteEntity(params: EntityVoteParams): EntityVoteResult {
  const { network = 'TESTNET', ...args } = params;
  validateEntityVoteId(args.authorSpaceId, '`authorSpaceId` in entity vote');
  validateEntityVoteId(args.spaceId, '`spaceId` in entity vote');
  validateEntityVoteId(args.entityId, '`entityId` in entity vote');
  return createGeoClient({ network }).entityVotes.upvote(args);
}

/**
 * Creates calldata for downvoting an entity.
 *
 * @deprecated Use `createGeoClient({ network }).entityVotes.downvote(...)`.
 */
export function downvoteEntity(params: EntityVoteParams): EntityVoteResult {
  const { network = 'TESTNET', ...args } = params;
  validateEntityVoteId(args.authorSpaceId, '`authorSpaceId` in entity vote');
  validateEntityVoteId(args.spaceId, '`spaceId` in entity vote');
  validateEntityVoteId(args.entityId, '`entityId` in entity vote');
  return createGeoClient({ network }).entityVotes.downvote(args);
}

/**
 * Creates calldata for withdrawing the author's vote on an entity.
 *
 * @deprecated Use `createGeoClient({ network }).entityVotes.withdraw(...)`.
 */
export function withdrawEntityVote(params: EntityVoteParams): EntityVoteResult {
  const { network = 'TESTNET', ...args } = params;
  validateEntityVoteId(args.authorSpaceId, '`authorSpaceId` in entity vote');
  validateEntityVoteId(args.spaceId, '`spaceId` in entity vote');
  validateEntityVoteId(args.entityId, '`entityId` in entity vote');
  return createGeoClient({ network }).entityVotes.withdraw(args);
}
