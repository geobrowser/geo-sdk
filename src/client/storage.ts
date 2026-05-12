import { type PublishImageParams, uploadCSVCore, uploadImageCore } from '../ipfs-core.js';
import type { GeoClientContext } from './context.js';
import { requireFetch } from './context.js';

export function createStorageClient(context: GeoClientContext) {
  return {
    uploadImage(params: PublishImageParams & { alternativeGateway?: boolean }) {
      return uploadImageCore({
        ...params,
        apiOrigin: context.network.apiOrigin,
        fetch: requireFetch(context, 'Image uploads'),
      });
    },

    uploadCSV(csvString: string): Promise<`ipfs://${string}`> {
      return uploadCSVCore({
        csvString,
        apiOrigin: context.network.apiOrigin,
        fetch: requireFetch(context, 'CSV uploads'),
      });
    },
  };
}
