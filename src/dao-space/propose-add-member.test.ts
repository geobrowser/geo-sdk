import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { proposeAddMember } from './propose-add-member.js';

describe('proposeAddMember', () => {
  const validSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validDaoSpaceId = '0xabcdef12345678901234567890abcdef' as const;
  const validDaoSpaceAddress = '0x1234567890123456789012345678901234567890' as const;
  const validNewMemberSpaceId = '0x11111111111111111111111111111111' as const;

  it('should return correct structure', () => {
    const result = proposeAddMember({
      daoSpaceAddress: validDaoSpaceAddress,
      spaceId: validSpaceId,
      daoSpaceId: validDaoSpaceId,
      newMemberSpaceId: validNewMemberSpaceId,
    });

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
    expect(result).toHaveProperty('proposalId');
  });

  it('should return the correct contract address (Space Registry)', () => {
    const { to } = proposeAddMember({
      daoSpaceAddress: validDaoSpaceAddress,
      spaceId: validSpaceId,
      daoSpaceId: validDaoSpaceId,
      newMemberSpaceId: validNewMemberSpaceId,
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', () => {
    const { calldata } = proposeAddMember({
      daoSpaceAddress: validDaoSpaceAddress,
      spaceId: validSpaceId,
      daoSpaceId: validDaoSpaceId,
      newMemberSpaceId: validNewMemberSpaceId,
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should return valid proposalId (bytes16 hex)', () => {
    const { proposalId } = proposeAddMember({
      daoSpaceAddress: validDaoSpaceAddress,
      spaceId: validSpaceId,
      daoSpaceId: validDaoSpaceId,
      newMemberSpaceId: validNewMemberSpaceId,
    });

    expect(proposalId).toMatch(/^0x[0-9a-fA-F]{32}$/);
  });

  it('should accept custom proposalId', () => {
    const customProposalId = '0x22222222222222222222222222222222' as const;

    const { proposalId } = proposeAddMember({
      daoSpaceAddress: validDaoSpaceAddress,
      spaceId: validSpaceId,
      daoSpaceId: validDaoSpaceId,
      newMemberSpaceId: validNewMemberSpaceId,
      proposalId: customProposalId,
    });

    expect(proposalId).toBe(customProposalId);
  });

  it('should default to SLOW voting mode and produce valid calldata', () => {
    const result = proposeAddMember({
      daoSpaceAddress: validDaoSpaceAddress,
      spaceId: validSpaceId,
      daoSpaceId: validDaoSpaceId,
      newMemberSpaceId: validNewMemberSpaceId,
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should accept FAST voting mode', () => {
    const result = proposeAddMember({
      daoSpaceAddress: validDaoSpaceAddress,
      spaceId: validSpaceId,
      daoSpaceId: validDaoSpaceId,
      newMemberSpaceId: validNewMemberSpaceId,
      votingMode: 'FAST',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should generate unique proposalIds for the same input', () => {
    const result1 = proposeAddMember({
      daoSpaceAddress: validDaoSpaceAddress,
      spaceId: validSpaceId,
      daoSpaceId: validDaoSpaceId,
      newMemberSpaceId: validNewMemberSpaceId,
    });

    const result2 = proposeAddMember({
      daoSpaceAddress: validDaoSpaceAddress,
      spaceId: validSpaceId,
      daoSpaceId: validDaoSpaceId,
      newMemberSpaceId: validNewMemberSpaceId,
    });

    expect(result1.proposalId).not.toBe(result2.proposalId);
  });

  it('should throw for invalid spaceId format', () => {
    expect(() =>
      proposeAddMember({
        daoSpaceAddress: validDaoSpaceAddress,
        spaceId: '0xinvalid' as `0x${string}`,
        daoSpaceId: validDaoSpaceId,
        newMemberSpaceId: validNewMemberSpaceId,
      }),
    ).toThrow('spaceId must be bytes16 hex');
  });

  it('should throw for invalid daoSpaceId format', () => {
    expect(() =>
      proposeAddMember({
        daoSpaceAddress: validDaoSpaceAddress,
        spaceId: validSpaceId,
        daoSpaceId: '0xtooshort' as `0x${string}`,
        newMemberSpaceId: validNewMemberSpaceId,
      }),
    ).toThrow('daoSpaceId must be bytes16 hex');
  });

  it('should throw for invalid newMemberSpaceId format', () => {
    expect(() =>
      proposeAddMember({
        daoSpaceAddress: validDaoSpaceAddress,
        spaceId: validSpaceId,
        daoSpaceId: validDaoSpaceId,
        newMemberSpaceId: '0xinvalid' as `0x${string}`,
      }),
    ).toThrow('newMemberSpaceId must be bytes16 hex');
  });
});
