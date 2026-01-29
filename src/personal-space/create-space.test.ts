import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { createSpace } from './create-space.js';

describe('createSpace', () => {
  it('should return correct structure with to and calldata', () => {
    const result = createSpace();

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
  });

  it('should return the correct contract address', () => {
    const { to } = createSpace();

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should return valid calldata', () => {
    const { calldata } = createSpace();

    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should return consistent results', () => {
    const result1 = createSpace();
    const result2 = createSpace();

    expect(result1.to).toBe(result2.to);
    expect(result1.calldata).toBe(result2.calldata);
  });
});
