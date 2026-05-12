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

export function createImagesClient(context: GeoClientContext) {
  return {
    async create(params: CreateImageParams) {
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
    },
  };
}
