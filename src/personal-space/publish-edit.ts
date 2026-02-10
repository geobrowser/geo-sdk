import { encodeAbiParameters, encodeFunctionData, toHex } from 'viem';
import { TESTNET } from '../../contracts.js';
import { SpaceRegistryAbi } from '../abis/index.js';
import { isValid } from '../id.js';
import { toBytes } from '../id-utils.js';
import { UUID_DASHLESS_REGEX } from '../internal/uuid.js';
import * as Ipfs from '../ipfs.js';
import { EDITS_PUBLISHED, EMPTY_SIGNATURE, EMPTY_TOPIC } from './constants.js';
import type { PublishEditParams, PublishEditResult } from './types.js';

/**
 * Converts a spaceId to bytes16 hex format.
 * Accepts either a valid UUID (Id type) or a 32-char hex string (on-chain bytes16).
 */
function spaceIdToBytes16(spaceId: string): `0x${string}` {
  // If it's a 32-char hex string (bytes16 from on-chain), use directly
  // Check this first since on-chain space IDs may look like UUIDs but aren't valid ones
  if (UUID_DASHLESS_REGEX.test(spaceId)) {
    return `0x${spaceId.toLowerCase()}` as `0x${string}`;
  }

  // If it's a valid UUID (with dashes), use the standard toBytes conversion
  if (isValid(spaceId)) {
    const bytes = toBytes(spaceId);
    return toHex(bytes);
  }

  throw new Error(`Invalid spaceId: "${spaceId}". Expected a valid UUID or 32-character hex string.`);
}

/**
 * Publish an edit to IPFS and get the calldata for submitting it on-chain.
 *
 * This function:
 * 1. Validates the spaceId (accepts UUID or 32-char hex string)
 * 2. Publishes the ops to IPFS using the GRC-20 binary format
 * 3. Encodes the calldata for the Space Registry's `enter()` function
 *
 * @param params - The parameters for publishing the edit
 * @returns Object containing `editId`, `cid`, `to` (contract address), and `calldata`
 *
 * @example
 * ```ts
 * import { personalSpace, Graph } from '@geoprotocol/geo-sdk';
 *
 * const { ops } = Graph.createEntity({ name: 'Test' });
 * const { editId, cid, to, calldata } = await personalSpace.publishEdit({
 *   name: 'Add entity',
 *   spaceId: 'your-space-id',
 *   ops,
 *   author: 'your-personal-space-id',
 * });
 *
 * await walletClient.sendTransaction({ to, data: calldata });
 * ```
 */
export async function publishEdit(params: PublishEditParams): Promise<PublishEditResult> {
  const { name, spaceId, ops, author, network = 'TESTNET' } = params;

  const spaceIdBytes16 = spaceIdToBytes16(spaceId);

  const { cid, editId } = await Ipfs.publishEdit({
    name,
    ops,
    author,
    network,
  });

  // Encode the IPFS URI as ABI-encoded string (offset + length + data)
  // The indexer expects this format to extract the CID
  const encodedCid = encodeAbiParameters([{ type: 'string' }], [cid]);

  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [spaceIdBytes16, spaceIdBytes16, EDITS_PUBLISHED, EMPTY_TOPIC, encodedCid, EMPTY_SIGNATURE],
  });

  return {
    editId,
    cid,
    to: TESTNET.SPACE_REGISTRY_ADDRESS,
    calldata,
  };
}
