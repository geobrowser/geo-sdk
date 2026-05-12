import { decodeAbiParameters, decodeFunctionData } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { SpaceRegistryAbi } from '../abis/index.js';
import { createEntity } from '../graph/create-entity.js';
import { defineGeoNetworkConfig } from '../networks.js';
import { EDITS_PUBLISHED, EMPTY_SIGNATURE, EMPTY_TOPIC } from '../personal-space/constants.js';
import type { GeoClientContext } from './context.js';
import { encodePublishEditToSpaceCalldata, publish, publishToSpace } from './edits.js';

const CID = 'ipfs://bafkreigwfjixq5cm3s4youhshorkpqh3ykpviyv76c2ei6gaalujtlqz5i' as const;
const SPACE_ID = '0eed5491b917cf58b33ac81255fe7ae9';
const AUTHOR_ID = '5cade5757ecd41ae83481b22ffc2f94e';
const SPACE_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000001' as const;

function mockUploadFetch() {
  return vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ cid: CID })));
}

function testContext(fetch: typeof globalThis.fetch = mockUploadFetch()): GeoClientContext {
  return {
    network: defineGeoNetworkConfig({
      id: 'LOCAL',
      name: 'Local Geo',
      apiOrigin: 'http://localhost:3000',
      contracts: {
        SPACE_REGISTRY_ADDRESS,
      },
    }),
    fetch,
  };
}

function decodePublishEditCalldata(calldata: `0x${string}`) {
  const decoded = decodeFunctionData({
    abi: SpaceRegistryAbi,
    data: calldata,
  });
  expect(decoded.functionName).toBe('enter');

  const [fromSpaceId, toSpaceId, action, topic, data, signature] = decoded.args as [
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
  ];
  const [cid] = decodeAbiParameters([{ type: 'string' }], data);

  return {
    fromSpaceId,
    toSpaceId,
    action,
    topic,
    cid,
    signature,
  };
}

describe('client edit helpers', () => {
  it('encodes personal space publish calldata without context', () => {
    const { to, calldata } = encodePublishEditToSpaceCalldata({
      spaceId: SPACE_ID,
      cid: CID,
      spaceRegistryAddress: SPACE_REGISTRY_ADDRESS,
    });

    const decoded = decodePublishEditCalldata(calldata);

    expect(to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(decoded.fromSpaceId).toBe(`0x${SPACE_ID}`);
    expect(decoded.toSpaceId).toBe(`0x${SPACE_ID}`);
    expect(decoded.action).toBe(EDITS_PUBLISHED);
    expect(decoded.topic).toBe(EMPTY_TOPIC);
    expect(decoded.cid).toBe(CID);
    expect(decoded.signature).toBe(EMPTY_SIGNATURE);
  });

  it('publishes an edit with the configured API origin and fetch implementation', async () => {
    const fetch = mockUploadFetch();
    const { ops } = createEntity({ name: 'Test Entity' });

    const result = await publish(testContext(fetch), {
      name: 'Test Edit',
      ops,
      author: AUTHOR_ID,
    });

    expect(result.cid).toBe(CID);
    expect(result.editId).toHaveLength(32);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/ipfs/upload-edit',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('publishes to a personal space and returns transaction data for the configured registry', async () => {
    const fetch = mockUploadFetch();
    const { ops } = createEntity({ name: 'Test Entity' });

    const result = await publishToSpace(testContext(fetch), {
      name: 'Publish to space',
      spaceId: SPACE_ID,
      ops,
      author: AUTHOR_ID,
    });

    expect(result.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(result.cid).toBe(CID);
    expect(decodePublishEditCalldata(result.calldata).cid).toBe(CID);
  });
});
