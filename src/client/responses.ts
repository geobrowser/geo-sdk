import { encodeAbiParameters, encodeFunctionData, keccak256, toHex } from 'viem';
import { SpaceRegistryAbi } from '../abis/index.js';
import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import { requireGeoContract } from '../networks.js';
import type { GeoClientContext } from './context.js';

const EMPTY_SIGNATURE = '0x' as const;
const ENTITY_OBJECT_TYPE = '00000000';
const ENTITY_RESPONSE_VERSION = 0;

function responseAction(name: string) {
  return {
    name,
    hash: keccak256(toHex(name)),
  } as const;
}

export const RESPONSE_ACTIONS = {
  upvote: responseAction('PERMISSIONLESS.UPVOTED'),
  downvote: responseAction('PERMISSIONLESS.DOWNVOTED'),
  unvote: responseAction('PERMISSIONLESS.UNVOTED'),
  agree: responseAction('PERMISSIONLESS.AGREED'),
  disagree: responseAction('PERMISSIONLESS.DISAGREED'),
  unagree: responseAction('PERMISSIONLESS.UNAGREED'),
  verify: responseAction('PERMISSIONLESS.VERIFIED'),
  dispute: responseAction('PERMISSIONLESS.DISPUTED'),
  unverify: responseAction('PERMISSIONLESS.UNVERIFIED'),
} as const;

type ResponseAction = (typeof RESPONSE_ACTIONS)[keyof typeof RESPONSE_ACTIONS]['hash'];

export type ClientResponseParams = {
  authorSpaceId: Id | string;
  spaceId: Id | string;
  entityId: Id | string;
};

export type ResponseCalldataParams = ClientResponseParams & {
  spaceRegistryAddress: `0x${string}`;
};

function idToBytes16(id: Id | string, sourceHint: string): `0x${string}` {
  const normalized = id.startsWith('0x') ? id.slice(2) : id.replaceAll('-', '');
  assertValid(normalized, sourceHint);

  return `0x${normalized.toLowerCase()}` as `0x${string}`;
}

function encodeEntityResponseTopic(entityId: Id | string): `0x${string}` {
  const normalizedEntityId = idToBytes16(entityId, '`entityId` in entity response').slice(2);

  return `0x${ENTITY_OBJECT_TYPE}${normalizedEntityId}${'0'.repeat(24)}` as `0x${string}`;
}

function encodeEntityResponseData(authorSpaceId: `0x${string}`, spaceId: `0x${string}`): `0x${string}` {
  return encodeAbiParameters(
    [{ type: 'uint16' }, { type: 'bytes16' }, { type: 'bytes16' }],
    [ENTITY_RESPONSE_VERSION, authorSpaceId, spaceId],
  );
}

function encodeEntityResponseCalldata(params: ResponseCalldataParams, action: ResponseAction) {
  const authorSpaceId = idToBytes16(params.authorSpaceId, '`authorSpaceId` in entity response');
  const spaceId = idToBytes16(params.spaceId, '`spaceId` in entity response');
  const topic = encodeEntityResponseTopic(params.entityId);
  const data = encodeEntityResponseData(authorSpaceId, spaceId);

  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [authorSpaceId, spaceId, action, topic, data, EMPTY_SIGNATURE],
  });

  return {
    to: params.spaceRegistryAddress,
    calldata,
  };
}

function withSpaceRegistry(context: GeoClientContext, params: ClientResponseParams): ResponseCalldataParams {
  return {
    ...params,
    spaceRegistryAddress: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
  };
}

function respond(context: GeoClientContext, params: ClientResponseParams, action: ResponseAction) {
  return encodeEntityResponseCalldata(withSpaceRegistry(context, params), action);
}

export function encodeUpvoteEntityResponseCalldata(params: ResponseCalldataParams) {
  return encodeEntityResponseCalldata(params, RESPONSE_ACTIONS.upvote.hash);
}

export function encodeDownvoteEntityResponseCalldata(params: ResponseCalldataParams) {
  return encodeEntityResponseCalldata(params, RESPONSE_ACTIONS.downvote.hash);
}

export function encodeUnvoteEntityResponseCalldata(params: ResponseCalldataParams) {
  return encodeEntityResponseCalldata(params, RESPONSE_ACTIONS.unvote.hash);
}

export function upvote(context: GeoClientContext, params: ClientResponseParams) {
  return respond(context, params, RESPONSE_ACTIONS.upvote.hash);
}

export function downvote(context: GeoClientContext, params: ClientResponseParams) {
  return respond(context, params, RESPONSE_ACTIONS.downvote.hash);
}

export function unvote(context: GeoClientContext, params: ClientResponseParams) {
  return respond(context, params, RESPONSE_ACTIONS.unvote.hash);
}

export function agree(context: GeoClientContext, params: ClientResponseParams) {
  return respond(context, params, RESPONSE_ACTIONS.agree.hash);
}

export function disagree(context: GeoClientContext, params: ClientResponseParams) {
  return respond(context, params, RESPONSE_ACTIONS.disagree.hash);
}

export function unagree(context: GeoClientContext, params: ClientResponseParams) {
  return respond(context, params, RESPONSE_ACTIONS.unagree.hash);
}

export function verify(context: GeoClientContext, params: ClientResponseParams) {
  return respond(context, params, RESPONSE_ACTIONS.verify.hash);
}

export function dispute(context: GeoClientContext, params: ClientResponseParams) {
  return respond(context, params, RESPONSE_ACTIONS.dispute.hash);
}

export function unverify(context: GeoClientContext, params: ClientResponseParams) {
  return respond(context, params, RESPONSE_ACTIONS.unverify.hash);
}
