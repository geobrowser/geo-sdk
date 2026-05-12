import type { Op } from '@geoprotocol/grc-20';
import type { Address, Hex } from 'viem';
import * as Api from './client/api.js';
import * as Comments from './client/comments.js';
import type { GeoClientContext } from './client/context.js';
import * as DaoSpaces from './client/dao-spaces.js';
import { deleteEntity } from './client/entities.js';
import * as EntityVotes from './client/entity-votes.js';
import * as PersonalSpaces from './client/personal-spaces.js';
import type { Id } from './id.js';
import { defineGeoNetworkConfig } from './networks.js';
import type { GeoNetworkConfig } from './types.js';

export type GeoFetch = typeof fetch;

export type GeoGraphQlResponse<T> = {
  data?: T;
  errors?: unknown;
};

export type GeoEditCalldataParams = {
  spaceId: string;
  cid: string;
};

export type GeoApiCalldataResult = {
  to: `0x${string}`;
  data: `0x${string}`;
};

export type GeoImageSource = { blob: Blob } | { url: string };

export type GeoUploadImageParams = GeoImageSource & {
  alternativeGateway?: boolean;
};

export type GeoUploadImageResult = {
  cid: `ipfs://${string}`;
  dimensions?: { width: number; height: number };
};

export type GeoCreateImageParams = GeoImageSource & {
  name?: string;
  description?: string;
  id?: Id | string;
  alternativeGateway?: boolean;
};

export type GeoCreateResult = {
  id: Id;
  ops: Op[];
};

export type GeoCreateImageResult = GeoCreateResult & {
  cid: string;
  dimensions?: { width: number; height: number };
};

export type GeoDeleteEntityParams = {
  id: Id | string;
  spaceId: Id | string;
};

export type GeoCreateCommentParams = {
  id?: Id | string;
  content: string;
  replyTo: {
    entityId: Id | string;
    spaceId: Id | string;
  };
  resolved?: boolean;
};

export type GeoUpdateCommentParams = {
  id: Id | string;
  content?: string;
  resolved?: boolean;
};

export type GeoCalldataResult = {
  to: `0x${string}`;
  calldata: `0x${string}`;
};

export type GeoCreatePersonalSpaceParams = {
  name: string;
  accountAddress: Address;
};

export type GeoCreatePersonalSpaceResult = GeoCalldataResult & {
  spaceEntityId: Id;
  accountId: string;
  ops: Op[];
};

export type GeoHasPersonalSpaceParams = {
  address: Hex;
  rpcUrl?: string;
};

export type GeoPublishEditParams = {
  name: string;
  ops: Op[];
  author: Id | string;
};

export type GeoPublishEditResult = {
  cid: `ipfs://${string}`;
  editId: Id;
};

export type GeoPublishPersonalSpaceEditParams = GeoPublishEditParams & {
  spaceId: Id | string;
};

export type GeoPublishPersonalSpaceEditResult = GeoPublishEditResult & GeoCalldataResult;

export type GeoVotingSettingsInput = {
  slowPathPercentageThreshold: number;
  fastPathFlatThreshold: number;
  quorum: number;
  durationInDays: number;
};

export type GeoVotingMode = 'SLOW' | 'FAST';

export type GeoVoteOption = 'YES' | 'NO' | 'ABSTAIN';

export type GeoCreateDaoSpaceParams = {
  name: string;
  author: Id | string;
  votingSettings: GeoVotingSettingsInput;
  initialEditorSpaceIds: `0x${string}`[];
  initialMemberSpaceIds?: `0x${string}`[];
  initialTopicId?: string;
  ops?: Op[];
};

export type GeoCreateDaoSpaceResult = GeoCalldataResult & {
  spaceEntityId: Id;
  cid: `ipfs://${string}`;
};

export type GeoProposalAction = {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
};

export type GeoCreateProposalParams = {
  fromSpaceId: string;
  daoSpaceId: string;
  proposalId?: string;
  votingMode?: GeoVotingMode;
  actions: GeoProposalAction[];
};

