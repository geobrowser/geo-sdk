import { describe, expect, it, vi } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { createEntity } from '../graph/create-entity.js';
import { generate } from '../id-utils.js';
import { publishAndVote } from './publish-and-vote.js';

function createMockWallet() {
  return {
    account: { address: '0x1234567890123456789012345678901234567890' },
    sendTransaction: vi.fn(async () => `0x${'ab'.repeat(32)}` as `0x${string}`),
  };
}

describe('publishAndVote', () => {
  const validCallerSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validDaoSpaceId = '0xabcdef12345678901234567890abcdef' as const;
  const validDaoSpaceAddress = '0x1234567890123456789012345678901234567890' as const;
  const validAuthor = generate();

  it('should return proposalId, editId, cid, proposeTxHash, voteTxHash', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });
    const wallet = createMockWallet();

    const result = await publishAndVote({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      wallet: wallet as any,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    expect(result).toHaveProperty('proposalId');
    expect(result).toHaveProperty('editId');
    expect(result).toHaveProperty('cid');
    expect(result).toHaveProperty('proposeTxHash');
    expect(result).toHaveProperty('voteTxHash');
    expect(result.proposalId).toMatch(/^0x[0-9a-fA-F]{32}$/);
    expect(result.cid).toMatch(/^ipfs:\/\//);
    expect(result.editId).toHaveLength(32);
  });

  it('should call sendTransaction twice (propose + vote)', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });
    const calls: Array<{ to: string; data: string }> = [];
    const wallet = {
      account: { address: '0x1234567890123456789012345678901234567890' },
      sendTransaction: vi.fn(async (params: { to: string; data: string }) => {
        calls.push(params);
        return `0x${'ab'.repeat(32)}` as `0x${string}`;
      }),
    };

    await publishAndVote({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      wallet: wallet as any,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    expect(wallet.sendTransaction).toHaveBeenCalledTimes(2);

    // First call: propose transaction to Space Registry
    expect(calls[0]?.to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
    expect(calls[0]?.data).toBeTypeOf('string');

    // Second call: vote transaction to Space Registry
    expect(calls[1]?.to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
    expect(calls[1]?.data).toBeTypeOf('string');
  });

  it('should throw if wallet has no account', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });
    const wallet = { account: undefined, sendTransaction: vi.fn() };

    await expect(
      publishAndVote({
        name: 'Test Edit',
        ops,
        author: validAuthor,
        wallet: wallet as any,
        daoSpaceAddress: validDaoSpaceAddress,
        callerSpaceId: validCallerSpaceId,
        daoSpaceId: validDaoSpaceId,
      }),
    ).rejects.toThrow('Wallet client must have an account');
  });

  it('should propagate validation errors from proposeEdit', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });
    const wallet = createMockWallet();

    await expect(
      publishAndVote({
        name: 'Test Edit',
        ops,
        author: validAuthor,
        wallet: wallet as any,
        daoSpaceAddress: validDaoSpaceAddress,
        callerSpaceId: '0xinvalid' as `0x${string}`,
        daoSpaceId: validDaoSpaceId,
      }),
    ).rejects.toThrow('callerSpaceId must be bytes16 hex');
  });

  it('should default vote to YES', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });
    const wallet = createMockWallet();

    // Should not throw — defaults to YES
    const result = await publishAndVote({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      wallet: wallet as any,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    expect(result.voteTxHash).toBeTruthy();
  });
});
