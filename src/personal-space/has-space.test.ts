import { encodeAbiParameters, type Hex } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_SPACE_ID } from '../../contracts.js';
import { hasSpace } from './has-space.js';

const ACCOUNT_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const PERSONAL_SPACE_ID = '0x22222222222222222222222222222222' as const;

function mockRpcFetch(spaceId: Hex) {
  return vi.fn<typeof globalThis.fetch>().mockImplementation(async (_url, init) => {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : { id: 1 };
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: encodeAbiParameters([{ type: 'bytes16' }], [spaceId]),
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  });
}

describe('personalSpace.hasSpace', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('delegates to the configured client helper', async () => {
    vi.stubGlobal('fetch', mockRpcFetch(PERSONAL_SPACE_ID));

    await expect(hasSpace({ address: ACCOUNT_ADDRESS })).resolves.toBe(true);
  });

  it('returns false when the registry returns the empty space ID', async () => {
    vi.stubGlobal('fetch', mockRpcFetch(EMPTY_SPACE_ID));

    await expect(hasSpace({ address: ACCOUNT_ADDRESS })).resolves.toBe(false);
  });
});