export type GeoProposalResult = GeoCalldataResult & {
  proposalId: `0x${string}`;
};

export type GeoProposeEditParams = GeoPublishEditParams & {
  daoSpaceAddress: `0x${string}`;
  callerSpaceId: string;
  daoSpaceId: string;
  votingMode?: GeoVotingMode;
  proposalId?: string;
};

export type GeoProposeEditResult = GeoPublishEditResult & GeoProposalResult;

export type GeoDaoSpaceRoleProposalBaseParams = {
  authorSpaceId: string;
  spaceId: string;
  daoSpaceAddress: `0x${string}`;
  votingMode?: GeoVotingMode;
  proposalId?: string;
};

export type GeoProposeAddMemberParams = GeoDaoSpaceRoleProposalBaseParams & {
  newMemberSpaceId: string;
};

export type GeoProposeRemoveMemberParams = GeoDaoSpaceRoleProposalBaseParams & {
  memberToRemoveSpaceId: string;
};

export type GeoProposeAddEditorParams = Omit<GeoDaoSpaceRoleProposalBaseParams, 'votingMode'> & {
  votingMode?: 'SLOW';
  newEditorSpaceId: string;
};

export type GeoProposeRemoveEditorParams = Omit<GeoDaoSpaceRoleProposalBaseParams, 'votingMode'> & {
  votingMode?: 'SLOW';
  editorToRemoveSpaceId: string;
};

export type GeoProposeRequestMembershipParams = {
  authorSpaceId: string;
  spaceId: string;
  proposalId?: string;
};

export type GeoVoteProposalParams = {
  authorSpaceId: string;
  spaceId: string;
  proposalId: string;
  vote: GeoVoteOption;
};

export type GeoExecuteProposalParams = {
  authorSpaceId: string;
  spaceId: string;
  proposalId: string;
};

export type GeoEntityVoteParams = {
  authorSpaceId: Id | string;
  spaceId: Id | string;
  entityId: Id | string;
};

export type GeoClient = {
  network: GeoNetworkConfig;
  api: {
    graphql<T>(query: string): Promise<GeoGraphQlResponse<T>>;
    getEditCalldata(params: GeoEditCalldataParams): Promise<GeoApiCalldataResult>;
  };
  storage: {
    uploadImage(params: GeoUploadImageParams): Promise<GeoUploadImageResult>;
    uploadCSV(csvString: string): Promise<`ipfs://${string}`>;
  };
  entities: {
    delete(params: GeoDeleteEntityParams): Promise<GeoCreateResult>;
  };
  images: {
    create(params: GeoCreateImageParams): Promise<GeoCreateImageResult>;
  };
  comments: {
    create(params: GeoCreateCommentParams): Promise<GeoCreateResult>;
    update(params: GeoUpdateCommentParams): GeoCreateResult;
  };
  personalSpaces: {
    create(params: GeoCreatePersonalSpaceParams): GeoCreatePersonalSpaceResult;
    hasSpace(params: GeoHasPersonalSpaceParams): Promise<boolean>;
    publishEdit(params: GeoPublishPersonalSpaceEditParams): Promise<GeoPublishPersonalSpaceEditResult>;
  };
  daoSpaces: {
    create(params: GeoCreateDaoSpaceParams): Promise<GeoCreateDaoSpaceResult>;
    proposeEdit(params: GeoProposeEditParams): Promise<GeoProposeEditResult>;
    proposeAddMember(params: GeoProposeAddMemberParams): GeoProposalResult;
    proposeRemoveMember(params: GeoProposeRemoveMemberParams): GeoProposalResult;
    proposeAddEditor(params: GeoProposeAddEditorParams): GeoProposalResult;
    proposeRemoveEditor(params: GeoProposeRemoveEditorParams): GeoProposalResult;
    proposeRequestMembership(params: GeoProposeRequestMembershipParams): GeoProposalResult;
    proposals: {
      create(params: GeoCreateProposalParams): GeoProposalResult;
      vote(params: GeoVoteProposalParams): GeoCalldataResult;
      execute(params: GeoExecuteProposalParams): GeoCalldataResult;
      actions: {
        publishEdit(daoSpaceAddress: `0x${string}`, cid: string): GeoProposalAction;
        addEditor(daoSpaceAddress: `0x${string}`, spaceId: string): GeoProposalAction;
        removeEditor(daoSpaceAddress: `0x${string}`, spaceId: string): GeoProposalAction;
        addMember(daoSpaceAddress: `0x${string}`, spaceId: string): GeoProposalAction;
        removeMember(daoSpaceAddress: `0x${string}`, spaceId: string): GeoProposalAction;
        updateVotingSettings(daoSpaceAddress: `0x${string}`, votingSettings: GeoVotingSettingsInput): GeoProposalAction;
      };
    };
  };
  entityVotes: {
    upvote(params: GeoEntityVoteParams): GeoCalldataResult;
    downvote(params: GeoEntityVoteParams): GeoCalldataResult;
    withdraw(params: GeoEntityVoteParams): GeoCalldataResult;
  };
};

