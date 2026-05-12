import { type PublishImageParams, uploadCSVCore, uploadImageCore } from '../ipfs-core.js';
import type { GeoClientContext } from './context.js';
import { requireFetch } from './context.js';

export function uploadImage(context: GeoClientContext, params: PublishImageParams & { alternativeGateway?: boolean }) {
  return uploadImageCore({
    ...params,
    apiOrigin: context.network.apiOrigin,
    fetch: requireFetch(context, 'Image uploads'),
  });
}

export function uploadCSV(context: GeoClientContext, csvString: string): Promise<`ipfs://${string}`> {
  return uploadCSVCore({
    csvString,
    apiOrigin: context.network.apiOrigin,
    fetch: requireFetch(context, 'CSV uploads'),
  });
}
