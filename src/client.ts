import { createApiClient } from './client/api.js';
import { createCommentsClient } from './client/comments.js';
import type { FetchLike, GeoClientContext } from './client/context.js';
import { createDaoSpacesClient } from './client/dao-spaces.js';
import type { PublishEditToSpaceParams } from './client/edits.js';
import { createEntitiesClient } from './client/entities.js';
import { createEntityVotesClient } from './client/entity-votes.js';
import type { CreateImageParams } from './client/images.js';
import { createPersonalSpacesClient } from './client/personal-spaces.js';
import { createProposalsClient } from './client/proposals.js';
import type { PublishEditParams, PublishImageParams } from './ipfs-core.js';
import { resolveGeoNetwork } from './networks.js';
import * as Ops from './ops/index.js';
import type { Networkish } from './types.js';

export type CreateGeoClientParams = {
  network?: Networkish;
  fetch?: FetchLike;
};

export function createGeoClient(params: CreateGeoClientParams = {}) {
  const fetchFn = params.fetch ?? globalThis.fetch;

  const context: GeoClientContext = {
    network: resolveGeoNetwork(params.network),
    fetch: fetchFn,
  };

  return {
    network: context.network,
    ops: Ops,
    api: createApiClient(context),
    storage: {
      async uploadImage(params: PublishImageParams & { alternativeGateway?: boolean }) {
        const { createStorageClient } = await import('./client/storage.js');
        return createStorageClient(context).uploadImage(params);
      },
      async uploadCSV(csvString: string): Promise<`ipfs://${string}`> {
        const { createStorageClient } = await import('./client/storage.js');
        return createStorageClient(context).uploadCSV(csvString);
      },
    },
    edits: {
      async publish(params: PublishEditParams) {
        const { createEditsClient } = await import('./client/edits.js');
        return createEditsClient(context).publish(params);
      },
      async publishToSpace(params: PublishEditToSpaceParams) {
        const { createEditsClient } = await import('./client/edits.js');
        return createEditsClient(context).publishToSpace(params);
      },
    },
    entities: createEntitiesClient(context),
    images: {
      async create(params: CreateImageParams) {
        const { createImagesClient } = await import('./client/images.js');
        return createImagesClient(context).create(params);
      },
    },
    comments: createCommentsClient(context),
    personalSpaces: createPersonalSpacesClient(context),
    daoSpaces: createDaoSpacesClient(context),
    proposals: createProposalsClient(context),
    entityVotes: createEntityVotesClient(context),
  };
}
