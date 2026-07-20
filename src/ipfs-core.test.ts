import { describe, expect, it, vi } from 'vitest';
import { WEBSITE_PROPERTY } from './core/ids/content.js';
import { createEntity } from './graph/create-entity.js';
import { generate } from './id-utils.js';
import { publishEditCore, uploadImageCore } from './ipfs-core.js';

const TEST_AUTHOR_SPACE_ID = generate();

describe('ipfs-core response validation', () => {
  it('rejects successful upload responses without a valid CID', async () => {
    const { ops } = createEntity({
      name: 'test',
      values: [{ property: WEBSITE_PROPERTY, type: 'text', value: 'test' }],
    });
    const fetch = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));

    await expect(
      publishEditCore({
        name: 'test',
        ops,
        author: TEST_AUTHOR_SPACE_ID,
        apiOrigin: 'https://example.test',
        fetch,
      }),
    ).rejects.toThrow('invalid IPFS CID');
  });

  it('rejects upload responses with malformed IPFS URIs', async () => {
    const { ops } = createEntity({
      name: 'test',
      values: [{ property: WEBSITE_PROPERTY, type: 'text', value: 'test' }],
    });
    const fetch = vi.fn(async () => new Response(JSON.stringify({ cid: 'ipfs://not-a-cid' }), { status: 200 }));

    await expect(
      publishEditCore({
        name: 'test',
        ops,
        author: TEST_AUTHOR_SPACE_ID,
        apiOrigin: 'https://example.test',
        fetch,
      }),
    ).rejects.toThrow('invalid IPFS CID');
  });

  it('rejects failed upload responses before parsing a CID', async () => {
    const { ops } = createEntity({ name: 'test' });
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 500 }));

    await expect(
      publishEditCore({
        name: 'test',
        ops,
        author: TEST_AUTHOR_SPACE_ID,
        apiOrigin: 'https://example.test',
        fetch,
      }),
    ).rejects.toThrow('IPFS edit upload failed');
  });

  it('rejects failed source image fetches', async () => {
    const fetch = vi.fn(async () => new Response('missing', { status: 404 }));

    await expect(
      uploadImageCore({
        url: 'https://example.test/image.png',
        apiOrigin: 'https://example.test',
        fetch,
      }),
    ).rejects.toThrow('Could not fetch image');
  });

  it('rejects source fetches that return a non-image body with status 200', async () => {
    const fetch = vi.fn(
      async () =>
        new Response('<html><body>Bad Request</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
    );

    await expect(
      uploadImageCore({
        url: 'https://example.test/image.png',
        apiOrigin: 'https://example.test',
        fetch,
      }),
    ).rejects.toThrow('is not an image');
  });

  it('accepts an image/* content type even when dimensions cannot be read', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith('/image.svg')) {
        return new Response('<svg xmlns="http://www.w3.org/2000/svg"/>', {
          status: 200,
          headers: { 'content-type': 'image/svg+xml' },
        });
      }
      return new Response(JSON.stringify({ cid: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG' }), {
        status: 200,
      });
    });

    const result = await uploadImageCore({
      url: 'https://example.test/image.svg',
      apiOrigin: 'https://example.test',
      fetch,
    });

    expect(result.cid).toBe('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
  });
});
