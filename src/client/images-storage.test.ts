import type { CreateEntity } from '@geoprotocol/grc-20';
import { describe, expect, it, vi } from 'vitest';
import { createGeoClient } from '../client.js';
import { IMAGE_URL_PROPERTY } from '../core/ids/system.js';
import { toGrcId } from '../id-utils.js';
import { defineGeoNetwork } from '../networks.js';

const CID = 'ipfs://bafkreigwfjixq5cm3s4youhshorkpqh3ykpviyv76c2ei6gaalujtlqz5i' as const;
const IMAGE_ID = '3af3e22d21694a078681516710b7ecf1';

function customNetwork() {
  return defineGeoNetwork({
    id: 'LOCAL',
    name: 'Local Geo',
    apiOrigin: 'http://localhost:3000',
  });
}

function mockUploadFetch() {
  return vi.fn<typeof globalThis.fetch>().mockImplementation(async () => new Response(JSON.stringify({ cid: CID })));
}

function imageUrlValue(entityOp: CreateEntity) {
  return entityOp.values.find(value =>
    value.property.every((byte, index) => byte === toGrcId(IMAGE_URL_PROPERTY)[index]),
  );
}

describe('geo image and storage clients', () => {
  it('uploads an image through the configured API origin before creating image ops', async () => {
    const fetch = mockUploadFetch();
    const geo = createGeoClient({ network: customNetwork(), fetch });

    const result = await geo.images.create({
      id: IMAGE_ID,
      name: 'Test image',
      blob: new Blob([new Uint8Array([0, 0, 0, 0])], { type: 'image/png' }),
    });
    const entityOp = result.ops[0] as CreateEntity;
    const urlValue = imageUrlValue(entityOp);

    expect(result.id).toBe(IMAGE_ID);
    expect(result.cid).toBe(CID);
    expect(urlValue?.value.type).toBe('text');
    if (urlValue?.value.type === 'text') {
      expect(urlValue.value.value).toBe(CID);
    }
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/ipfs/upload-file',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uses configured upload routes for storage helpers', async () => {
    const fetch = mockUploadFetch();
    const geo = createGeoClient({ network: customNetwork(), fetch });

    await expect(
      geo.storage.uploadImage({
        blob: new Blob([new Uint8Array([0, 0, 0, 0])], { type: 'image/png' }),
        alternativeGateway: true,
      }),
    ).resolves.toEqual({ cid: CID });
    await expect(geo.storage.uploadCSV('a,b\n1,2')).resolves.toBe(CID);

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/ipfs/upload-file-alternative-gateway',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/ipfs/upload-edit',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
