import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { executeProposal } from './execute-proposal.js';

describe('executeProposal', () => {
  const validAuthorSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validDaoSpaceId = '0xabcdef12345678901234567890abcdef' as const;
  const validProposalId = '0x11111111111111111111111111111111' as const;

  it('should return correct structure', () => {
    const result = executeProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
    });

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
  });

  it('should return the correct contract address (Space Registry)', () => {
    const { to } = executeProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', () => {
    const { calldata } = executeProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should produce different calldata for different proposals', () => {
    const otherProposalId = '0x22222222222222222222222222222222' as const;

    const result1 = executeProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
    });

    const result2 = executeProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: otherProposalId,
    });

    expect(result1.calldata).not.toBe(result2.calldata);
  });

  it('should accept IDs without 0x prefix', () => {
    const result = executeProposal({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
      proposalId: '11111111111111111111111111111111',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should produce same calldata with or without 0x prefix', () => {
    const withPrefix = executeProposal({
      authorSpaceId: '0x0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: '0xabcdef12345678901234567890abcdef',
      proposalId: '0x11111111111111111111111111111111',
    });

    const withoutPrefix = executeProposal({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
      proposalId: '11111111111111111111111111111111',
    });

    expect(withPrefix.calldata).toBe(withoutPrefix.calldata);
  });

  it('should throw for invalid authorSpaceId format', () => {
    expect(() =>
      executeProposal({
        authorSpaceId: 'invalid',
        spaceId: validDaoSpaceId,
        proposalId: validProposalId,
      }),
    ).toThrow('authorSpaceId must be bytes16 hex');
  });

  it('should throw for invalid spaceId format', () => {
    expect(() =>
      executeProposal({
        authorSpaceId: validAuthorSpaceId,
        spaceId: 'tooshort',
        proposalId: validProposalId,
      }),
    ).toThrow('spaceId must be bytes16 hex');
  });

  it('should throw for invalid proposalId format', () => {
    expect(() =>
      executeProposal({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validDaoSpaceId,
        proposalId: 'badid',
      }),
    ).toThrow('proposalId must be bytes16 hex');
  });
});
