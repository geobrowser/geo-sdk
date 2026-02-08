import { createSmartAccountClient, type SmartAccountClient } from 'permissionless';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import type { Chain, Hex, WalletClient } from 'viem';
import { createPublicClient, createWalletClient, http } from 'viem';
import { entryPoint07Address } from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import type { GeoSmartAccount } from './types.js';

const MAINNET_DEFAULT_RPC_URL = 'https://rpc-geo-genesis-h0q2s21xx8.t.conduit.xyz';
export const TESTNET_RPC_URL = 'https://rpc-geo-test-zc16z3tcvf.t.conduit.xyz';

/**
 * We provide a fallback API key for gas sponsorship for the duration of the
 * Geo Genesis early access period. This API key is gas-limited.
 */
const DEFAULT_API_KEY = 'pim_KqHm63txxhbCYjdDaWaHqH';

/**
 * Custom Safe contract addresses for Geo Testnet.
 *
 * Safe uses deterministic deployment so the canonical addresses are the same on
 * every chain. On Geo Mainnet (80451) those canonical addresses exist, so the
 * permissionless library's defaults work. On Geo Testnet (19411) the canonical
 * deployer was never run — the Safe contracts were deployed separately and
 * landed at different addresses. We pass them explicitly to toSafeSmartAccount.
 *
 * Source of truth: curator-app packages/curator-utils/src/utils/smart-account-constants.ts
 */
export const GEO_TESTNET_SAFE_ADDRESSES = {
  safeModuleSetupAddress: '0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47' as Hex,
  safe4337ModuleAddress: '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226' as Hex,
  safeProxyFactoryAddress: '0xd9d2Ba03a7754250FDD71333F444636471CACBC4' as Hex,
  safeSingletonAddress: '0x639245e8476E03e789a244f279b5843b9633b2E7' as Hex,
  multiSendAddress: '0x7B21BBDBdE8D01Df591fdc2dc0bE9956Dde1e16C' as Hex,
  multiSendCallOnlyAddress: '0x32228dDEA8b9A2bd7f2d71A958fF241D79ca5eEC' as Hex,
} as const;

type GetSmartAccountWalletClientParams = {
  privateKey: Hex;
  rpcUrl?: string;
};

const createChain = (network: 'TESTNET' | 'MAINNET', rpcUrl: string) => {
  const chain: Chain = {
    id: network === 'TESTNET' ? Number('19411') : Number('80451'),
    name: 'Geo Genesis',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl ?? (network === 'TESTNET' ? TESTNET_RPC_URL : MAINNET_DEFAULT_RPC_URL)],
      },
      public: {
        http: [rpcUrl ?? (network === 'TESTNET' ? TESTNET_RPC_URL : MAINNET_DEFAULT_RPC_URL)],
      },
    },
  };
  return chain;
};

// type GeoSmartAccountWalletClient = Promise<ReturnType<typeof createSmartAccountClient>>;

/**
 * Get a smart account wallet client for your Geo account.
 *
 * IMPORTANT: Be careful with your private key. Don't commit it to version control.
 * You can get your private key using https://www.geobrowser.io/export-wallet
 *
 * @example
 * ```ts
 * const smartAccountWalletClient = await getSmartAccountWalletClient({
 *   privateKey: '0x...',
 *   rpcUrl: '...', // optional
 * });
 * ```
 * @param params – {@link GetSmartAccountWalletClientParams}
 * @returns – {@link SmartAccountClient}
 */
export const getSmartAccountWalletClient = async ({
  privateKey,
  rpcUrl = TESTNET_RPC_URL,
}: GetSmartAccountWalletClientParams): Promise<GeoSmartAccount> => {
  const chain = createChain('TESTNET', rpcUrl);
  const transport = http(rpcUrl);

  const publicClient = createPublicClient({
    transport,
    chain,
  });

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [privateKeyToAccount(privateKey)],
    entryPoint: {
      // optional, defaults to 0.7
      address: entryPoint07Address,
      version: '0.7',
    },
    version: '1.4.1',
    ...GEO_TESTNET_SAFE_ADDRESSES,
  });

  const bundlerTransport = http(`https://api.pimlico.io/v2/19411/rpc?apikey=${DEFAULT_API_KEY}`);
  const paymasterClient = createPimlicoClient({
    transport: bundlerTransport,
    chain,
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    },
  });

  const smartAccount = createSmartAccountClient({
    chain,
    account: safeAccount,
    paymaster: paymasterClient,
    bundlerTransport,
    userOperation: {
      estimateFeesPerGas: async () => {
        return (await paymasterClient.getUserOperationGasPrice()).fast;
      },
    },
  });

  return smartAccount;
};

export const getWalletClient = async ({
  privateKey,
  rpcUrl = TESTNET_RPC_URL,
}: GetSmartAccountWalletClientParams): Promise<WalletClient> => {
  const chain = createChain('TESTNET', rpcUrl);
  const transport = http(rpcUrl);
  const wallet = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain,
    transport,
  });
  return wallet;
};
