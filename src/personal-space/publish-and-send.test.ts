import { describe, expect, it, vi } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { createEntity } from '../graph/create-entity.js';
import { generate } from '../id-utils.js';
import { publishAndSend } from './publish-and-send.js';

function createMockWallet() {
  return {
    account: { address: '0x1234567890123456789012345678901234567890' },
    sendTransaction: vi.fn(async () => `0x${'ab'.repeat(32)}` as `0x${string}`),
  };
}

const TEST_AUTHOR_SPACE_ID = generate();

describe('publishAndSend', () => {
  it('should return editId, cid, and txHash', async () => {
    const spaceId = '0eed5491b917cf58b33ac81255fe7ae9';
    const { ops } = createEntity({ name: 'Test Entity' });
    const wallet = createMockWallet();

    const result = await publishAndSend({
      name: 'Test Edit',
      spaceId,
      ops,
      author: TEST_AUTHOR_SPACE_ID,
      wallet: wallet as any,
    });

    expect(result).toHaveProperty('editId');
    expect(result).toHaveProperty('cid');
    expect(result).toHaveProperty('txHash');
    expect(result.cid).toMatch(/^ipfs:\/\//);
    expect(result.editId).toHaveLength(32);
  });

  it('should call sendTransaction once with Space Registry address', async () => {
    const spaceId = '0eed5491b917cf58b33ac81255fe7ae9';
    const { ops } = createEntity({ name: 'Test Entity' });
    const calls: Array<{ to: string; data: string }> = [];
    const wallet = {
      account: { address: '0x1234567890123456789012345678901234567890' },
      sendTransaction: vi.fn(async (params: { to: string; data: string }) => {
        calls.push(params);
        return `0x${'ab'.repeat(32)}` as `0x${string}`;
      }),
    };

    await publishAndSend({
      name: 'Test Edit',
      spaceId,
      ops,
      author: TEST_AUTHOR_SPACE_ID,
      wallet: wallet as any,
    });

    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
    expect(calls[0]?.to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
    expect(calls[0]?.data).toBeTypeOf('string');
  });

  it('should throw if wallet has no account', async () => {
    const spaceId = '0eed5491b917cf58b33ac81255fe7ae9';
    const { ops } = createEntity({ name: 'Test Entity' });
    const wallet = { account: undefined, sendTransaction: vi.fn() };

    await expect(
      publishAndSend({
        name: 'Test Edit',
        spaceId,
        ops,
        author: TEST_AUTHOR_SPACE_ID,
        wallet: wallet as any,
      }),
    ).rejects.toThrow('Wallet client must have an account');
  });

  it('should propagate validation errors from publishEdit', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });
    const wallet = createMockWallet();

    await expect(
      publishAndSend({
        name: 'Test Edit',
        spaceId: 'invalid',
        ops,
        author: TEST_AUTHOR_SPACE_ID,
        wallet: wallet as any,
      }),
    ).rejects.toThrow('Invalid spaceId');
  });
});
