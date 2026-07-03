import { type Chain, createPublicClient, createWalletClient, type Hash, type Hex, http } from 'viem';
import { type PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import type { E2ETestEnvironment } from './e2e-test-environment.js';
import { createGeoWalletClient } from './wallet.js';

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

async function createSponsoredEoaWalletClient({
  account,
  chain,
  network,
  rpcUrl,
}: {
  account: PrivateKeyAccount;
  chain: Chain;
  network: E2ETestEnvironment['network'];
  rpcUrl: string;
}): Promise<E2EWalletClient> {
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  return (await createGeoWalletClient({
    signer: account,
    network,
    publicClient,
  })) as E2EWalletClient;
}

export async function createE2EWalletSetup(e2e: E2ETestEnvironment): Promise<E2EWalletSetup> {
  const account = privateKeyToAccount(e2e.privateKey);
  const publicClient = createPublicClient({
    chain: e2e.chain,
    transport: http(e2e.rpcUrl),
  });

  if (e2e.network.sponsorship) {
    const walletClient = await createSponsoredEoaWalletClient({
      account,
      chain: e2e.chain,
      network: e2e.network,
      rpcUrl: e2e.rpcUrl,
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
        `EOA ${account.address} has no testnet ETH and Geo sponsorship is not configured.`,
        'Use a network with sponsorship, set GEO_E2E_ZERODEV_RPC_URL, or fund this EOA.',
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