export type CreateGeoClientParams = {
  /**
   * Built-in or custom network configuration.
   *
   * Pass `GeoTestnetConfig` for the built-in testnet config, or
   * `defineGeoNetworkConfig(...)` when running against a local or custom
   * deployment. The network config is required so callers make an explicit
   * environment choice. String IDs such as `"TESTNET"` are intentionally not
   * accepted by the client.
   *
   * @example
   * ```ts
   * import { GeoTestnetConfig } from '@geoprotocol/geo-sdk';
   *
   * const geo = createGeoClient({ network: GeoTestnetConfig });
   * ```
   */
  network: GeoNetworkConfig;
  /**
   * Fetch implementation used by API, IPFS, and GraphQL-backed helpers.
   *
   * Async helpers that upload or query data use this value, then fall back to
   * `globalThis.fetch`.
   *
   * @example
   * ```ts
   * const geo = createGeoClient({
   *   network: GeoTestnetConfig,
   *   fetch: customFetch,
   * });
   * ```
   */
  fetch?: GeoFetch;
};

/**
 * Creates a configured Geo SDK client.
 *
 * The client groups the SDK into namespaces by workflow:
 * - `api`, `storage`, `images`, `comments`, and delete helpers use the
 *   configured API origin and fetch implementation.
 * - transaction/calldata helpers use contract addresses from the configured
 *   network.
 *
 * @example
 * ```ts
 * import { createGeoClient, GeoTestnetConfig } from '@geoprotocol/geo-sdk';
 * import * as Ops from '@geoprotocol/geo-sdk/ops';
 *
 * const geo = createGeoClient({ network: GeoTestnetConfig });
 * const { ops } = Ops.entities.create({ name: 'Geo entity' });
 * const edit = await geo.personalSpaces.publishEdit({
 *   name: 'Create entity',
 *   spaceId,
 *   author,
 *   ops,
 * });
 * ```
 *
 * @example
 * Create a client for a custom deployment.
 *
 * ```ts
 * import { createGeoClient, defineGeoNetworkConfig } from '@geoprotocol/geo-sdk';
 *
 * const local = defineGeoNetworkConfig({
 *   id: 'LOCAL',
 *   name: 'Local Geo',
 *   apiOrigin: 'http://localhost:3000',
 *   chain: { id: 31337, name: 'Anvil', rpcUrl: 'http://localhost:8545' },
 *   contracts: {
 *     SPACE_REGISTRY_ADDRESS: '0x...',
 *     DAO_SPACE_FACTORY_ADDRESS: '0x...',
 *   },
 * });
 *
 * const geo = createGeoClient({ network: local });
 * ```
 *
 * @param params Network and fetch configuration for context-aware helpers.
 * @returns A configured client with API helpers and transaction workflows.
 */
