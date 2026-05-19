import { describe, expect, it, vi } from 'vitest';
import { createGeoClient } from './client.js';
import { defineGeoNetworkConfig, GeoTestnetConfig } from './networks.js';
import * as Ops from './ops/index.js';

describe('createGeoClient', () => {
  const customNetwork = () =>
    defineGeoNetworkConfig({
      id: 'LOCAL',
      name: 'Local Geo',
      apiOrigin: 'http://localhost:3000',
      contracts: {
        SPACE_REGISTRY_ADDRESS: '0x0000000000000000000000000000000000000001',
        DAO_SPACE_FACTORY_ADDRESS: '0x0000000000000000000000000000000000000002',
      },
    });

  it('accepts the built-in TESTNET config', () => {
    const geo = createGeoClient({ network: GeoTestnetConfig });
    expect(geo.network.id).toBe('TESTNET');
    expect(geo.network.apiOrigin).toBe(GeoTestnetConfig.apiOrigin);
  });

  it('accepts custom network configs', () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const local = customNetwork();

    const geo = createGeoClient({ network: local, fetch });
    expect(geo.network.id).toBe('LOCAL');
    expect(geo.network.contracts?.SPACE_REGISTRY_ADDRESS).toBe('0x0000000000000000000000000000000000000001');
  });

  it('only exposes graph-context entity helpers on the client', () => {
    const geo = createGeoClient({ network: customNetwork() });

    expect(Object.keys(geo.entities)).toEqual(['delete']);
  });

  it('scopes proposal helpers under daoSpaces', () => {
    const geo = createGeoClient({ network: customNetwork() });

    expect('edits' in geo).toBe(false);
    expect('proposals' in geo).toBe(false);
    expect(Object.keys(geo.daoSpaces)).toEqual([
      'create',
      'proposeEdit',
      'proposeAddMember',
      'proposeRemoveMember',
      'proposeAddEditor',
      'proposeRemoveEditor',
      'proposeUpdateVotingSettings',
      'proposeRequestMembership',
      'voteProposal',
      'executeProposal',
    ]);
  });

  it('requires an explicit network config', () => {
    expect(() => createGeoClient(undefined as never)).toThrow('requires a Geo network config');
  });

  it('rejects string network IDs', () => {
    expect(() => createGeoClient({ network: 'TESTNET' as never })).toThrow('requires a full Geo network config');
  });

  it('allows sync calldata helpers without global fetch', () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal('fetch', undefined);

    try {
      const geo = createGeoClient({ network: GeoTestnetConfig });
      const result = geo.personalSpaces.create({
        name: 'Test Space',
        accountAddress: '0x1234567890123456789012345678901234567890',
      });

      expect(result.calldata).toMatch(/^0x/);
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('validates required contracts before upload-backed workflows', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const geo = createGeoClient({
      network: defineGeoNetworkConfig({
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
          partialPercentageSupportThreshold: 50,
          universalPercentageSupportThreshold: 90,
          flatSupportThreshold: 1,
          quorum: 1,
          durationInDays: 2,
          disableFastPathAccessForNewMembers: true,
          executionGracePeriodInDays: 14,
        },
        initialEditorSpaceIds: ['0x11111111111111111111111111111111'],
      }),
    ).rejects.toThrow('DAO_SPACE_FACTORY_ADDRESS');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses configured fetch and registry address for personal space edit publishing', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ cid: 'ipfs://bafkreigwfjixq5cm3s4youhshorkpqh3ykpviyv76c2ei6gaalujtlqz5i' })),
      );
    const geo = createGeoClient({ network: customNetwork(), fetch });
    const { ops } = Ops.entities.create({ name: 'Test Entity' });

    const result = await geo.personalSpaces.publishEdit({
      name: 'Test Edit',
      spaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      ops,
      author: '5cade5757ecd41ae83481b22ffc2f94e',
    });

    expect(result.to).toBe('0x0000000000000000000000000000000000000001');
    expect(result.cid).toBe('ipfs://bafkreigwfjixq5cm3s4youhshorkpqh3ykpviyv76c2ei6gaalujtlqz5i');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/ipfs/upload-edit',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uses configured registry address for entity votes without fetch', () => {
    const geo = createGeoClient({ network: customNetwork() });

    const result = geo.entityVotes.upvote({
      authorSpaceId: '0eed5491b917cf58b33ac81255fe7ae9',
      spaceId: 'abcdef12345678901234567890abcdef',
      entityId: '11111111111111111111111111111111',
    });

    expect(result.to).toBe('0x0000000000000000000000000000000000000001');
    expect(result.calldata).toMatch(/^0x/);
  });
});
