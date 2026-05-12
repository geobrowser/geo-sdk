import { encodeAbiParameters, encodeFunctionData, keccak256, toHex } from 'viem';
import { SpaceRegistryAbi } from '../abis/index.js';
import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import { requireGeoContract } from '../networks.js';
import type { GeoClientContext } from './context.js';

const EMPTY_SIGNATURE = '0x' as const;
const ENTITY_OBJECT_TYPE = '00000000';
const ENTITY_VOTE_VERSION = 0;
const UPVOTED_ACTION = keccak256(toHex('PERMISSIONLESS.UPVOTED'));
const DOWNVOTED_ACTION = keccak256(toHex('PERMISSIONLESS.DOWNVOTED'));
const UNVOTED_ACTION = keccak256(toHex('PERMISSIONLESS.UNVOTED'));

type EntityVoteAction = typeof UPVOTED_ACTION | typeof DOWNVOTED_ACTION | typeof UNVOTED_ACTION;

export type ClientEntityVoteParams = {
  authorSpaceId: Id | string;
  spaceId: Id | string;
  entityId: Id | string;
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

function createEntityVote(context: GeoClientContext, params: ClientEntityVoteParams, action: EntityVoteAction) {
  const authorSpaceId = idToBytes16(params.authorSpaceId, '`authorSpaceId` in entity vote');
  const spaceId = idToBytes16(params.spaceId, '`spaceId` in entity vote');
  const topic = encodeEntityVoteTopic(params.entityId);
  const data = encodeEntityVoteData(authorSpaceId, spaceId);

  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [authorSpaceId, spaceId, action, topic, data, EMPTY_SIGNATURE],
  });

  return {
    to: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
    calldata,
  };
}

export function createEntityVotesClient(context: GeoClientContext) {
  return {
    upvote(params: ClientEntityVoteParams) {
      return createEntityVote(context, params, UPVOTED_ACTION);
    },
    downvote(params: ClientEntityVoteParams) {
      return createEntityVote(context, params, DOWNVOTED_ACTION);
    },
    withdraw(params: ClientEntityVoteParams) {
      return createEntityVote(context, params, UNVOTED_ACTION);
    },
  };
}
