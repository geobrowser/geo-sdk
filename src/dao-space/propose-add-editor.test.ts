import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { proposeAddEditor } from './propose-add-editor.js';

describe('proposeAddEditor', () => {
  const validAuthorSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validSpaceId = '0xabcdef12345678901234567890abcdef' as const;
  const validDaoSpaceAddress = '0x1234567890123456789012345678901234567890' as const;
  const validNewEditorSpaceId = '0x11111111111111111111111111111111' as const;

  it('should return correct structure', () => {
    const result = proposeAddEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      newEditorSpaceId: validNewEditorSpaceId,
    });

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
    expect(result).toHaveProperty('proposalId');
  });

  it('should return the correct contract address (Space Registry)', () => {
    const { to } = proposeAddEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      newEditorSpaceId: validNewEditorSpaceId,
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', () => {
    const { calldata } = proposeAddEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      newEditorSpaceId: validNewEditorSpaceId,
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should return valid proposalId (bytes16 hex)', () => {
    const { proposalId } = proposeAddEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      newEditorSpaceId: validNewEditorSpaceId,
    });

    expect(proposalId).toMatch(/^0x[0-9a-fA-F]{32}$/);
  });

  it('should accept custom proposalId', () => {
    const customProposalId = '0x22222222222222222222222222222222' as const;

    const { proposalId } = proposeAddEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      newEditorSpaceId: validNewEditorSpaceId,
      proposalId: customProposalId,
    });

    expect(proposalId).toBe(customProposalId);
  });

  it('should default to SLOW voting mode and produce valid calldata', () => {
    const result = proposeAddEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      newEditorSpaceId: validNewEditorSpaceId,
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should reject FAST voting mode', () => {
    expect(() =>
      proposeAddEditor({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validSpaceId,
        daoSpaceAddress: validDaoSpaceAddress,
        newEditorSpaceId: validNewEditorSpaceId,
        votingMode: 'FAST' as never,
      }),
    ).toThrow('proposeAddEditor only supports SLOW voting mode');
  });

  it('should generate unique proposalIds for the same input', () => {
    const result1 = proposeAddEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      newEditorSpaceId: validNewEditorSpaceId,
    });

    const result2 = proposeAddEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      newEditorSpaceId: validNewEditorSpaceId,
    });

    expect(result1.proposalId).not.toBe(result2.proposalId);
  });

  it('should throw for invalid spaceId format', () => {
    expect(() =>
      proposeAddEditor({
        authorSpaceId: '0xinvalid' as `0x${string}`,
        spaceId: validSpaceId,
        daoSpaceAddress: validDaoSpaceAddress,
        newEditorSpaceId: validNewEditorSpaceId,
      }),
    ).toThrow('authorSpaceId must be bytes16 hex');
  });

  it('should throw for invalid daoSpaceId format', () => {
    expect(() =>
      proposeAddEditor({
        authorSpaceId: validAuthorSpaceId,
        spaceId: '0xtooshort' as `0x${string}`,
        daoSpaceAddress: validDaoSpaceAddress,
        newEditorSpaceId: validNewEditorSpaceId,
      }),
    ).toThrow('spaceId must be bytes16 hex');
  });

  it('should throw for invalid newEditorSpaceId format', () => {
    expect(() =>
      proposeAddEditor({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validSpaceId,
        daoSpaceAddress: validDaoSpaceAddress,
        newEditorSpaceId: '0xinvalid' as `0x${string}`,
      }),
    ).toThrow('newEditorSpaceId must be bytes16 hex');
  });
});
