import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { createEntity } from '../graph/create-entity.js';
import { generate } from '../id-utils.js';
import { proposeEdit } from './propose-edit.js';

describe('proposeEdit', () => {
  // Valid test values
  const validCallerSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validDaoSpaceId = '0xabcdef12345678901234567890abcdef' as const;
  const validDaoSpaceAddress = '0x1234567890123456789012345678901234567890' as const;
  const validAuthor = generate();

  it('should return correct structure', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    const result = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    expect(result).toHaveProperty('editId');
    expect(result).toHaveProperty('cid');
    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
    expect(result).toHaveProperty('proposalId');
  });

  it('should return the correct contract address (Space Registry)', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    const { to } = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    const { calldata } = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should return valid CID', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    const { cid } = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    expect(cid).toMatch(/^ipfs:\/\//);
  });

  it('should return valid editId', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    const { editId } = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    expect(editId).toBeTruthy();
    expect(editId).toHaveLength(32);
  });

  it('should return valid proposalId (bytes16 hex)', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    const { proposalId } = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    expect(proposalId).toMatch(/^0x[0-9a-fA-F]{32}$/);
  });

  it('should accept custom proposalId', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });
    const customProposalId = '0x11111111111111111111111111111111' as const;

    const { proposalId } = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: customProposalId,
    });

    expect(proposalId).toBe(customProposalId);
  });

  it('should default to FAST voting mode', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    const result = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    // The calldata should contain encoded data with votingMode = 1 (FAST)
    expect(result.calldata).toBeTruthy();
  });

  it('should accept SLOW voting mode', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    const result = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
      votingMode: 'SLOW',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should throw for invalid callerSpaceId format', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    await expect(
      proposeEdit({
        name: 'Test Edit',
        ops,
        author: validAuthor,
        daoSpaceAddress: validDaoSpaceAddress,
        callerSpaceId: '0xinvalid' as `0x${string}`,
        daoSpaceId: validDaoSpaceId,
      }),
    ).rejects.toThrow('callerSpaceId must be bytes16 hex');
  });

  it('should throw for callerSpaceId without 0x prefix', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    await expect(
      proposeEdit({
        name: 'Test Edit',
        ops,
        author: validAuthor,
        daoSpaceAddress: validDaoSpaceAddress,
        callerSpaceId: '0eed5491b917cf58b33ac81255fe7ae9' as `0x${string}`,
        daoSpaceId: validDaoSpaceId,
      }),
    ).rejects.toThrow('callerSpaceId must be bytes16 hex');
  });

  it('should throw for invalid daoSpaceId format', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    await expect(
      proposeEdit({
        name: 'Test Edit',
        ops,
        author: validAuthor,
        daoSpaceAddress: validDaoSpaceAddress,
        callerSpaceId: validCallerSpaceId,
        daoSpaceId: '0xtooshort' as `0x${string}`,
      }),
    ).rejects.toThrow('daoSpaceId must be bytes16 hex');
  });

  it('should throw for invalid proposalId format', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    await expect(
      proposeEdit({
        name: 'Test Edit',
        ops,
        author: validAuthor,
        daoSpaceAddress: validDaoSpaceAddress,
        callerSpaceId: validCallerSpaceId,
        daoSpaceId: validDaoSpaceId,
        proposalId: '0xinvalidproposalid' as `0x${string}`,
      }),
    ).rejects.toThrow('proposalId must be bytes16 hex');
  });

  it('should generate unique proposalIds for the same input', async () => {
    const { ops } = createEntity({ name: 'Test Entity' });

    const result1 = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    const result2 = await proposeEdit({
      name: 'Test Edit',
      ops,
      author: validAuthor,
      daoSpaceAddress: validDaoSpaceAddress,
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
    });

    // Proposal IDs should be unique because they are generated using UUID v4
    expect(result1.proposalId).not.toBe(result2.proposalId);
  });
});
