import { type PublishImageParams, uploadCSVCore, uploadImageCore } from '../ipfs-core.js';
import type { GeoClientContext } from './context.js';
import { requireFetch } from './context.js';

/**
 * Uploads an image file or remote image URL through the configured Geo API.
 *
 * This helper performs the upload only. It does not create graph ops. Use
 * `geo.images.create(...)` when you want upload plus image entity ops.
 *
 * @example
 * ```ts
 * const uploaded = await geo.storage.uploadImage({
 *   url: 'https://example.com/photo.png',
 * });
 *
 * console.log(uploaded.cid);
 * console.log(uploaded.dimensions);
 * ```
 *
 * @param context Client context containing the API origin and fetch implementation.
 * @param params Image source and optional upload route options.
 * @returns The uploaded IPFS URI and detected dimensions when available.
 * @throws When fetch is unavailable, the source URL cannot be fetched, upload fails, or the CID response is invalid.
 */
export function uploadImage(context: GeoClientContext, params: PublishImageParams & { alternativeGateway?: boolean }) {
  return uploadImageCore({
    ...params,
    apiOrigin: context.network.apiOrigin,
    fetch: requireFetch(context, 'Image uploads'),
  });
}

/**
 * Compresses and uploads CSV content through the configured Geo API.
 *
 * @example
 * ```ts
 * const cid = await geo.storage.uploadCSV(`name,score
 * Alice,10
 * Bob,8`);
 * ```
 *
 * @param context Client context containing the API origin and fetch implementation.
 * @param csvString Raw CSV text to gzip and upload.
 * @returns The uploaded IPFS URI.
 * @throws When fetch is unavailable, upload fails, or the CID response is invalid.
 */
export function uploadCSV(context: GeoClientContext, csvString: string): Promise<`ipfs://${string}`> {
  return uploadCSVCore({
    csvString,
    apiOrigin: context.network.apiOrigin,
    fetch: requireFetch(context, 'CSV uploads'),
  });
}
