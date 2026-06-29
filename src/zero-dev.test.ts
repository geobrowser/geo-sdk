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
import { createGeoZeroDev7702WalletClient } from './zero-dev.js';

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

describe('createGeoZeroDev7702WalletClient', () => {
  const chain = {
    id: 55516,
    name: 'Geo Testnet',
    nativeCurrency: {
      name: 'GEO',
      symbol: 'GEO',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ['https://rpc.example.com'],
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a ZeroDev 7702 Kernel client from a signer', async () => {
    const signer = { address: '0x0000000000000000000000000000000000000002' } as unknown as Signer;
    const zeroDevRpcUrl = 'https://zerodev.example.com';

    const walletClient = await createGeoZeroDev7702WalletClient({
      signer,
      chain,
      zeroDevRpcUrl,
    });

    expect(walletClient).toEqual({ mockKernelAccountClient: true });
    expect(createPublicClient).toHaveBeenCalledWith({
      chain,
      transport: { mockTransport: true, url: 'https://rpc.example.com' },
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
      chain,
      transport: { mockTransport: true, url: zeroDevRpcUrl },
    });
  });

  it('uses ZeroDev sponsorship for stub and final paymaster data', async () => {
    await createGeoZeroDev7702WalletClient({
      signer: { address: '0x0000000000000000000000000000000000000002' } as unknown as Signer,
      chain,
      zeroDevRpcUrl: 'https://zerodev.example.com',
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
