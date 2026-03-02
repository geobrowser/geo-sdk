import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { BYTES16_HEX_REGEX } from './constants.js';
import { proposeRequestMembership } from './propose-request-membership.js';

describe('proposeRequestMembership', () => {
  const validAuthorSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validSpaceId = '0xabcdef12345678901234567890abcdef' as const;

  it('should return correct structure', () => {
    const result = proposeRequestMembership({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
    });

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
    expect(result).toHaveProperty('proposalId');
  });

  it('should return the correct contract address (Space Registry)', () => {
    const { to } = proposeRequestMembership({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', () => {
    const { calldata } = proposeRequestMembership({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should return valid proposalId (bytes16 hex)', () => {
    const { proposalId } = proposeRequestMembership({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
    });

    expect(proposalId).toMatch(BYTES16_HEX_REGEX);
  });

  it('should accept custom proposalId', () => {
    const customProposalId = '0x22222222222222222222222222222222';

    const { proposalId } = proposeRequestMembership({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      proposalId: customProposalId,
    });

    expect(proposalId).toBe(customProposalId);
  });

  it('should produce different calldata for different authors', () => {
    const otherAuthor = '0x33333333333333333333333333333333' as const;
    const sharedProposalId = '0x44444444444444444444444444444444';

    const result1 = proposeRequestMembership({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      proposalId: sharedProposalId,
    });

    const result2 = proposeRequestMembership({
      authorSpaceId: otherAuthor,
      spaceId: validSpaceId,
      proposalId: sharedProposalId,
    });

    expect(result1.calldata).not.toBe(result2.calldata);
  });

  it('should accept IDs without 0x prefix', () => {
    const result = proposeRequestMembership({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should produce same calldata with or without 0x prefix', () => {
    const proposalId = '0x55555555555555555555555555555555';

    const withPrefix = proposeRequestMembership({
      authorSpaceId: '0x0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: '0xabcdef12345678901234567890abcdef',
      proposalId,
    });

    const withoutPrefix = proposeRequestMembership({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
      proposalId,
    });

    expect(withPrefix.calldata).toBe(withoutPrefix.calldata);
  });

  it('should generate unique proposalIds', () => {
    const params = {
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
    } as const;

    const result1 = proposeRequestMembership(params);
    const result2 = proposeRequestMembership(params);

    expect(result1.proposalId).not.toBe(result2.proposalId);
  });

  it('should throw for invalid authorSpaceId format', () => {
    expect(() =>
      proposeRequestMembership({
        authorSpaceId: 'invalid',
        spaceId: validSpaceId,
      }),
    ).toThrow('authorSpaceId must be bytes16 hex');
  });

  it('should throw for invalid spaceId format', () => {
    expect(() =>
      proposeRequestMembership({
        authorSpaceId: validAuthorSpaceId,
        spaceId: 'tooshort',
      }),
    ).toThrow('spaceId must be bytes16 hex');
  });

  it('should throw for invalid proposalId format', () => {
    expect(() =>
      proposeRequestMembership({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validSpaceId,
        proposalId: 'badproposalid',
      }),
    ).toThrow('proposalId must be bytes16 hex');
  });
});
