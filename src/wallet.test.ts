import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  getUserOperationGasPrice,
} from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_3 } from '@zerodev/sdk/constants';
import type { Signer } from '@zerodev/sdk/types';
import { createPublicClient } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineGeoNetworkConfig, GeoTestnetConfig } from './networks.js';
import { createGeoWalletClient } from './wallet.js';

vi.mock('@zerodev/sdk', () => ({
  createKernelAccount: vi.fn().mockResolvedValue({ mockKernelAccount: true }),
  createKernelAccountClient: vi.fn().mockReturnValue({ mockKernelAccountClient: true }),
  createZeroDevPaymasterClient: vi.fn().mockReturnValue({
    sponsorUserOperation: vi.fn().mockResolvedValue({ paymaster: '0x0000000000000000000000000000000000000001' }),
  }),
  getUserOperationGasPrice: vi.fn().mockResolvedValue({
    maxFeePerGas: 10n,
    maxPriorityFeePerGas: 1n,
  }),
}));

vi.mock('@zerodev/sdk/constants', () => ({
  getEntryPoint: vi.fn().mockReturnValue({ address: '0xentrypoint', version: '0.7' }),
  KERNEL_V3_3: '0.3.3',
}));

vi.mock('viem', () => ({
  createPublicClient: vi.fn().mockReturnValue({ mockPublicClient: true }),
  http: vi.fn().mockImplementation(url => ({ mockTransport: true, url })),
}));

describe('createGeoWalletClient', () => {
  const signer = { address: '0x0000000000000000000000000000000000000002' } as unknown as Signer;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a Geo wallet client from the network config', async () => {
    const walletClient = await createGeoWalletClient({
      signer,
      network: GeoTestnetConfig,
    });

    const expectedChain = {
      id: 55516,
      name: 'Geo Testnet',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: {
        default: { http: ['https://rpc-geo-testnet-irdc0cgb0w.t.conduit.xyz'] },
        public: { http: ['https://rpc-geo-testnet-irdc0cgb0w.t.conduit.xyz'] },
      },
    };

    expect(walletClient).toEqual({ mockKernelAccountClient: true });
    expect(createPublicClient).toHaveBeenCalledWith({
      chain: expectedChain,
      transport: { mockTransport: true, url: 'https://rpc-geo-testnet-irdc0cgb0w.t.conduit.xyz' },
    });
    expect(getEntryPoint).toHaveBeenCalledWith('0.7');
    expect(createKernelAccount).toHaveBeenCalledWith(
      { mockPublicClient: true },
      {
        eip7702Account: signer,
        entryPoint: { address: '0xentrypoint', version: '0.7' },
        kernelVersion: KERNEL_V3_3,
      },
    );
    expect(createZeroDevPaymasterClient).toHaveBeenCalledWith({
      chain: expectedChain,
      transport: {
        mockTransport: true,
        url: 'https://rpc.zerodev.app/api/v3/d26c96b9-7ee9-4d78-b139-954470b696e5/chain/55516',
      },
    });
    expect(createKernelAccountClient).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: expectedChain,
        bundlerTransport: {
          mockTransport: true,
          url: 'https://rpc.zerodev.app/api/v3/d26c96b9-7ee9-4d78-b139-954470b696e5/chain/55516',
        },
      }),
    );
  });

  it('lets sponsorship override the network default', async () => {
    await createGeoWalletClient({
      signer,
      network: GeoTestnetConfig,
      sponsorship: {
        rpcUrl: 'https://zerodev.example.com',
      },
    });

    expect(createZeroDevPaymasterClient).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: { mockTransport: true, url: 'https://zerodev.example.com' },
      }),
    );
    expect(createKernelAccountClient).toHaveBeenCalledWith(
      expect.objectContaining({
        bundlerTransport: { mockTransport: true, url: 'https://zerodev.example.com' },
      }),
    );
  });

  it('lets rpcUrl override the network chain RPC URL', async () => {
    await createGeoWalletClient({
      signer,
      network: GeoTestnetConfig,
      rpcUrl: 'https://rpc.example.com',
    });

    const expectedChain = expect.objectContaining({
      rpcUrls: {
        default: { http: ['https://rpc.example.com'] },
        public: { http: ['https://rpc.example.com'] },
      },
    });

    expect(createPublicClient).toHaveBeenCalledWith({
      chain: expectedChain,
      transport: { mockTransport: true, url: 'https://rpc.example.com' },
    });
    expect(createZeroDevPaymasterClient).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: expectedChain,
      }),
    );
  });

  it('throws when the network has no chain config', async () => {
    const network = defineGeoNetworkConfig({
      id: 'NO_CHAIN',
      name: 'No Chain',
      apiOrigin: 'https://api.example.com',
      sponsorship: {
        rpcUrl: 'https://zerodev.example.com',
      },
    });

    await expect(createGeoWalletClient({ signer, network })).rejects.toThrow(
      'Geo network "No Chain" is missing chain config',
    );
  });

  it('throws when no sponsorship RPC URL is available', async () => {
    const network = defineGeoNetworkConfig({
      id: 'NO_SPONSORSHIP',
      name: 'No Sponsorship',
      apiOrigin: 'https://api.example.com',
      chain: {
        id: 123,
        name: 'No Sponsorship',
        rpcUrl: 'https://rpc.example.com',
      },
    });

    await expect(createGeoWalletClient({ signer, network })).rejects.toThrow(
      'Geo network "No Sponsorship" is missing a sponsorship RPC URL',
    );
  });

  it('uses ZeroDev sponsorship for stub and final paymaster data', async () => {
    await createGeoWalletClient({
      signer,
      network: GeoTestnetConfig,
    });

    const kernelClientParams = vi.mocked(createKernelAccountClient).mock.calls[0]?.[0];
    const paymaster = vi.mocked(createZeroDevPaymasterClient).mock.results[0]?.value;
    const configuredPaymaster = kernelClientParams?.paymaster;
    if (!configuredPaymaster || configuredPaymaster === true) {
      throw new Error('Expected configured paymaster hooks');
    }
    const userOperation = {
      chainId: 55516,
      entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const,
      sender: '0x0000000000000000000000000000000000000002' as const,
      nonce: 0n,
      callData: '0x' as const,
    };

    await configuredPaymaster.getPaymasterStubData?.(userOperation);
    await configuredPaymaster.getPaymasterData?.(userOperation);
    await kernelClientParams?.userOperation?.estimateFeesPerGas?.({
      account: { mockKernelAccount: true },
      bundlerClient: { mockBundlerClient: true },
      userOperation,
    } as never);

    expect(paymaster.sponsorUserOperation).toHaveBeenNthCalledWith(1, {
      userOperation,
      shouldConsume: false,
    });
    expect(paymaster.sponsorUserOperation).toHaveBeenNthCalledWith(2, {
      userOperation,
    });
    expect(getUserOperationGasPrice).toHaveBeenCalledWith({ mockBundlerClient: true });
  });
});
