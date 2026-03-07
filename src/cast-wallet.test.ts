import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPrivateKeyFromCast } from './cast-wallet.js';

// Mock child_process.execFile via the eval('require(...)') path
const mockExecFile = vi.fn();

// biome-ignore lint/security/noGlobalEval: matching source pattern for test mock
const originalEval = globalThis.eval;

describe('getPrivateKeyFromCast', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
    globalThis.eval = vi.fn(() => ({ execFile: mockExecFile }));
  });

  afterEach(() => {
    globalThis.eval = originalEval;
  });

  it('should return a private key from cast output', async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: object, cb: (err: Error | null, stdout: string) => void) => {
        cb(null, '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890\n');
      },
    );

    const key = await getPrivateKeyFromCast({ account: 'test-account' });

    expect(key).toBe('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    expect(mockExecFile).toHaveBeenCalledWith(
      'cast',
      ['wallet', 'decrypt-keystore', 'test-account'],
      { timeout: 30_000 },
      expect.any(Function),
    );
  });

  it('should add 0x prefix if missing', async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: object, cb: (err: Error | null, stdout: string) => void) => {
        cb(null, 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890\n');
      },
    );

    const key = await getPrivateKeyFromCast({ account: 'test-account' });

    expect(key).toBe('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
  });

  it('should pass --unsafe-password when password is provided', async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: object, cb: (err: Error | null, stdout: string) => void) => {
        cb(null, '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890\n');
      },
    );

    await getPrivateKeyFromCast({ account: 'test-account', password: 'my-password' });

    expect(mockExecFile).toHaveBeenCalledWith(
      'cast',
      ['wallet', 'decrypt-keystore', 'test-account', '--unsafe-password', 'my-password'],
      { timeout: 30_000 },
      expect.any(Function),
    );
  });

  it('should throw helpful error when cast is not installed', async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: object, cb: (err: Error | null, stdout: string) => void) => {
        cb(new Error('ENOENT: cast not found'), '');
      },
    );

    await expect(getPrivateKeyFromCast({ account: 'test' })).rejects.toThrow('Foundry `cast` command not found');
  });

  it('should throw helpful error when keystore not found', async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: object, cb: (err: Error | null, stdout: string) => void) => {
        cb(new Error('No keystore found for account'), '');
      },
    );

    await expect(getPrivateKeyFromCast({ account: 'missing' })).rejects.toThrow(
      'No keystore found for account "missing"',
    );
  });

  it('should throw generic error for other failures', async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: object, cb: (err: Error | null, stdout: string) => void) => {
        cb(new Error('something went wrong'), '');
      },
    );

    await expect(getPrivateKeyFromCast({ account: 'test' })).rejects.toThrow('Failed to decrypt keystore for "test"');
  });
});