export function createGeoClient(params: CreateGeoClientParams): GeoClient {
  if (!params?.network) {
    throw new Error(
      'createGeoClient requires a Geo network config. Pass GeoTestnetConfig or defineGeoNetworkConfig().',
    );
  }
  if (typeof params.network === 'string') {
    throw new Error(
      'createGeoClient requires a full Geo network config. Pass GeoTestnetConfig or defineGeoNetworkConfig().',
    );
  }

  const fetchFn = params.fetch ?? globalThis.fetch;

  const context: GeoClientContext = {
    network: defineGeoNetworkConfig(params.network),
    fetch: fetchFn,
  };

  return {
    /** The resolved network configuration used by this client. */
    network: context.network,
    /** Low-level API helpers that use the configured API origin. */
    api: {
      /**
       * Sends a GraphQL request to the configured Geo API.
       *
       * This returns the raw GraphQL envelope so callers can inspect `errors`
       * when they want custom error handling.
       *
       * @example
       * ```ts
       * const response = await geo.api.graphql<{
       *   entity: { id: string } | null;
       * }>(`
       *   query {
       *     entity(id: "3af3e22d21694a078681516710b7ecf1") {
       *       id
       *     }
       *   }
       * `);
       * ```
       */
      async graphql<T>(query: string) {
        return Api.graphqlRequest<T>(context, query);
      },
      /**
       * Requests edit calldata from the configured Geo API for a published edit CID.
       *
       * @example
       * ```ts
       * const { to, data } = await geo.api.getEditCalldata({
       *   spaceId,
       *   cid: 'ipfs://baf...',
       * });
       * ```
       */
      async getEditCalldata(params: { spaceId: string; cid: string }) {
        return Api.getEditCalldata(context, params);
      },
    },
    /** IPFS upload helpers for files and CSV data. */
    storage: {
      /**
       * Uploads an image file or URL and returns the uploaded CID plus image dimensions when detected.
       *
       * @example
       * ```ts
       * const uploaded = await geo.storage.uploadImage({
       *   url: 'https://example.com/photo.png',
       * });
       *
       * console.log(uploaded.cid, uploaded.dimensions);
       * ```
       */
      async uploadImage(params: GeoUploadImageParams) {
        const { uploadImage } = await import('./client/storage.js');
        return uploadImage(context, params);
      },
      /**
       * Compresses and uploads CSV content, returning the uploaded IPFS URI.
       *
       * @example
       * ```ts
       * const cid = await geo.storage.uploadCSV('name,score\nAlice,10');
       * ```
       */
      async uploadCSV(csvString: string): Promise<`ipfs://${string}`> {
        const { uploadCSV } = await import('./client/storage.js');
        return uploadCSV(context, csvString);
      },
    },
    /** Entity helpers that need graph context from the configured API. */
    entities: {
      /**
       * Fetches current entity values and relations from the configured API, then builds delete ops.
       *
       * @example
       * ```ts
       * const { ops } = await geo.entities.delete({
       *   id: entityId,
       *   spaceId,
       * });
       * ```
       */
      delete: (params: GeoDeleteEntityParams) => deleteEntity(context, params),
    },
    /** Image workflow helpers. */
    images: {
      /**
       * Uploads an image, detects dimensions when possible, and builds image entity ops.
       *
       * @example
       * ```ts
       * const image = await geo.images.create({
       *   url: 'https://example.com/cover.png',
       *   name: 'Cover image',
       * });
       * ```
       */
      async create(params: GeoCreateImageParams) {
        const { create } = await import('./client/images.js');
        return create(context, params);
      },
    },
    /** Comment operation helpers. */
    comments: {
      /**
       * Fetches reply-to context for the target entity and builds comment creation ops.
       *
       * @example
       * ```ts
       * const comment = await geo.comments.create({
       *   content: 'Looks good to me',
       *   replyTo: { entityId, spaceId },
       * });
       * ```
       */
      create: (params: GeoCreateCommentParams) => Comments.create(context, params),
      /**
       * Builds update-comment ops.
       *
       * @example
       * ```ts
       * const { ops } = geo.comments.update({
       *   id: commentId,
       *   resolved: true,
       * });
       * ```
       */
      update: Comments.update,
    },
    /** Personal-space transaction helpers. */
    personalSpaces: {
      /**
       * Returns calldata for creating a personal space with the configured registry.
       *
       * @example
       * ```ts
       * const { to, calldata, ops } = geo.personalSpaces.create({
       *   name: 'Alice',
       *   accountAddress: account.address,
       * });
       *
       * await walletClient.sendTransaction({ to, data: calldata });
       * ```
       */
      create: (params: GeoCreatePersonalSpaceParams) => PersonalSpaces.create(context, params),
      /**
       * Checks whether an address already has a personal space.
       *
       * @example
       * ```ts
       * const hasExistingSpace = await geo.personalSpaces.hasSpace({
       *   address: account.address,
       * });
       * ```
       */
      hasSpace: (params: GeoHasPersonalSpaceParams) => PersonalSpaces.hasSpace(context, params),
      /**
       * Publishes an edit and returns calldata for submitting it to a personal space.
       *
       * @example
       * ```ts
       * const tx = await geo.personalSpaces.publishEdit({
       *   name: 'Create entity',
       *   spaceId,
       *   author: spaceId,
       *   ops,
       * });
       * ```
       */
      publishEdit: (params: GeoPublishPersonalSpaceEditParams) => PersonalSpaces.publishEdit(context, params),
    },
    /** DAO-space transaction helpers. */
    daoSpaces: {
      /**
       * Publishes the initial DAO edit and returns calldata for creating a DAO space.
       *
       * @example
       * ```ts
       * const tx = await geo.daoSpaces.create({
       *   name: 'Research DAO',
       *   author: authorSpaceId,
       *   initialEditorSpaceIds: [authorSpaceId],
       *   votingSettings: {
       *     slowPathPercentageThreshold: 50,
       *     fastPathFlatThreshold: 1,
       *     quorum: 1,
       *     durationInDays: 2,
       *   },
       * });
       * ```
       */
      create: (params: GeoCreateDaoSpaceParams) => DaoSpaces.create(context, params),
      /**
       * Publishes an edit and wraps it in a DAO-space proposal action.
       *
       * @example
       * ```ts
       * const proposal = await geo.daoSpaces.proposeEdit({
       *   name: 'Publish edit',
       *   ops,
       *   author: authorSpaceId,
       *   daoSpaceAddress,
       *   callerSpaceId: authorSpaceId,
       *   daoSpaceId,
       * });
       * ```
       */
      proposeEdit: (params: GeoProposeEditParams) => DaoSpaces.proposeEdit(context, params),
      /**
       * Builds calldata for a DAO proposal that adds a member.
       *
       * @example
       * ```ts
       * const tx = geo.daoSpaces.proposeAddMember({
       *   authorSpaceId,
       *   spaceId: daoSpaceId,
       *   daoSpaceAddress,
       *   newMemberSpaceId: memberSpaceId,
       * });
       * ```
       */
      proposeAddMember: (params: GeoProposeAddMemberParams) => DaoSpaces.proposeAddMember(context, params),
      /**
       * Builds calldata for a DAO proposal that removes a member.
       *
       * @example
       * ```ts
       * const tx = geo.daoSpaces.proposeRemoveMember({
       *   authorSpaceId,
       *   spaceId: daoSpaceId,
       *   daoSpaceAddress,
       *   memberToRemoveSpaceId,
       * });
       * ```
       */
      proposeRemoveMember: (params: GeoProposeRemoveMemberParams) => DaoSpaces.proposeRemoveMember(context, params),
      /**
       * Builds calldata for a DAO proposal that adds an editor.
       *
       * @example
       * ```ts
       * const tx = geo.daoSpaces.proposeAddEditor({
       *   authorSpaceId,
       *   spaceId: daoSpaceId,
       *   daoSpaceAddress,
       *   newEditorSpaceId: editorSpaceId,
       * });
       * ```
       */
      proposeAddEditor: (params: GeoProposeAddEditorParams) => DaoSpaces.proposeAddEditor(context, params),
      /**
       * Builds calldata for a DAO proposal that removes an editor.
       *
       * @example
       * ```ts
       * const tx = geo.daoSpaces.proposeRemoveEditor({
       *   authorSpaceId,
       *   spaceId: daoSpaceId,
       *   daoSpaceAddress,
       *   editorToRemoveSpaceId,
       * });
       * ```
       */
      proposeRemoveEditor: (params: GeoProposeRemoveEditorParams) => DaoSpaces.proposeRemoveEditor(context, params),
      /**
       * Builds calldata for requesting membership in a DAO space.
       *
       * @example
       * ```ts
       * const tx = geo.daoSpaces.proposeRequestMembership({
       *   authorSpaceId: requesterSpaceId,
       *   spaceId: daoSpaceId,
       * });
       * ```
       */
      proposeRequestMembership: (params: GeoProposeRequestMembershipParams) =>
        DaoSpaces.proposeRequestMembership(context, params),
      /** DAO-scoped low-level proposal helpers. */
      proposals: {
        /**
         * Builds calldata for creating a DAO proposal from prebuilt actions.
         *
         * @example
         * ```ts
         * const action = geo.daoSpaces.proposals.actions.addMember(daoSpaceAddress, memberSpaceId);
         * const tx = geo.daoSpaces.proposals.create({
         *   fromSpaceId: authorSpaceId,
         *   daoSpaceId,
         *   actions: [action],
         * });
         * ```
         */
        create: (params: GeoCreateProposalParams) => DaoSpaces.createProposal(context, params),
        /**
         * Builds calldata for voting on a DAO proposal.
         *
         * @example
         * ```ts
         * const tx = geo.daoSpaces.proposals.vote({
         *   authorSpaceId,
         *   spaceId: daoSpaceId,
         *   proposalId,
         *   vote: 'YES',
         * });
         * ```
         */
        vote: (params: GeoVoteProposalParams) => DaoSpaces.voteProposal(context, params),
        /**
         * Builds calldata for executing a passed DAO proposal.
         *
         * @example
         * ```ts
         * const tx = geo.daoSpaces.proposals.execute({
         *   authorSpaceId,
         *   spaceId: daoSpaceId,
         *   proposalId,
         * });
         * ```
         */
        execute: (params: GeoExecuteProposalParams) => DaoSpaces.executeProposal(context, params),
        /**
         * Helpers for constructing DAO proposal actions.
         *
         * @example
         * ```ts
         * const actions = [
         *   geo.daoSpaces.proposals.actions.addEditor(daoSpaceAddress, editorSpaceId),
         *   geo.daoSpaces.proposals.actions.updateVotingSettings(daoSpaceAddress, votingSettings),
         * ];
         * ```
         */
        actions: DaoSpaces.actions,
      },
    },
    /** Entity vote transaction helpers. */
    entityVotes: {
      /**
       * Builds calldata for upvoting an entity.
       *
       * @example
       * ```ts
       * const tx = geo.entityVotes.upvote({
       *   authorSpaceId,
       *   spaceId,
       *   entityId,
       * });
       * ```
       */
      upvote: (params: GeoEntityVoteParams) => EntityVotes.upvote(context, params),
      /**
       * Builds calldata for downvoting an entity.
       *
       * @example
       * ```ts
       * const tx = geo.entityVotes.downvote({ authorSpaceId, spaceId, entityId });
       * ```
       */
      downvote: (params: GeoEntityVoteParams) => EntityVotes.downvote(context, params),
      /**
       * Builds calldata for withdrawing an entity vote.
       *
       * @example
       * ```ts
       * const tx = geo.entityVotes.withdraw({ authorSpaceId, spaceId, entityId });
       * ```
       */
      withdraw: (params: GeoEntityVoteParams) => EntityVotes.withdraw(context, params),
    },
  };
}
