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

export type GeoZeroDevPublicClient = KernelSmartAccountImplementation['client'];

export type CreateGeoZeroDev7702WalletClientParams = {
  signer: Signer;
  chain: Chain;
  zeroDevRpcUrl: string;
  publicClient?: GeoZeroDevPublicClient;
  rpcUrl?: string;
};

export type GeoZeroDev7702WalletClient = KernelAccountClient;

/**
 * Creates a ZeroDev Kernel wallet client that sends EIP-7702 sponsored user operations.
 *
 * This helper is experimental while Geo's 7702 sponsorship flow is in beta.
 * The signer can be a Privy-backed viem wallet client, EIP-1193 provider, local
 * account, or smart account supported by ZeroDev's signer adapter.
 */
export async function createGeoZeroDev7702WalletClient({
  signer,
  chain,
  zeroDevRpcUrl,
  publicClient,
  rpcUrl,
}: CreateGeoZeroDev7702WalletClientParams): Promise<GeoZeroDev7702WalletClient> {
  const client =
    publicClient ??
    createPublicClient({
      chain,
      transport: http(rpcUrl ?? chain.rpcUrls.default.http[0]),
    });
  const entryPoint = getEntryPoint('0.7');
  const kernelAccount = await createKernelAccount(client, {
    eip7702Account: signer,
    entryPoint,
    kernelVersion: KERNEL_V3_3,
  });
  const paymaster = createZeroDevPaymasterClient({
    chain,
    transport: http(zeroDevRpcUrl),
  });

  return createKernelAccountClient({
    account: kernelAccount,
    chain,
    bundlerTransport: http(zeroDevRpcUrl),
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
