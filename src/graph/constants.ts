import { getApiOrigin as getNetworkApiOrigin, TESTNET_API_ORIGIN } from '../networks.js';
import type { Networkish } from '../types.js';

export { TESTNET_API_ORIGIN };

export function getApiOrigin(network: Networkish): string {
  return getNetworkApiOrigin(network);
}
