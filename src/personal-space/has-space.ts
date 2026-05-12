import type { Hex } from 'viem';
import { createGeoClient } from '../client.js';
import type { Networkish } from '../types.js';

/**
 * Checks whether an address already has a personal space.
 *
 * @deprecated Use `createGeoClient({ network }).personalSpaces.hasSpace(...)`.
 */
export async function hasSpace({
  address,
  network = 'TESTNET',
  rpcUrl,
}: {
  address: Hex;
  network?: Networkish;
  rpcUrl?: string;
}): Promise<boolean> {
  return createGeoClient({ network }).personalSpaces.hasSpace({ address, rpcUrl });
}
