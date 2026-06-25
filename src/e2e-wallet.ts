import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  getUserOperationGasPrice,
} from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_3 } from '@zerodev/sdk/constants';
import { type Chain, createPublicClient, createWalletClient, type Hash, type Hex, http } from 'viem';
import { type PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import type { E2ETestEnvironment } from './e2e-test-environment.js';

type SendTransactionParameters = {
  account?: unknown;
  chain?: Chain | null;
  to: Hex;
  value?: bigint;
  data?: Hex;
  nonce?: number | bigint;
};

export type E2EPublicClient = ReturnType<typeof createPublicClient>;

export type E2EWalletClient = {
  chain?: Chain;
  sendTransaction(parameters: SendTransactionParameters): Promise<Hash>;
};

export type E2EWalletSetup = {
  account: PrivateKeyAccount;
  publicClient: E2EPublicClient;
  walletClient: E2EWalletClient;
  usesUserOperations: boolean;
};

async function createZeroDevEoaWalletClient({
  account,
  chain,
  rpcUrl,
  zeroDevRpcUrl,
}: {
  account: PrivateKeyAccount;
  chain: Chain;
  rpcUrl: string;
  zeroDevRpcUrl: string;
}): Promise<E2EWalletClient> {
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const entryPoint = getEntryPoint('0.7');
  const kernelAccount = await createKernelAccount(publicClient, {
    eip7702Account: account,
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
    client: publicClient,
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
  }) as E2EWalletClient;
}

export async function createE2EWalletSetup(e2e: E2ETestEnvironment): Promise<E2EWalletSetup> {
  const account = privateKeyToAccount(e2e.privateKey);
  const publicClient = createPublicClient({
    chain: e2e.chain,
    transport: http(e2e.rpcUrl),
  });

  if (e2e.zeroDevRpcUrl) {
    const walletClient = await createZeroDevEoaWalletClient({
      account,
      chain: e2e.chain,
      rpcUrl: e2e.rpcUrl,
      zeroDevRpcUrl: e2e.zeroDevRpcUrl,
    });

    return {
      account,
      publicClient,
      walletClient,
      usesUserOperations: true,
    };
  }

  const balance = await publicClient.getBalance({ address: account.address });
  if (balance === 0n) {
    throw new Error(
      [
        `EOA ${account.address} has no testnet ETH and GEO_E2E_ZERODEV_RPC_URL is not set.`,
        'Set GEO_E2E_ZERODEV_RPC_URL to use ZeroDev sponsorship, or fund this EOA to run without ZeroDev.',
      ].join(' '),
    );
  }

  const walletClient = createWalletClient({
    account,
    chain: e2e.chain,
    transport: http(e2e.rpcUrl),
  }) as E2EWalletClient;

  return {
    account,
    publicClient,
    walletClient,
    usesUserOperations: false,
  };
}
