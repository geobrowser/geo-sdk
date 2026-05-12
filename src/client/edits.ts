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

type PublishEditToSpaceParams = PublishEditParams & {
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

/**
 * Encodes personal-space edit publish calldata.
 *
 * Use this when an edit is already uploaded and you only need calldata for the
 * configured or supplied space registry. The function accepts dashless UUID
 * space IDs and valid SDK IDs.
 *
 * @example
 * ```ts
 * const tx = encodePublishEditToSpaceCalldata({
 *   spaceId,
 *   cid: 'ipfs://bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
 *   spaceRegistryAddress: '0x0000000000000000000000000000000000000000',
 * });
 *
 * await walletClient.sendTransaction({
 *   to: tx.to,
 *   data: tx.calldata,
 * });
 * ```
 *
 * @param params Space ID, edit CID, and space registry address.
 * @returns Target registry address and encoded calldata.
 * @throws When the space ID is not a valid UUID or SDK ID.
 */
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

/**
 * Publishes edit ops to IPFS using the configured Geo API.
 *
 * This helper creates a GRC-20 edit payload, uploads it, and returns the edit
 * CID and generated edit ID. It does not create transaction calldata.
 *
 * @example
 * ```ts
 * import * as Ops from '@geoprotocol/geo-sdk/ops';
 *
 * const { ops } = Ops.entities.create({ name: 'Geo entity' });
 * const edit = await publish(context, {
 *   name: 'Create Geo entity',
 *   author: authorSpaceId,
 *   ops,
 * });
 *
 * console.log(edit.cid);
 * ```
 *
 * @param context Client context containing API origin and fetch configuration.
 * @param params Edit name, author space ID, and ops to publish.
 * @returns Uploaded edit CID and generated edit ID.
 * @throws When ops are empty, IDs are invalid, fetch is unavailable, upload fails, or the CID response is invalid.
 */
export function publish(context: GeoClientContext, params: PublishEditParams) {
  return publishEditCore({
    ...params,
    apiOrigin: context.network.apiOrigin,
    fetch: requireFetch(context, 'Edit publishing'),
  });
}

/**
 * Publishes edit ops to IPFS and returns calldata for submitting the edit to a personal space.
 *
 * This combines {@link publish} and {@link encodePublishEditToSpaceCalldata}
 * using the space registry address from the configured network.
 *
 * @example
 * ```ts
 * const tx = await geo.personalSpaces.publishEdit({
 *   name: 'Create entity',
 *   spaceId,
 *   author: spaceId,
 *   ops,
 * });
 *
 * await walletClient.sendTransaction({
 *   to: tx.to,
 *   data: tx.calldata,
 * });
 * ```
 *
 * @param context Client context containing network, contract, and fetch configuration.
 * @param params Edit publication params plus the target space ID.
 * @returns Edit ID, CID, target registry address, and calldata.
 * @throws When required contract addresses are missing or publish/calldata validation fails.
 */
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
