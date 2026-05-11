import { encodeAbiParameters, encodeFunctionData, keccak256, toHex } from 'viem';
import { TESTNET } from '../../contracts.js';
import { SpaceRegistryAbi } from '../abis/index.js';
import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import type { Network } from '../types.js';

const EMPTY_SIGNATURE = '0x' as const;
const ENTITY_OBJECT_TYPE = '00000000';
const ENTITY_VOTE_VERSION = 0;
const UPVOTED_ACTION = keccak256(toHex('PERMISSIONLESS.UPVOTED'));
const DOWNVOTED_ACTION = keccak256(toHex('PERMISSIONLESS.DOWNVOTED'));
const UNVOTED_ACTION = keccak256(toHex('PERMISSIONLESS.UNVOTED'));

type EntityVoteAction = typeof UPVOTED_ACTION | typeof DOWNVOTED_ACTION | typeof UNVOTED_ACTION;

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

function idToBytes16(id: Id | string, sourceHint: string): `0x${string}` {
  const normalized = id.startsWith('0x') ? id.slice(2) : id.replaceAll('-', '');
  assertValid(normalized, sourceHint);

  return `0x${normalized.toLowerCase()}` as `0x${string}`;
}

function encodeEntityVoteTopic(entityId: Id | string): `0x${string}` {
  const normalizedEntityId = idToBytes16(entityId, '`entityId` in entity vote').slice(2);

  return `0x${ENTITY_OBJECT_TYPE}${normalizedEntityId}${'0'.repeat(24)}` as `0x${string}`;
}

function encodeEntityVoteData(authorSpaceId: `0x${string}`, spaceId: `0x${string}`): `0x${string}` {
  return encodeAbiParameters(
    [{ type: 'uint16' }, { type: 'bytes16' }, { type: 'bytes16' }],
    [ENTITY_VOTE_VERSION, authorSpaceId, spaceId],
  );
}

function getSpaceRegistryAddress(network: Network): `0x${string}` {
  switch (network) {
    case 'TESTNET':
      return TESTNET.SPACE_REGISTRY_ADDRESS;
  }
}

function createEntityVote(params: EntityVoteParams, action: EntityVoteAction): EntityVoteResult {
  const { authorSpaceId: rawAuthorSpaceId, spaceId: rawSpaceId, entityId, network = 'TESTNET' } = params;

  const authorSpaceId = idToBytes16(rawAuthorSpaceId, '`authorSpaceId` in entity vote');
  const spaceId = idToBytes16(rawSpaceId, '`spaceId` in entity vote');
  const topic = encodeEntityVoteTopic(entityId);
  const data = encodeEntityVoteData(authorSpaceId, spaceId);

  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [authorSpaceId, spaceId, action, topic, data, EMPTY_SIGNATURE],
  });

  return {
    to: getSpaceRegistryAddress(network),
    calldata,
  };
}

/**
 * Creates calldata for upvoting an entity.
 *
 * No IPFS publish is needed. Submit the returned calldata to the Space Registry.
 */
export function upvoteEntity(params: EntityVoteParams): EntityVoteResult {
  return createEntityVote(params, UPVOTED_ACTION);
}

/**
 * Creates calldata for downvoting an entity.
 *
 * No IPFS publish is needed. Submit the returned calldata to the Space Registry.
 */
export function downvoteEntity(params: EntityVoteParams): EntityVoteResult {
  return createEntityVote(params, DOWNVOTED_ACTION);
}

/**
 * Creates calldata for withdrawing the author's vote on an entity.
 *
 * No IPFS publish is needed. Submit the returned calldata to the Space Registry.
 */
export function withdrawEntityVote(params: EntityVoteParams): EntityVoteResult {
  return createEntityVote(params, UNVOTED_ACTION);
}
