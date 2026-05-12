import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import { type PublishImageParams, uploadImageCore } from '../ipfs-core.js';
import * as Ops from '../ops/index.js';
import type { GeoClientContext } from './context.js';
import { requireFetch } from './context.js';

export type CreateImageParams = PublishImageParams & {
  name?: string;
  description?: string;
  id?: Id | string;
  alternativeGateway?: boolean;
};

/**
 * Uploads an image and builds the corresponding image entity ops.
 *
 * This is the context-aware image workflow used by `geo.images.create(...)`.
 * It uploads the image through the configured API origin, attempts to read
 * image dimensions, then creates pure image ops using `Ops.images.create(...)`.
 *
 * @example
 * ```ts
 * const { id, cid, dimensions, ops } = await geo.images.create({
 *   url: 'https://example.com/cover.png',
 *   name: 'Cover image',
 *   description: 'Image used as the space cover.',
 * });
 *
 * console.log(id, cid, dimensions);
 * ```
 *
 * @param context Client context containing network and fetch configuration.
 * @param params Image source plus optional entity metadata.
 * @returns Created image entity ID, uploaded CID, dimensions when detected, and ops.
 * @throws When the optional ID is invalid, fetch is unavailable, upload fails, or the CID response is invalid.
 */
export async function create(context: GeoClientContext, params: CreateImageParams) {
  if (params.id) assertValid(params.id, '`id` in `createImage`');

  const { cid, dimensions } = await uploadImageCore({
    ...params,
    apiOrigin: context.network.apiOrigin,
    fetch: requireFetch(context, 'Image creation'),
  });

  return Ops.images.create({
    id: params.id,
    name: params.name,
    description: params.description,
    cid,
    dimensions,
  });
}
