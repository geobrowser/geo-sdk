import { MAINNET, TESTNET } from '../contracts.js';
import type { GeoContractAddresses, GeoNetworkConfig, Networkish } from './types.js';

export const TESTNET_API_ORIGIN = 'https://testnet-api.geobrowser.io';
export const MAINNET_API_ORIGIN = 'https://api.geobrowser.io';

const GEO_TESTNET_RPC_URL = 'https://rpc-geo-test-zc16z3tcvf.t.conduit.xyz';
const GEO_MAINNET_RPC_URL = 'https://rpc-geo-genesis-h0q2s21xx8.t.conduit.xyz';

function asContractAddresses(contracts: Record<string, string | undefined>): GeoContractAddresses {
  return contracts as GeoContractAddresses;
}

export function defineGeoNetwork(config: GeoNetworkConfig): GeoNetworkConfig {
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

export const Networks = {
  TESTNET: defineGeoNetwork({
    id: 'TESTNET',
    name: 'Geo Testnet',
    apiOrigin: TESTNET_API_ORIGIN,
    chain: {
      id: 19411,
      name: 'Geo Testnet',
      rpcUrl: GEO_TESTNET_RPC_URL,
    },
    contracts: asContractAddresses(TESTNET),
  }),
  MAINNET: defineGeoNetwork({
    id: 'MAINNET',
    name: 'Geo Mainnet',
    apiOrigin: MAINNET_API_ORIGIN,
    chain: {
      id: 80451,
      name: 'Geo Mainnet',
      rpcUrl: GEO_MAINNET_RPC_URL,
    },
    contracts: asContractAddresses(MAINNET),
  }),
} as const;

export function resolveGeoNetwork(network: Networkish = 'TESTNET'): GeoNetworkConfig {
  if (network === 'TESTNET') {
    return Networks.TESTNET;
  }
  if (network === 'MAINNET') {
    return Networks.MAINNET;
  }
  if (typeof network === 'string') {
    throw new Error(`Unknown Geo network "${network}". Use Networks.TESTNET, Networks.MAINNET, or defineGeoNetwork().`);
  }

  return defineGeoNetwork(network);
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
