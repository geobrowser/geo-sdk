import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { BYTES16_HEX_REGEX } from './constants.js';
import { proposeRemoveMember } from './propose-remove-member.js';

describe('proposeRemoveMember', () => {
  // Valid test values
  const validAuthorSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validSpaceId = '0xabcdef12345678901234567890abcdef' as const;
  const validSpaceAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const validMemberToRemove = '0x11111111111111111111111111111111' as const;

  it('should return correct structure', () => {
    const result = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: validMemberToRemove,
    });

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
    expect(result).toHaveProperty('proposalId');
  });

  it('should return the correct contract address (Space Registry)', () => {
    const { to } = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: validMemberToRemove,
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', () => {
    const { calldata } = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: validMemberToRemove,
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should return valid proposalId (bytes16 hex)', () => {
    const { proposalId } = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: validMemberToRemove,
    });

    expect(proposalId).toMatch(BYTES16_HEX_REGEX);
  });

  it('should accept custom proposalId', () => {
    const customProposalId = '0x22222222222222222222222222222222';

    const { proposalId } = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: validMemberToRemove,
      proposalId: customProposalId,
    });

    expect(proposalId).toBe(customProposalId);
  });

  it('should default to SLOW voting mode', () => {
    const result = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: validMemberToRemove,
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should accept FAST voting mode', () => {
    const result = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: validMemberToRemove,
      votingMode: 'FAST',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should produce different calldata for different voting modes', () => {
    const params = {
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: validMemberToRemove,
    } as const;

    const slowResult = proposeRemoveMember({ ...params, votingMode: 'SLOW' });
    const fastResult = proposeRemoveMember({
      ...params,
      votingMode: 'FAST',
      proposalId: slowResult.proposalId,
    });

    expect(slowResult.calldata).not.toBe(fastResult.calldata);
  });

  it('should produce different calldata for different members', () => {
    const otherMember = '0x33333333333333333333333333333333' as const;
    const sharedProposalId = '0x44444444444444444444444444444444';

    const result1 = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: validMemberToRemove,
      proposalId: sharedProposalId,
    });

    const result2 = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: otherMember,
      proposalId: sharedProposalId,
    });

    expect(result1.calldata).not.toBe(result2.calldata);
  });

  it('should accept IDs without 0x prefix', () => {
    const result = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
      memberToRemoveSpaceId: '11111111111111111111111111111111',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should produce same calldata with or without 0x prefix', () => {
    const proposalId = '0x55555555555555555555555555555555';

    const withPrefix = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: '0x0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: '0xabcdef12345678901234567890abcdef',
      memberToRemoveSpaceId: '0x11111111111111111111111111111111',
      proposalId,
    });

    const withoutPrefix = proposeRemoveMember({
      spaceAddress: validSpaceAddress,
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
      memberToRemoveSpaceId: '11111111111111111111111111111111',
      proposalId,
    });

    expect(withPrefix.calldata).toBe(withoutPrefix.calldata);
  });

  it('should generate unique proposalIds', () => {
    const params = {
      spaceAddress: validSpaceAddress,
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      memberToRemoveSpaceId: validMemberToRemove,
    } as const;

    const result1 = proposeRemoveMember(params);
    const result2 = proposeRemoveMember(params);

    expect(result1.proposalId).not.toBe(result2.proposalId);
  });

  it('should throw for invalid authorSpaceId format', () => {
    expect(() =>
      proposeRemoveMember({
        spaceAddress: validSpaceAddress,
        authorSpaceId: 'invalid',
        spaceId: validSpaceId,
        memberToRemoveSpaceId: validMemberToRemove,
      }),
    ).toThrow('authorSpaceId must be bytes16 hex');
  });

  it('should throw for invalid spaceId format', () => {
    expect(() =>
      proposeRemoveMember({
        spaceAddress: validSpaceAddress,
        authorSpaceId: validAuthorSpaceId,
        spaceId: 'tooshort',
        memberToRemoveSpaceId: validMemberToRemove,
      }),
    ).toThrow('spaceId must be bytes16 hex');
  });

  it('should throw for invalid memberToRemoveSpaceId format', () => {
    expect(() =>
      proposeRemoveMember({
        spaceAddress: validSpaceAddress,
        authorSpaceId: validAuthorSpaceId,
        spaceId: validSpaceId,
        memberToRemoveSpaceId: 'badid',
      }),
    ).toThrow('memberToRemoveSpaceId must be bytes16 hex');
  });

  it('should throw for invalid proposalId format', () => {
    expect(() =>
      proposeRemoveMember({
        spaceAddress: validSpaceAddress,
        authorSpaceId: validAuthorSpaceId,
        spaceId: validSpaceId,
        memberToRemoveSpaceId: validMemberToRemove,
        proposalId: 'badproposalid',
      }),
    ).toThrow('proposalId must be bytes16 hex');
  });
});
