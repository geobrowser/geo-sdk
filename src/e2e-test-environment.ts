import { readFileSync } from 'node:fs';
import type { Chain } from 'viem';
import { defineGeoNetworkConfig, GeoTestnetConfig } from './networks.js';
import type { GeoNetworkConfig, Networkish } from './types.js';

type LocalGeobrowserDeployments = {
  spaceRegistry: `0x${string}`;
  daoSpaceFactory: `0x${string}`;
  daoSpace?: `0x${string}`;
  owner?: `0x${string}`;
  rpcUrl?: string;
};

export type E2ETestEnvironment = {
  network: GeoNetworkConfig;
  networkish: Networkish;
  privateKey: `0x${string}`;
  rpcUrl: string;
  zeroDevRpcUrl?: string;
  apiOrigin: string;
  chain: Chain;
  contracts: {
    SPACE_REGISTRY_ADDRESS: `0x${string}`;
    DAO_SPACE_FACTORY_ADDRESS: `0x${string}`;
  };
  localGeobrowserPath?: string;
  localGeobrowserDeployments?: LocalGeobrowserDeployments;
};

const DEFAULT_LOCAL_GEOBROWSER_PRIVATE_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const INDEXED_LOCAL_GEOBROWSER_DAO_FACTORIES: Record<string, `0x${string}`> = {
  // First deterministic local-geobrowser deployment. The running hermes-substream
  // may still be compiled against this registry after contracts are redeployed.
  '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512': '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
};

function requireHexPrivateKey(value: string | undefined, source: string): `0x${string}` {
  if (!value) {
    throw new Error(`${source} is required for e2e tests.`);
  }
  if (!value.startsWith('0x')) {
    throw new Error(`${source} must be a hex string starting with 0x.`);
  }

  return value as `0x${string}`;
}

function requireEnv(value: string | undefined, source: string): string {
  if (!value) {
    throw new Error(
      `${source} is required for local-geobrowser e2e tests. Omit GEO_E2E_NETWORK to run against testnet.`,
    );
  }

  return value;
}

function requireNetworkRpcUrl(network: GeoNetworkConfig): string {
  const rpcUrl = network.chain?.rpcUrl;
  if (!rpcUrl) {
    throw new Error(`Geo network "${network.name}" is missing an RPC URL`);
  }

  return rpcUrl;
}

function requireNetworkContract(
  network: GeoNetworkConfig,
  name: 'SPACE_REGISTRY_ADDRESS' | 'DAO_SPACE_FACTORY_ADDRESS',
): `0x${string}` {
  const address = network.contracts?.[name];
  if (!address) {
    throw new Error(`Geo network "${network.name}" is missing ${name}`);
  }

  return address;
}

function createChain(network: GeoNetworkConfig, rpcUrl: string): Chain {
  const chainConfig = network.chain;
  if (!chainConfig) {
    throw new Error(`Geo network "${network.name}" is missing chain config`);
  }

  return {
    id: chainConfig.id,
    name: chainConfig.name,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  };
}

function readLocalGeobrowserDeployments():
  | {
      path: string;
      deployments: LocalGeobrowserDeployments;
    }
  | undefined {
  if (process.env.GEO_E2E_NETWORK === 'TESTNET') {
    return undefined;
  }
  if (!process.env.GEO_LOCAL_GEOBROWSER_PATH && process.env.GEO_E2E_NETWORK !== 'LOCAL_GEOBROWSER') {
    return undefined;
  }

  const localGeobrowserPath = requireEnv(process.env.GEO_LOCAL_GEOBROWSER_PATH, 'GEO_LOCAL_GEOBROWSER_PATH');
  const deploymentsPath = process.env.GEO_LOCAL_GEOBROWSER_DEPLOYMENTS ?? `${localGeobrowserPath}/.deployments.json`;

  try {
    return {
      path: localGeobrowserPath,
      deployments: JSON.parse(readFileSync(deploymentsPath, 'utf8')) as LocalGeobrowserDeployments,
    };
  } catch {
    throw new Error(
      `Could not read local-geobrowser deployments from ${deploymentsPath}. Set GEO_LOCAL_GEOBROWSER_DEPLOYMENTS to override the path.`,
    );
  }
}

