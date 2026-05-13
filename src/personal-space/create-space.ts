import { TESTNET } from '../../contracts.js';
import { getCreatePersonalSpaceCalldata } from '../encodings/index.js';
import type { CreateSpaceResult } from './types.js';

/**
 * Get the target address and calldata for creating a personal space.
 *
 * @deprecated Use `createGeoClient({ network }).personalSpaces.create(...)`.
 */
export function createSpace(): CreateSpaceResult {
  return {
    to: TESTNET.SPACE_REGISTRY_ADDRESS,
    calldata: getCreatePersonalSpaceCalldata(),
  };
}
