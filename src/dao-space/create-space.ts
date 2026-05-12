import { createGeoClient } from '../client.js';
import type { CreateSpaceParams, CreateSpaceResult } from './types.js';

/**
 * Get the target address and calldata for creating a DAO space.
 *
 * @deprecated Use `createGeoClient({ network }).daoSpaces.create(...)`.
 */
export async function createSpace(params: CreateSpaceParams): Promise<CreateSpaceResult> {
  const { network = 'TESTNET', ...args } = params;
  return createGeoClient({ network }).daoSpaces.create(args);
}
