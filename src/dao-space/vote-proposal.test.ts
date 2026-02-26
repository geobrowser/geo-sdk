import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { voteProposal } from './vote-proposal.js';

describe('voteProposal', () => {
  // Valid test values
  const validCallerSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validDaoSpaceId = '0xabcdef12345678901234567890abcdef' as const;
  const validProposalId = '0x11111111111111111111111111111111' as const;

  it('should return correct structure', () => {
    const result = voteProposal({
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
  });

  it('should return the correct contract address (Space Registry)', () => {
    const { to } = voteProposal({
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', () => {
    const { calldata } = voteProposal({
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should accept YES vote', () => {
    const result = voteProposal({
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should accept NO vote', () => {
    const result = voteProposal({
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'NO',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should accept ABSTAIN vote', () => {
    const result = voteProposal({
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'ABSTAIN',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should produce different calldata for different vote options', () => {
    const params = {
      callerSpaceId: validCallerSpaceId,
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
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    const result2 = voteProposal({
      callerSpaceId: validCallerSpaceId,
      daoSpaceId: validDaoSpaceId,
      proposalId: otherProposalId,
      vote: 'YES',
    });

    expect(result1.calldata).not.toBe(result2.calldata);
  });

  it('should throw for invalid callerSpaceId format', () => {
    expect(() =>
      voteProposal({
        callerSpaceId: '0xinvalid' as `0x${string}`,
        daoSpaceId: validDaoSpaceId,
        proposalId: validProposalId,
        vote: 'YES',
      }),
    ).toThrow('callerSpaceId must be bytes16 hex');
  });

  it('should throw for invalid daoSpaceId format', () => {
    expect(() =>
      voteProposal({
        callerSpaceId: validCallerSpaceId,
        daoSpaceId: '0xtooshort' as `0x${string}`,
        proposalId: validProposalId,
        vote: 'YES',
      }),
    ).toThrow('daoSpaceId must be bytes16 hex');
  });

  it('should throw for invalid proposalId format', () => {
    expect(() =>
      voteProposal({
        callerSpaceId: validCallerSpaceId,
        daoSpaceId: validDaoSpaceId,
        proposalId: '0xbadid' as `0x${string}`,
        vote: 'YES',
      }),
    ).toThrow('proposalId must be bytes16 hex');
  });
});
