import type { CreateEntity, CreateRelation } from '@geoprotocol/grc-20';
import { decodeAbiParameters, decodeFunctionData, encodeAbiParameters, type Hex } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_SPACE_ID } from '../../contracts.js';
import { DaoSpaceFactoryAbi } from '../abis/index.js';
import { createGeoClient } from '../client.js';
import { ACCOUNT_TYPE, PERSON_TYPE, SPACE_TYPE, TYPES_PROPERTY } from '../core/ids/system.js';
import { getCreatePersonalSpaceCalldata } from '../encodings/get-create-personal-space-calldata.js';
import { toGrcId } from '../id-utils.js';
import { defineGeoNetworkConfig } from '../networks.js';

const CID = 'ipfs://bafkreigwfjixq5cm3s4youhshorkpqh3ykpviyv76c2ei6gaalujtlqz5i' as const;
const AUTHOR_ID = '5cade5757ecd41ae83481b22ffc2f94e';
const EDITOR_SPACE_ID = '0x11111111111111111111111111111111' as const;
const ACCOUNT_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const PERSONAL_SPACE_ID = '0x22222222222222222222222222222222' as const;
const SPACE_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000001' as const;
const DAO_SPACE_FACTORY_ADDRESS = '0x0000000000000000000000000000000000000002' as const;

function customNetwork() {
  return defineGeoNetworkConfig({
    id: 'LOCAL',
    name: 'Local Geo',
    apiOrigin: 'http://localhost:3000',
    chain: {
      id: 31337,
      name: 'Anvil',
      rpcUrl: 'http://localhost:8545',
    },
    contracts: {
      SPACE_REGISTRY_ADDRESS,
      DAO_SPACE_FACTORY_ADDRESS,
    },
  });
}

function mockUploadFetch() {
  return vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ cid: CID })));
}

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

describe('geo space clients', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates personal space calldata and initial profile ops for the configured registry', () => {
    const geo = createGeoClient({ network: customNetwork() });

    const result = geo.personalSpaces.create({
      name: 'Alice',
      accountAddress: ACCOUNT_ADDRESS,
    });

    expect(result.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(result.calldata).toBe(getCreatePersonalSpaceCalldata());
    expect(result.spaceEntityId).toHaveLength(32);
    expect(result.accountId).toHaveLength(32);
    expect(result.ops).toHaveLength(6);

    const spaceEntityOp = result.ops.find(
      (op): op is CreateEntity =>
        op.type === 'createEntity' && op.id.every((b, i) => b === toGrcId(result.spaceEntityId)[i]),
    );
    expect(spaceEntityOp).toBeDefined();

    const accountTypeOp = result.ops.find(
      (op): op is CreateRelation =>
        op.type === 'createRelation' &&
        op.from.every((b, i) => b === toGrcId(result.accountId)[i]) &&
        op.to.every((b, i) => b === toGrcId(ACCOUNT_TYPE)[i]) &&
        op.relationType.every((b, i) => b === toGrcId(TYPES_PROPERTY)[i]),
    );
    expect(accountTypeOp).toBeDefined();

    const spaceTypeOp = result.ops.find(
      (op): op is CreateRelation =>
        op.type === 'createRelation' &&
        op.from.every((b, i) => b === toGrcId(result.spaceEntityId)[i]) &&
        op.to.every((b, i) => b === toGrcId(SPACE_TYPE)[i]) &&
        op.relationType.every((b, i) => b === toGrcId(TYPES_PROPERTY)[i]),
    );
    expect(spaceTypeOp).toBeDefined();

    const personTypeOp = result.ops.find(
      (op): op is CreateRelation =>
        op.type === 'createRelation' &&
        op.from.every((b, i) => b === toGrcId(result.spaceEntityId)[i]) &&
        op.to.every((b, i) => b === toGrcId(PERSON_TYPE)[i]) &&
        op.relationType.every((b, i) => b === toGrcId(TYPES_PROPERTY)[i]),
    );
    expect(personTypeOp).toBeDefined();
  });

  it('checks whether an address has a personal space using the configured registry', async () => {
    const fetch = mockRpcFetch(PERSONAL_SPACE_ID);
    vi.stubGlobal('fetch', fetch);
    const geo = createGeoClient({ network: customNetwork() });

    await expect(geo.personalSpaces.hasSpace({ address: ACCOUNT_ADDRESS })).resolves.toBe(true);

    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body.params[0].to).toBe(SPACE_REGISTRY_ADDRESS.toLowerCase());
  });

  it('returns false when the registry has no personal space for the address', async () => {
    vi.stubGlobal('fetch', mockRpcFetch(EMPTY_SPACE_ID));
    const geo = createGeoClient({ network: customNetwork() });

    await expect(geo.personalSpaces.hasSpace({ address: ACCOUNT_ADDRESS })).resolves.toBe(false);
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
