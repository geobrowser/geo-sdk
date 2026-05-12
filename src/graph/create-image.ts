import { createImagesClient } from '../client/images.js';
import { resolveGeoNetwork } from '../networks.js';
import type { CreateImageParams, CreateImageResult } from '../types.js';

/**
 * Creates an image entity by uploading an image to IPFS and generating the corresponding ops.
 *
 * @deprecated Use `createGeoClient({ network }).images.create(...)` for upload + ops, or
 * `Ops.images.create(...)` when the image has already been uploaded.
 */
export const createImage = async ({ network, ...params }: CreateImageParams): Promise<CreateImageResult> => {
  return createImagesClient({ network: resolveGeoNetwork(network ?? 'TESTNET'), fetch: globalThis.fetch }).create({
    ...params,
    alternativeGateway: network === 'TESTNET',
  });
};
