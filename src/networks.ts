import { TESTNET } from '../contracts.js';
import type { GeoContractAddresses, GeoNetworkConfig, Networkish } from './types.js';

export const TESTNET_API_ORIGIN = 'https://testnet-api-v2.geobrowser.io';

const GEO_TESTNET_RPC_URL = 'https://rpc-geo-testnet-irdc0cgb0w.t.conduit.xyz';

function asContractAddresses(contracts: Record<string, string | undefined>): GeoContractAddresses {
  return contracts as GeoContractAddresses;
}

/**
 * Defines a Geo network configuration for `createGeoClient`.
 *
 * Use this for local contract deployments, private testnets, or any environment
 * that is not covered by the built-in `GeoTestnetConfig`.
 *
 * @example
 * ```ts
 * import { createGeoClient, defineGeoNetworkConfig } from '@geoprotocol/geo-sdk';
 *
 * const localGeo = defineGeoNetworkConfig({
 *   id: 'LOCAL',
 *   name: 'Local Geo',
 *   apiOrigin: 'http://localhost:3000',
 *   chain: {
 *     id: 31337,
 *     name: 'Anvil',
 *     rpcUrl: 'http://localhost:8545',
 *   },
 *   contracts: {
 *     SPACE_REGISTRY_ADDRESS: '0x0000000000000000000000000000000000000000',
 *     DAO_SPACE_FACTORY_ADDRESS: '0x0000000000000000000000000000000000000000',
 *   },
 * });
 *
 * const geo = createGeoClient({ network: localGeo });
 * ```
 */
export function defineGeoNetworkConfig(config: GeoNetworkConfig): GeoNetworkConfig {
  if (!config.id) {
    throw new Error('Geo network config requires an `id`');
  }
  if (!config.name) {
    throw new Error('Geo network config requires a `name`');
  }
  if (!config.apiOrigin) {
    throw new Error('Geo network config requires an `apiOrigin`');
  }

  return {
    ...config,
    contracts: config.contracts ?? {},
  };
}

/**
 * Built-in Geo testnet configuration.
 *
 * @example
 * ```ts
 * import { createGeoClient, GeoTestnetConfig } from '@geoprotocol/geo-sdk';
 *
 * const geo = createGeoClient({ network: GeoTestnetConfig });
 * ```
 */
export const GeoTestnetConfig = defineGeoNetworkConfig({
  id: 'TESTNET',
  name: 'Geo Testnet',
  apiOrigin: TESTNET_API_ORIGIN,
  chain: {
    id: 55516,
    name: 'Geo Testnet',
    rpcUrl: GEO_TESTNET_RPC_URL,
  },
  contracts: asContractAddresses(TESTNET),
});

export function resolveGeoNetwork(network: Networkish = 'TESTNET'): GeoNetworkConfig {
  if (network === 'TESTNET') {
    return GeoTestnetConfig;
  }
  if (typeof network === 'string') {
    throw new Error(`Unknown Geo network "${network}". Use GeoTestnetConfig or defineGeoNetworkConfig().`);
  }

  return defineGeoNetworkConfig(network);
}

export function requireGeoContract(network: GeoNetworkConfig, name: keyof GeoContractAddresses): `0x${string}` {
  const address = network.contracts?.[name];
  if (!address) {
    throw new Error(`Geo network "${network.name}" is missing required contract address ${name}`);
  }

  return address;
}

export function getApiOrigin(network: Networkish = 'TESTNET'): string {
  return resolveGeoNetwork(network).apiOrigin;
}
