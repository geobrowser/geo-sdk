import { getApiOrigin as getNetworkApiOrigin, TESTNET_API_ORIGIN } from '../networks.js';
import type { Networkish } from '../types.js';

/**
 * @deprecated Use `GeoTestnetConfig.apiOrigin`.
 */
export { TESTNET_API_ORIGIN };

/**
 * @deprecated Use `GeoTestnetConfig.apiOrigin` for the built-in testnet API
 * origin, or `defineGeoNetworkConfig(...).apiOrigin` for custom network
 * configs.
 */
export function getApiOrigin(network: Networkish): string {
  return getNetworkApiOrigin(network);
}
