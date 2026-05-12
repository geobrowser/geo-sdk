import { createGeoClient } from '../client.js';
import type { CreateSpaceResult } from './types.js';

/**
 * Get the target address and calldata for creating a personal space.
 *
 * @deprecated Use `createGeoClient({ network }).personalSpaces.create()`.
 */
export function createSpace(): CreateSpaceResult {
  return createGeoClient({ network: 'TESTNET' }).personalSpaces.create();
}
