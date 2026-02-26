import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { voteProposal } from './vote-proposal.js';

describe('voteProposal', () => {
  // Valid test values
  const validAuthorSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validDaoSpaceId = '0xabcdef12345678901234567890abcdef' as const;
  const validProposalId = '0x11111111111111111111111111111111' as const;

  it('should return correct structure', () => {
    const result = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
  });

  it('should return the correct contract address (Space Registry)', () => {
    const { to } = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', () => {
    const { calldata } = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should accept YES vote', () => {
    const result = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should accept NO vote', () => {
    const result = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'NO',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should accept ABSTAIN vote', () => {
    const result = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'ABSTAIN',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should produce different calldata for different vote options', () => {
    const params = {
      authorSpaceId: validAuthorSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
    } as const;

    const yesResult = voteProposal({ ...params, vote: 'YES' });
    const noResult = voteProposal({ ...params, vote: 'NO' });
    const abstainResult = voteProposal({ ...params, vote: 'ABSTAIN' });

    expect(yesResult.calldata).not.toBe(noResult.calldata);
    expect(yesResult.calldata).not.toBe(abstainResult.calldata);
    expect(noResult.calldata).not.toBe(abstainResult.calldata);
  });

  it('should produce different calldata for different proposals', () => {
    const otherProposalId = '0x22222222222222222222222222222222' as const;

    const result1 = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    const result2 = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: otherProposalId,
      vote: 'YES',
    });

    expect(result1.calldata).not.toBe(result2.calldata);
  });

  it('should accept IDs without 0x prefix', () => {
    const result = voteProposal({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      daoSpaceId: 'abcdef12345678901234567890abcdef',
      proposalId: '11111111111111111111111111111111',
      vote: 'YES',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should produce same calldata with or without 0x prefix', () => {
    const withPrefix = voteProposal({
      authorSpaceId: '0x0eed5491b917cf58b33ac81255fe7ae9',
      daoSpaceId: '0xabcdef12345678901234567890abcdef',
      proposalId: '0x11111111111111111111111111111111',
      vote: 'YES',
    });

    const withoutPrefix = voteProposal({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      daoSpaceId: 'abcdef12345678901234567890abcdef',
      proposalId: '11111111111111111111111111111111',
      vote: 'YES',
    });

    expect(withPrefix.calldata).toBe(withoutPrefix.calldata);
  });

  it('should throw for invalid authorSpaceId format', () => {
    expect(() =>
      voteProposal({
        authorSpaceId: 'invalid',
        daoSpaceId: validDaoSpaceId,
        proposalId: validProposalId,
        vote: 'YES',
      }),
    ).toThrow('authorSpaceId must be bytes16 hex');
  });

  it('should throw for invalid daoSpaceId format', () => {
    expect(() =>
      voteProposal({
        authorSpaceId: validAuthorSpaceId,
        daoSpaceId: 'tooshort',
        proposalId: validProposalId,
        vote: 'YES',
      }),
    ).toThrow('daoSpaceId must be bytes16 hex');
  });

  it('should throw for invalid proposalId format', () => {
    expect(() =>
      voteProposal({
        authorSpaceId: validAuthorSpaceId,
        daoSpaceId: validDaoSpaceId,
        proposalId: 'badid',
        vote: 'YES',
      }),
    ).toThrow('proposalId must be bytes16 hex');
  });
});