function readIndexedLocalSpaceRegistry(localGeobrowserPath: string): `0x${string}` | undefined {
  try {
    const source = readFileSync(`${localGeobrowserPath}/gaia/hermes-substream/src/lib.rs`, 'utf8');
    const match = /\nconst SPACE_REGISTRY_ADDRESS:[\s\S]*?=\s*\[([\s\S]*?)\];/.exec(source);
    const bytes = match?.[1]?.match(/0x[0-9a-fA-F]{2}/g);
    if (!bytes || bytes.length !== 20) {
      return undefined;
    }

    return `0x${bytes.map(byte => byte.slice(2)).join('')}` as `0x${string}`;
  } catch {
    return undefined;
  }
}

export function createE2ETestEnvironment(): E2ETestEnvironment {
  const local = readLocalGeobrowserDeployments();

  if (local) {
    const rpcUrl = process.env.GEO_LOCAL_GEOBROWSER_RPC_URL ?? local.deployments.rpcUrl ?? 'http://localhost:8545';
    const apiOrigin = process.env.GEO_LOCAL_GEOBROWSER_API_ORIGIN ?? 'http://localhost:3000';
    const indexedSpaceRegistry = readIndexedLocalSpaceRegistry(local.path);
    const spaceRegistryAddress =
      (process.env.GEO_LOCAL_GEOBROWSER_SPACE_REGISTRY_ADDRESS as `0x${string}` | undefined) ??
      indexedSpaceRegistry ??
      local.deployments.spaceRegistry;
    const daoSpaceFactoryAddress =
      (process.env.GEO_LOCAL_GEOBROWSER_DAO_SPACE_FACTORY_ADDRESS as `0x${string}` | undefined) ??
      (spaceRegistryAddress.toLowerCase() === local.deployments.spaceRegistry.toLowerCase()
        ? local.deployments.daoSpaceFactory
        : (INDEXED_LOCAL_GEOBROWSER_DAO_FACTORIES[spaceRegistryAddress.toLowerCase()] ??
          local.deployments.daoSpaceFactory));
    const network = defineGeoNetworkConfig({
      id: 'LOCAL_GEOBROWSER',
      name: 'Local Geobrowser',
      apiOrigin,
      chain: {
        id: Number(process.env.GEO_LOCAL_GEOBROWSER_CHAIN_ID ?? 1337),
        name: 'Anvil',
        rpcUrl,
      },
      contracts: {
        SPACE_REGISTRY_ADDRESS: spaceRegistryAddress,
        DAO_SPACE_FACTORY_ADDRESS: daoSpaceFactoryAddress,
      },
    });

    return {
      network,
      networkish: network,
      privateKey: requireHexPrivateKey(
        process.env.GEO_LOCAL_GEOBROWSER_PRIVATE_KEY ??
          process.env.GEO_E2E_PRIVATE_KEY ??
          DEFAULT_LOCAL_GEOBROWSER_PRIVATE_KEY,
        'GEO_LOCAL_GEOBROWSER_PRIVATE_KEY',
      ),
      rpcUrl,
      zeroDevRpcUrl: process.env.GEO_LOCAL_GEOBROWSER_ZERODEV_RPC_URL,
      apiOrigin,
      chain: createChain(network, rpcUrl),
      contracts: {
        SPACE_REGISTRY_ADDRESS: spaceRegistryAddress,
        DAO_SPACE_FACTORY_ADDRESS: daoSpaceFactoryAddress,
      },
      localGeobrowserPath: local.path,
      localGeobrowserDeployments: local.deployments,
    };
  }

  const rpcUrl = process.env.GEO_E2E_RPC_URL ?? requireNetworkRpcUrl(GeoTestnetConfig);
  const zeroDevRpcUrl = process.env.GEO_E2E_ZERODEV_RPC_URL;
  const network = defineGeoNetworkConfig({
    ...GeoTestnetConfig,
    chain: GeoTestnetConfig.chain ? { ...GeoTestnetConfig.chain, rpcUrl } : undefined,
  });

  return {
    network,
    networkish: 'TESTNET',
    privateKey: requireHexPrivateKey(process.env.GEO_E2E_PRIVATE_KEY ?? process.env.PRIVATE_KEY, 'PRIVATE_KEY'),
    rpcUrl,
    zeroDevRpcUrl,
    apiOrigin: network.apiOrigin,
    chain: createChain(network, rpcUrl),
    contracts: {
      SPACE_REGISTRY_ADDRESS: requireNetworkContract(network, 'SPACE_REGISTRY_ADDRESS'),
      DAO_SPACE_FACTORY_ADDRESS: requireNetworkContract(network, 'DAO_SPACE_FACTORY_ADDRESS'),
    },
  };
}
