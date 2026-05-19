import { decodeAbiParameters, decodeFunctionData } from 'viem';
import { describe, expect, it } from 'vitest';
import { TESTNET } from '../../contracts.js';
import { SpaceRegistryAbi } from '../abis/index.js';
import { PROPOSAL_VOTED_ACTION, VOTE_OPTION_VALUES } from './constants.js';
import { voteProposal } from './vote-proposal.js';

describe('voteProposal', () => {
  // Valid test values
  const validAuthorSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validDaoSpaceId = '0xabcdef12345678901234567890abcdef' as const;
  const validProposalId = '0x11111111111111111111111111111111' as const;

  it('should return correct structure', () => {
    const result = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
  });

  it('should return the correct contract address (Space Registry)', () => {
    const { to } = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', () => {
    const { calldata } = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should accept YES vote', () => {
    const result = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should encode the proposal version and vote option', () => {
    const result = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
      versionId: 3,
      vote: 'ABSTAIN',
    });
    const decoded = decodeFunctionData({
      abi: SpaceRegistryAbi,
      data: result.calldata,
    });
    const [, , action, , data] = decoded.args as [
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
    ];
    const [proposalId, versionId, voteOption] = decodeAbiParameters(
      [
        { type: 'bytes16', name: 'proposalId' },
        { type: 'uint8', name: 'versionId' },
        { type: 'uint8', name: 'voteOption' },
      ],
      data,
    );

    expect(action).toBe(PROPOSAL_VOTED_ACTION);
    expect(proposalId).toBe(validProposalId);
    expect(versionId).toBe(3);
    expect(voteOption).toBe(VOTE_OPTION_VALUES.ABSTAIN);
  });

  it('should default to proposal version 1', () => {
    const result = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });
    const decoded = decodeFunctionData({
      abi: SpaceRegistryAbi,
      data: result.calldata,
    });
    const [, , , , data] = decoded.args as [
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
    ];
    const [, versionId] = decodeAbiParameters(
      [
        { type: 'bytes16', name: 'proposalId' },
        { type: 'uint8', name: 'versionId' },
        { type: 'uint8', name: 'voteOption' },
      ],
      data,
    );

    expect(versionId).toBe(1);
  });

  it('should reject invalid proposal versions', () => {
    expect(() =>
      voteProposal({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validDaoSpaceId,
        proposalId: validProposalId,
        versionId: 0,
        vote: 'YES',
      }),
    ).toThrow('versionId must be an integer between 1 and 255');
  });

  it('should accept NO vote', () => {
    const result = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'NO',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should accept ABSTAIN vote', () => {
    const result = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'ABSTAIN',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should produce different calldata for different vote options', () => {
    const params = {
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
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
      spaceId: validDaoSpaceId,
      proposalId: validProposalId,
      vote: 'YES',
    });

    const result2 = voteProposal({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validDaoSpaceId,
      proposalId: otherProposalId,
      vote: 'YES',
    });

    expect(result1.calldata).not.toBe(result2.calldata);
  });

  it('should accept IDs without 0x prefix', () => {
    const result = voteProposal({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
      proposalId: '11111111111111111111111111111111',
      vote: 'YES',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should produce same calldata with or without 0x prefix', () => {
    const withPrefix = voteProposal({
      authorSpaceId: '0x0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: '0xabcdef12345678901234567890abcdef',
      proposalId: '0x11111111111111111111111111111111',
      vote: 'YES',
    });

    const withoutPrefix = voteProposal({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
      proposalId: '11111111111111111111111111111111',
      vote: 'YES',
    });

    expect(withPrefix.calldata).toBe(withoutPrefix.calldata);
  });

  it('should throw for invalid authorSpaceId format', () => {
    expect(() =>
      voteProposal({
        authorSpaceId: 'invalid',
        spaceId: validDaoSpaceId,
        proposalId: validProposalId,
        vote: 'YES',
      }),
    ).toThrow('authorSpaceId must be bytes16 hex');
  });

  it('should throw for invalid spaceId format', () => {
    expect(() =>
      voteProposal({
        authorSpaceId: validAuthorSpaceId,
        spaceId: 'tooshort',
        proposalId: validProposalId,
        vote: 'YES',
      }),
    ).toThrow('spaceId must be bytes16 hex');
  });

  it('should throw for invalid proposalId format', () => {
    expect(() =>
      voteProposal({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validDaoSpaceId,
        proposalId: 'badid',
        vote: 'YES',
      }),
    ).toThrow('proposalId must be bytes16 hex');
  });
});
