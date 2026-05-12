import { encodeAbiParameters, encodeFunctionData, toHex } from 'viem';
import { SpaceRegistryAbi } from '../abis/index.js';
import type { Id } from '../id.js';
import { isValid } from '../id.js';
import { toBytes } from '../id-utils.js';
import { UUID_DASHLESS_REGEX } from '../internal/uuid.js';
import { type PublishEditParams, publishEditCore } from '../ipfs-core.js';
import { requireGeoContract } from '../networks.js';
import { EDITS_PUBLISHED, EMPTY_SIGNATURE, EMPTY_TOPIC } from '../personal-space/constants.js';
import type { GeoClientContext } from './context.js';
import { requireFetch } from './context.js';

export type PublishEditToSpaceParams = PublishEditParams & {
  spaceId: Id | string;
};

export type PublishEditToSpaceCalldataParams = {
  spaceId: Id | string;
  cid: `ipfs://${string}`;
  spaceRegistryAddress: `0x${string}`;
};

function spaceIdToBytes16(spaceId: string): `0x${string}` {
  if (UUID_DASHLESS_REGEX.test(spaceId)) {
    return `0x${spaceId.toLowerCase()}` as `0x${string}`;
  }

  if (isValid(spaceId)) {
    return toHex(toBytes(spaceId));
  }

  throw new Error(`Invalid spaceId: "${spaceId}". Expected a valid UUID or 32-character hex string.`);
}

export function encodePublishEditToSpaceCalldata({
  spaceId,
  cid,
  spaceRegistryAddress,
}: PublishEditToSpaceCalldataParams) {
  const spaceIdBytes16 = spaceIdToBytes16(spaceId);
  const encodedCid = encodeAbiParameters([{ type: 'string' }], [cid]);
  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [spaceIdBytes16, spaceIdBytes16, EDITS_PUBLISHED, EMPTY_TOPIC, encodedCid, EMPTY_SIGNATURE],
  });

  return {
    to: spaceRegistryAddress,
    calldata,
  };
}

export function publish(context: GeoClientContext, params: PublishEditParams) {
  return publishEditCore({
    ...params,
    apiOrigin: context.network.apiOrigin,
    fetch: requireFetch(context, 'Edit publishing'),
  });
}

export async function publishToSpace(context: GeoClientContext, params: PublishEditToSpaceParams) {
  const spaceRegistryAddress = requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS');
  const { cid, editId } = await publish(context, params);
  const { to, calldata } = encodePublishEditToSpaceCalldata({
    spaceId: params.spaceId,
    cid,
    spaceRegistryAddress,
  });

  return {
    editId,
    cid,
    to,
    calldata,
  };
}
