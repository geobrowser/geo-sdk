import * as Api from './client/api.js';
import * as Comments from './client/comments.js';
import type { FetchLike, GeoClientContext } from './client/context.js';
import * as DaoSpaces from './client/dao-spaces.js';
import type { PublishEditToSpaceParams } from './client/edits.js';
import * as Entities from './client/entities.js';
import * as EntityVotes from './client/entity-votes.js';
import type { CreateImageParams } from './client/images.js';
import * as PersonalSpaces from './client/personal-spaces.js';
import * as Proposals from './client/proposals.js';
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
    api: {
      async graphql<T>(query: string) {
        return Api.graphqlRequest<T>(context, query);
      },
      async getEditCalldata(params: { spaceId: string; cid: string }) {
        return Api.getEditCalldata(context, params);
      },
    },
    storage: {
      async uploadImage(params: PublishImageParams & { alternativeGateway?: boolean }) {
        const { uploadImage } = await import('./client/storage.js');
        return uploadImage(context, params);
      },
      async uploadCSV(csvString: string): Promise<`ipfs://${string}`> {
        const { uploadCSV } = await import('./client/storage.js');
        return uploadCSV(context, csvString);
      },
    },
    edits: {
      async publish(params: PublishEditParams) {
        const { publish } = await import('./client/edits.js');
        return publish(context, params);
      },
      async publishToSpace(params: PublishEditToSpaceParams) {
        const { publishToSpace } = await import('./client/edits.js');
        return publishToSpace(context, params);
      },
    },
    entities: {
      create: Entities.create,
      update: Entities.update,
      delete: (params: Parameters<typeof Entities.deleteEntity>[1]) => Entities.deleteEntity(context, params),
    },
    images: {
      async create(params: CreateImageParams) {
        const { create } = await import('./client/images.js');
        return create(context, params);
      },
    },
    comments: {
      create: (params: Parameters<typeof Comments.create>[1]) => Comments.create(context, params),
      update: Comments.update,
    },
    personalSpaces: {
      create: () => PersonalSpaces.create(context),
      publishEdit: (params: PublishEditToSpaceParams) => PersonalSpaces.publishEdit(context, params),
    },
    daoSpaces: {
      create: (params: DaoSpaces.CreateDaoSpaceParams) => DaoSpaces.create(context, params),
    },
    proposals: {
      create: (params: Proposals.CreateProposalParams) => Proposals.create(context, params),
      proposeEdit: (params: Proposals.ProposeEditParams) => Proposals.proposeEdit(context, params),
      vote: (params: Proposals.VoteProposalParams) => Proposals.vote(context, params),
      execute: (params: Proposals.ExecuteProposalParams) => Proposals.execute(context, params),
      actions: Proposals.actions,
    },
    entityVotes: {
      upvote: (params: EntityVotes.ClientEntityVoteParams) => EntityVotes.upvote(context, params),
      downvote: (params: EntityVotes.ClientEntityVoteParams) => EntityVotes.downvote(context, params),
      withdraw: (params: EntityVotes.ClientEntityVoteParams) => EntityVotes.withdraw(context, params),
    },
  };
}
