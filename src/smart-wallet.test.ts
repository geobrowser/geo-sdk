import { toSafeSmartAccount } from 'permissionless/accounts';
import { createPublicClient, http } from 'viem';
import { entryPoint07Address } from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSmartAccountWalletClient } from './smart-wallet.js';

// mock all external dependencies
vi.mock('permissionless', () => ({
  createSmartAccountClient: vi.fn().mockReturnValue({ mockSmartAccountClient: true }),
}));

vi.mock('permissionless/accounts', () => ({
  toSafeSmartAccount: vi.fn().mockResolvedValue({ mockSafeAccount: true }),
}));

vi.mock('permissionless/clients/pimlico', () => ({
  createPimlicoClient: vi.fn().mockReturnValue({
    mockPimlicoClient: true,
    getUserOperationGasPrice: vi.fn().mockResolvedValue({
      fast: { maxFeePerGas: 1000000000n, maxPriorityFeePerGas: 100000000n },
    }),
  }),
}));

vi.mock('viem', () => ({
  createPublicClient: vi.fn().mockReturnValue({ mockPublicClient: true }),
  http: vi.fn().mockImplementation(url => ({ mockTransport: true, url })),
}));

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({ mockAccount: true }),
}));

describe('getSmartAccountWalletClient', () => {
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a client with the default RPC URL when no RPC URL is provided', async () => {
    await getSmartAccountWalletClient({ privateKey: mockPrivateKey });

    expect(http).toHaveBeenCalledWith('https://rpc-geo-test-zc16z3tcvf.t.conduit.xyz');
    expect(createPublicClient).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: { mockTransport: true, url: 'https://rpc-geo-test-zc16z3tcvf.t.conduit.xyz' },
      }),
    );
  });

  it('should create a client with a custom RPC URL when provided', async () => {
    const customRpcUrl = 'https://custom-rpc.example.com';
    await getSmartAccountWalletClient({
      privateKey: mockPrivateKey,
      rpcUrl: customRpcUrl,
    });

    expect(http).toHaveBeenCalledWith(customRpcUrl);
    expect(createPublicClient).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: { mockTransport: true, url: customRpcUrl },
      }),
    );
  });

  it('should initialize safe account with correct parameters', async () => {
    await getSmartAccountWalletClient({ privateKey: mockPrivateKey });

    expect(privateKeyToAccount).toHaveBeenCalledWith(mockPrivateKey);
    expect(toSafeSmartAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        client: { mockPublicClient: true },
        owners: [{ mockAccount: true }],
        entryPoint: {
          address: entryPoint07Address,
          version: '0.7',
        },
        version: '1.4.1',
        safeProxyFactoryAddress: '0xd9d2Ba03a7754250FDD71333F444636471CACBC4',
        safeSingletonAddress: '0x639245e8476E03e789a244f279b5843b9633b2E7',
        safeModuleSetupAddress: '0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47',
        safe4337ModuleAddress: '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226',
        multiSendAddress: '0x7B21BBDBdE8D01Df591fdc2dc0bE9956Dde1e16C',
        multiSendCallOnlyAddress: '0x32228dDEA8b9A2bd7f2d71A958fF241D79ca5eEC',
      }),
    );
  });
});
