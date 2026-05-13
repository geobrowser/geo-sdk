import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { BYTES16_HEX_REGEX } from './constants.js';
import { proposeRemoveEditor } from './propose-remove-editor.js';

describe('proposeRemoveEditor', () => {
  // Valid test values
  const validAuthorSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validSpaceId = '0xabcdef12345678901234567890abcdef' as const;

  const validEditorToRemove = '0x11111111111111111111111111111111' as const;

  it('should return correct structure', () => {
    const result = proposeRemoveEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: validEditorToRemove,
    });

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
    expect(result).toHaveProperty('proposalId');
  });

  it('should return the correct contract address (Space Registry)', () => {
    const { to } = proposeRemoveEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: validEditorToRemove,
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', () => {
    const { calldata } = proposeRemoveEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: validEditorToRemove,
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should return valid proposalId (bytes16 hex)', () => {
    const { proposalId } = proposeRemoveEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: validEditorToRemove,
    });

    expect(proposalId).toMatch(BYTES16_HEX_REGEX);
  });

  it('should accept custom proposalId', () => {
    const customProposalId = '0x22222222222222222222222222222222';

    const { proposalId } = proposeRemoveEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: validEditorToRemove,
      proposalId: customProposalId,
    });

    expect(proposalId).toBe(customProposalId);
  });

  it('should default to SLOW voting mode', () => {
    const result = proposeRemoveEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: validEditorToRemove,
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should preserve legacy FAST voting mode support', () => {
    const result = proposeRemoveEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: validEditorToRemove,
      votingMode: 'FAST',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should accept explicit SLOW voting mode', () => {
    const params = {
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: validEditorToRemove,
    } as const;

    const slowResult = proposeRemoveEditor({ ...params, votingMode: 'SLOW' });

    expect(slowResult.calldata).toBeTruthy();
  });

  it('should produce different calldata for different editors', () => {
    const otherEditor = '0x33333333333333333333333333333333' as const;
    const sharedProposalId = '0x44444444444444444444444444444444';

    const result1 = proposeRemoveEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: validEditorToRemove,
      proposalId: sharedProposalId,
    });

    const result2 = proposeRemoveEditor({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: otherEditor,
      proposalId: sharedProposalId,
    });

    expect(result1.calldata).not.toBe(result2.calldata);
  });

  it('should accept IDs without 0x prefix', () => {
    const result = proposeRemoveEditor({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
      editorToRemoveSpaceId: '11111111111111111111111111111111',
    });

    expect(result.calldata).toBeTruthy();
  });

  it('should produce same calldata with or without 0x prefix', () => {
    const proposalId = '0x55555555555555555555555555555555';

    const withPrefix = proposeRemoveEditor({
      authorSpaceId: '0x0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: '0xabcdef12345678901234567890abcdef',
      editorToRemoveSpaceId: '0x11111111111111111111111111111111',
      proposalId,
    });

    const withoutPrefix = proposeRemoveEditor({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
      editorToRemoveSpaceId: '11111111111111111111111111111111',
      proposalId,
    });

    expect(withPrefix.calldata).toBe(withoutPrefix.calldata);
  });

  it('should generate unique proposalIds', () => {
    const params = {
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      editorToRemoveSpaceId: validEditorToRemove,
    } as const;

    const result1 = proposeRemoveEditor(params);
    const result2 = proposeRemoveEditor(params);

    expect(result1.proposalId).not.toBe(result2.proposalId);
  });

  it('should throw for invalid authorSpaceId format', () => {
    expect(() =>
      proposeRemoveEditor({
        authorSpaceId: 'invalid',
        spaceId: validSpaceId,
        editorToRemoveSpaceId: validEditorToRemove,
      }),
    ).toThrow('authorSpaceId must be bytes16 hex');
  });

  it('should throw for invalid spaceId format', () => {
    expect(() =>
      proposeRemoveEditor({
        authorSpaceId: validAuthorSpaceId,
        spaceId: 'tooshort',
        editorToRemoveSpaceId: validEditorToRemove,
      }),
    ).toThrow('spaceId must be bytes16 hex');
  });

  it('should throw for invalid editorToRemoveSpaceId format', () => {
    expect(() =>
      proposeRemoveEditor({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validSpaceId,
        editorToRemoveSpaceId: 'badid',
      }),
    ).toThrow('editorToRemoveSpaceId must be bytes16 hex');
  });

  it('should throw for invalid proposalId format', () => {
    expect(() =>
      proposeRemoveEditor({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validSpaceId,
        editorToRemoveSpaceId: validEditorToRemove,
        proposalId: 'badproposalid',
      }),
    ).toThrow('proposalId must be bytes16 hex');
  });
});
