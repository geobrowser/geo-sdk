import { getCreatePersonalSpaceCalldata } from '../encodings/index.js';
import { requireGeoContract, resolveGeoNetwork } from '../networks.js';
import type { CreateSpaceParams, CreateSpaceResult } from './types.js';

/**
 * Get the target address and calldata for creating a personal space.
 *
 * @deprecated Use `createGeoClient({ network }).personalSpaces.create(...)`.
 */
export function createSpace({ network = 'TESTNET' }: CreateSpaceParams = {}): CreateSpaceResult {
  const config = resolveGeoNetwork(network);

  return {
    to: requireGeoContract(config, 'SPACE_REGISTRY_ADDRESS'),
    calldata: getCreatePersonalSpaceCalldata(),
  };
}
