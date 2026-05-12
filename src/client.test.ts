import { describe, expect, it, vi } from 'vitest';
import { createGeoClient } from './client.js';
import { defineGeoNetwork, Networks } from './networks.js';

describe('createGeoClient', () => {
  it('accepts the built-in TESTNET config', () => {
    const geo = createGeoClient({ network: Networks.TESTNET });
    expect(geo.network.id).toBe('TESTNET');
    expect(geo.network.apiOrigin).toBe(Networks.TESTNET.apiOrigin);
  });

  it('accepts MAINNET', () => {
    const geo = createGeoClient({ network: 'MAINNET' });
    expect(geo.network.id).toBe('MAINNET');
  });

  it('accepts custom network configs', () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const local = defineGeoNetwork({
      id: 'LOCAL',
      name: 'Local Geo',
      apiOrigin: 'http://localhost:3000',
      contracts: {
        SPACE_REGISTRY_ADDRESS: '0x0000000000000000000000000000000000000001',
        DAO_SPACE_FACTORY_ADDRESS: '0x0000000000000000000000000000000000000002',
      },
    });

    const geo = createGeoClient({ network: local, fetch });
    expect(geo.network.id).toBe('LOCAL');
    expect(geo.network.contracts?.SPACE_REGISTRY_ADDRESS).toBe('0x0000000000000000000000000000000000000001');
  });

  it('throws for unknown network strings', () => {
    expect(() => createGeoClient({ network: 'LOCAL' as never })).toThrow('Unknown Geo network "LOCAL"');
  });

  it('allows sync calldata helpers without global fetch', () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal('fetch', undefined);

    try {
      const geo = createGeoClient({ network: Networks.TESTNET });
      const result = geo.personalSpaces.create();

      expect(result.calldata).toMatch(/^0x/);
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('validates required contracts before upload-backed workflows', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const geo = createGeoClient({
      network: defineGeoNetwork({
        id: 'LOCAL',
        name: 'Local Geo',
        apiOrigin: 'http://localhost:3000',
        contracts: {
          SPACE_REGISTRY_ADDRESS: '0x0000000000000000000000000000000000000001',
        },
      }),
      fetch,
    });

    await expect(
      geo.daoSpaces.create({
        name: 'Test DAO',
        author: '5cade5757ecd41ae83481b22ffc2f94e',
        votingSettings: {
          slowPathPercentageThreshold: 50,
          fastPathFlatThreshold: 1,
          quorum: 1,
          durationInDays: 2,
        },
        initialEditorSpaceIds: ['0x11111111111111111111111111111111'],
      }),
    ).rejects.toThrow('DAO_SPACE_FACTORY_ADDRESS');
    expect(fetch).not.toHaveBeenCalled();
  });
});
