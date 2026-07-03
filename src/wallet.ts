import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  getUserOperationGasPrice,
  type KernelAccountClient,
  type KernelSmartAccountImplementation,
} from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_3 } from '@zerodev/sdk/constants';
import type { Signer } from '@zerodev/sdk/types';
import { type Chain, createPublicClient, http } from 'viem';
import type { GeoNetworkConfig } from './types.js';

export type GeoWalletPublicClient = KernelSmartAccountImplementation['client'];

export type CreateGeoWalletClientParams = {
  signer: Signer;
  network: GeoNetworkConfig;
  publicClient?: GeoWalletPublicClient;
};

export type GeoWalletClient = KernelAccountClient;

function requireGeoChain(network: GeoNetworkConfig): NonNullable<GeoNetworkConfig['chain']> {
  if (!network.chain) {
    throw new Error(`Geo network "${network.name}" is missing chain config`);
  }

  return network.chain;
}

function requireGeoChainRpcUrl(network: GeoNetworkConfig, chain: NonNullable<GeoNetworkConfig['chain']>): string {
  if (!chain.rpcUrl) {
    throw new Error(`Geo network "${network.name}" is missing a chain RPC URL`);
  }

  return chain.rpcUrl;
}

function requireGeoSponsorshipRpcUrl(network: GeoNetworkConfig): string {
  if (!network.sponsorship?.rpcUrl) {
    throw new Error(`Geo network "${network.name}" is missing a sponsorship RPC URL`);
  }

  return network.sponsorship.rpcUrl;
}

function createViemChain(chain: NonNullable<GeoNetworkConfig['chain']>, rpcUrl: string): Chain {
  return {
    id: chain.id,
    name: chain.name,
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

/**
 * Creates a Geo wallet client that sends sponsored EIP-7702 user operations.
 *
 * Geo's built-in network configs provide the default sponsorship endpoint for the network.
 * Use `defineGeoNetworkConfig` to pass custom chain or sponsorship RPC URLs.
 */
export async function createGeoWalletClient({
  signer,
  network,
  publicClient,
}: CreateGeoWalletClientParams): Promise<GeoWalletClient> {
  const geoChain = requireGeoChain(network);
  const chainRpcUrl = requireGeoChainRpcUrl(network, geoChain);
  const sponsorshipRpcUrl = requireGeoSponsorshipRpcUrl(network);
  const chain = createViemChain(geoChain, chainRpcUrl);
  const client =
    publicClient ??
    createPublicClient({
      chain,
      transport: http(chainRpcUrl),
    });
  const entryPoint = getEntryPoint('0.7');
  const kernelAccount = await createKernelAccount(client, {
    eip7702Account: signer,
    entryPoint,
    kernelVersion: KERNEL_V3_3,
  });
  const paymaster = createZeroDevPaymasterClient({
    chain,
    transport: http(sponsorshipRpcUrl),
  });

  return createKernelAccountClient({
    account: kernelAccount,
    chain,
    bundlerTransport: http(sponsorshipRpcUrl),
    client,
    paymaster: {
      getPaymasterStubData(userOperation) {
        return paymaster.sponsorUserOperation({ userOperation, shouldConsume: false });
      },
      getPaymasterData(userOperation) {
        return paymaster.sponsorUserOperation({ userOperation });
      },
    },
    userOperation: {
      estimateFeesPerGas: async ({ bundlerClient }) => getUserOperationGasPrice(bundlerClient),
    },
  });
}
