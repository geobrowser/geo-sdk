import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { createEntity } from '../graph/create-entity.js';
import { generate } from '../id-utils.js';
import { publishEdit } from './publish-edit.js';

describe('publishEdit', () => {
  it('should return correct structure', async () => {
    const spaceId = '0eed5491b917cf58b33ac81255fe7ae9';
    const { ops } = createEntity({ name: 'Test Entity' });

    const result = await publishEdit({
      name: 'Test Edit',
      spaceId,
      ops,
      author: '0x0000000000000000000000000000000000000000',
    });

    expect(result).toHaveProperty('editId');
    expect(result).toHaveProperty('cid');
    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
  });

  it('should return the correct contract address', async () => {
    const spaceId = '0eed5491b917cf58b33ac81255fe7ae9';
    const { ops } = createEntity({ name: 'Test Entity' });

    const { to } = await publishEdit({
      name: 'Test Edit',
      spaceId,
      ops,
      author: '0x0000000000000000000000000000000000000000',
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', async () => {
    const spaceId = '0eed5491b917cf58b33ac81255fe7ae9';
    const { ops } = createEntity({ name: 'Test Entity' });

    const { calldata } = await publishEdit({
      name: 'Test Edit',
      spaceId,
      ops,
      author: '0x0000000000000000000000000000000000000000',
    });

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should return valid CID', async () => {
    const spaceId = '0eed5491b917cf58b33ac81255fe7ae9';
    const { ops } = createEntity({ name: 'Test Entity' });

    const { cid } = await publishEdit({
      name: 'Test Edit',
      spaceId,
      ops,
      author: '0x0000000000000000000000000000000000000000',
    });

    expect(cid).toMatch(/^ipfs:\/\//);
  });

  it('should return valid editId', async () => {
    const spaceId = '0eed5491b917cf58b33ac81255fe7ae9';
    const { ops } = createEntity({ name: 'Test Entity' });

    const { editId } = await publishEdit({
      name: 'Test Edit',
      spaceId,
      ops,
      author: '0x0000000000000000000000000000000000000000',
    });

    expect(editId).toBeTruthy();
    expect(editId).toHaveLength(32);
  });

  it('should accept 32-char hex string spaceId (on-chain format)', async () => {
    const spaceId = 'abcdef12345678901234567890abcdef';
    const { ops } = createEntity({ name: 'Test Entity' });

    const result = await publishEdit({
      name: 'Test Edit',
      spaceId,
      ops,
      author: '0x0000000000000000000000000000000000000000',
    });

    expect(result.cid).toMatch(/^ipfs:\/\//);
    expect(result.calldata.startsWith('0x')).toBe(true);
  });

  it('should accept valid UUID spaceId', async () => {
    const spaceId = generate();
    const { ops } = createEntity({ name: 'Test Entity' });

    const result = await publishEdit({
      name: 'Test Edit',
      spaceId,
      ops,
      author: '0x0000000000000000000000000000000000000000',
    });

    expect(result.cid).toMatch(/^ipfs:\/\//);
    expect(result.calldata.startsWith('0x')).toBe(true);
  });

  it('should accept UUID with dashes', async () => {
    const spaceId = '550e8400-e29b-41d4-a716-446655440000';
    const { ops } = createEntity({ name: 'Test Entity' });

    const result = await publishEdit({
      name: 'Test Edit',
      spaceId,
      ops,
      author: '0x0000000000000000000000000000000000000000',
    });

    expect(result.cid).toMatch(/^ipfs:\/\//);
    expect(result.calldata.startsWith('0x')).toBe(true);
  });

  it('should throw for invalid spaceId', async () => {
    const invalidSpaceId = 'invalid';
    const { ops } = createEntity({ name: 'Test Entity' });

    await expect(
      publishEdit({
        name: 'Test Edit',
        spaceId: invalidSpaceId,
        ops,
        author: '0x0000000000000000000000000000000000000000',
      }),
    ).rejects.toThrow('Invalid spaceId');
  });

  it('should throw for spaceId that is too short', async () => {
    const shortSpaceId = 'abc123';
    const { ops } = createEntity({ name: 'Test Entity' });

    await expect(
      publishEdit({
        name: 'Test Edit',
        spaceId: shortSpaceId,
        ops,
        author: '0x0000000000000000000000000000000000000000',
      }),
    ).rejects.toThrow('Invalid spaceId');
  });
});
