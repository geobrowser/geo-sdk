import { decodeAbiParameters, decodeFunctionData } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { DaoSpaceFactoryAbi } from '../abis/index.js';
import { createGeoClient } from '../client.js';
import { getCreatePersonalSpaceCalldata } from '../encodings/get-create-personal-space-calldata.js';
import { defineGeoNetwork } from '../networks.js';

const CID = 'ipfs://bafkreigwfjixq5cm3s4youhshorkpqh3ykpviyv76c2ei6gaalujtlqz5i' as const;
const AUTHOR_ID = '5cade5757ecd41ae83481b22ffc2f94e';
const EDITOR_SPACE_ID = '0x11111111111111111111111111111111' as const;
const SPACE_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000001' as const;
const DAO_SPACE_FACTORY_ADDRESS = '0x0000000000000000000000000000000000000002' as const;

function customNetwork() {
  return defineGeoNetwork({
    id: 'LOCAL',
    name: 'Local Geo',
    apiOrigin: 'http://localhost:3000',
    contracts: {
      SPACE_REGISTRY_ADDRESS,
      DAO_SPACE_FACTORY_ADDRESS,
    },
  });
}

function mockUploadFetch() {
  return vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ cid: CID })));
}

describe('geo space clients', () => {
  it('creates personal space calldata for the configured registry', () => {
    const geo = createGeoClient({ network: customNetwork() });

    expect(geo.personalSpaces.create()).toEqual({
      to: SPACE_REGISTRY_ADDRESS,
      calldata: getCreatePersonalSpaceCalldata(),
    });
  });

  it('creates DAO space calldata after publishing the initial edit', async () => {
    const fetch = mockUploadFetch();
    const geo = createGeoClient({ network: customNetwork(), fetch });

    const result = await geo.daoSpaces.create({
      name: 'Test DAO',
      author: AUTHOR_ID,
      votingSettings: {
        slowPathPercentageThreshold: 50,
        fastPathFlatThreshold: 1,
        quorum: 1,
        durationInDays: 2,
      },
      initialEditorSpaceIds: [EDITOR_SPACE_ID],
    });

    const decoded = decodeFunctionData({
      abi: DaoSpaceFactoryAbi,
      data: result.calldata,
    });
    const [, initialEditors, initialMembers, initialEditsContentUri] = decoded.args as [
      unknown,
      `0x${string}`[],
      `0x${string}`[],
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
    ];
    const [decodedCid] = decodeAbiParameters([{ type: 'string' }], initialEditsContentUri);

    expect(result.to).toBe(DAO_SPACE_FACTORY_ADDRESS);
    expect(result.cid).toBe(CID);
    expect(result.spaceEntityId).toHaveLength(32);
    expect(decoded.functionName).toBe('createDAOSpaceProxy');
    expect(initialEditors).toEqual([EDITOR_SPACE_ID]);
    expect(initialMembers).toEqual([]);
    expect(decodedCid).toBe(CID);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/ipfs/upload-edit',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
