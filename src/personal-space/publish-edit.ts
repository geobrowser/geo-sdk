import { createGeoClient } from '../client.js';
import { isValid } from '../id.js';
import { UUID_DASHLESS_REGEX } from '../internal/uuid.js';
import { resolveGeoNetwork } from '../networks.js';
import type { PublishEditParams, PublishEditResult } from './types.js';

function assertValidSpaceId(spaceId: string) {
  const withoutPrefix = spaceId.startsWith('0x') ? spaceId.slice(2) : spaceId;
  if (UUID_DASHLESS_REGEX.test(withoutPrefix) || isValid(spaceId)) {
    return;
  }

  throw new Error(`Invalid spaceId: "${spaceId}". Expected a valid UUID or 32-character hex string.`);
}

/**
 * Publish an edit to IPFS and get the calldata for submitting it on-chain.
 *
 * @deprecated Use `createGeoClient({ network }).personalSpaces.publishEdit(...)`.
 */
export async function publishEdit(params: PublishEditParams): Promise<PublishEditResult> {
  const { network = 'TESTNET', ...args } = params;
  assertValidSpaceId(String(args.spaceId));
  return createGeoClient({ network: resolveGeoNetwork(network) }).personalSpaces.publishEdit(args);
}
