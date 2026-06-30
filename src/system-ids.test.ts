import { describe, expect, it } from 'vitest';
import { SystemIds } from './system-ids.js';

describe('SystemIds', () => {
  it('exports system type IDs', () => {
    expect(SystemIds.SYSTEM_TYPE_ID).toBe('2ff7ea098b9e50bc9be78a0cafa268d0');
    expect(SystemIds.SPACE_TYPE_ID).toBe('f4ce7263ed1456c5aafe8b74428ce812');
    expect(SystemIds.PROPOSAL_TYPE_ID).toBe('1cb9d5bac73052a7bc731f2c3ff5a330');
    expect(SystemIds.EOA_SPACE_TYPE_ID).toBe('09d28123178f5828b85a81979389c746');
    expect(SystemIds.DAO_SPACE_TYPE_ID).toBe('afd76215db115cba81b9e7f77f865805');
  });
});
