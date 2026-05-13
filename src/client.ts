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

export type FetchLike = typeof fetch;

export type GraphQlResponse<T> = {
  data?: T;
  errors?: unknown;
};

export type EditCalldataParams = {
  spaceId: string;
  cid: string;
};

export type ApiCalldataResult = {
  to: `0x${string}`;
  data: `0x${string}`;
};

export type ImageSource = { blob: Blob } | { url: string };

export type UploadImageParams = ImageSource & {
  alternativeGateway?: boolean;
};

export type UploadImageResult = {
  cid: `ipfs://${string}`;
  dimensions?: { width: number; height: number };
};

export type CreateImageParams = ImageSource & {
  name?: string;
  description?: string;
  id?: Id | string;
  alternativeGateway?: boolean;
};

export type CreateResult = {
  id: Id;
  ops: Op[];
};

export type CreateImageResult = CreateResult & {
  cid: string;
  dimensions?: { width: number; height: number };
};

export type DeleteEntityParams = {
  id: Id | string;
  spaceId: Id | string;
};

export type CreateCommentParams = {
  id?: Id | string;
  content: string;
  replyTo: {
    entityId: Id | string;
    spaceId: Id | string;
  };
  resolved?: boolean;
};

export type UpdateCommentParams = {
  id: Id | string;
  content?: string;
  resolved?: boolean;
};

export type CalldataResult = {
  to: `0x${string}`;
  calldata: `0x${string}`;
};

export type CreatePersonalSpaceParams = {
  name: string;
  accountAddress: Address;
};

export type CreatePersonalSpaceResult = CalldataResult & {
  spaceEntityId: Id;
  accountId: string;
  ops: Op[];
};

export type HasPersonalSpaceParams = {
  address: Hex;
  rpcUrl?: string;
};

export type PublishEditParams = {
  name: string;
  ops: Op[];
  author: Id | string;
};

export type PublishEditResult = {
  cid: `ipfs://${string}`;
  editId: Id;
};

export type PublishPersonalSpaceEditParams = PublishEditParams & {
  spaceId: Id | string;
};

export type PublishPersonalSpaceEditResult = PublishEditResult & CalldataResult;

export type VotingSettingsInput = {
  slowPathPercentageThreshold: number;
  fastPathFlatThreshold: number;
  quorum: number;
  durationInDays: number;
};

export type VotingMode = 'SLOW' | 'FAST';

export type VoteOption = 'YES' | 'NO' | 'ABSTAIN';

export type CreateDaoSpaceParams = {
  name: string;
  author: Id | string;
  votingSettings: VotingSettingsInput;
  initialEditorSpaceIds: `0x${string}`[];
  initialMemberSpaceIds?: `0x${string}`[];
  initialTopicId?: string;
  ops?: Op[];
};

export type CreateDaoSpaceResult = CalldataResult & {
  spaceEntityId: Id;
  cid: `ipfs://${string}`;
};

export type ProposalAction = {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
};

export type CreateProposalParams = {
  fromSpaceId: string;
  daoSpaceId: string;
  proposalId?: string;
  votingMode?: VotingMode;
  actions: ProposalAction[];
};

export type ProposalResult = CalldataResult & {
  proposalId: `0x${string}`;
};

export type ProposeEditParams = PublishEditParams & {
  daoSpaceAddress: `0x${string}`;
  callerSpaceId: string;
  daoSpaceId: string;
  votingMode?: VotingMode;
  proposalId?: string;
};

export type ProposeEditResult = PublishEditResult & ProposalResult;

export type DaoSpaceRoleProposalBaseParams = {
  authorSpaceId: string;
  spaceId: string;
  daoSpaceAddress: `0x${string}`;
  votingMode?: VotingMode;
  proposalId?: string;
};

export type ProposeAddMemberParams = DaoSpaceRoleProposalBaseParams & {
  newMemberSpaceId: string;
};

export type ProposeRemoveMemberParams = DaoSpaceRoleProposalBaseParams & {
  memberToRemoveSpaceId: string;
};

export type ProposeAddEditorParams = Omit<DaoSpaceRoleProposalBaseParams, 'votingMode'> & {
  votingMode?: 'SLOW';
  newEditorSpaceId: string;
};

export type ProposeRemoveEditorParams = Omit<DaoSpaceRoleProposalBaseParams, 'votingMode'> & {
  votingMode?: 'SLOW';
  editorToRemoveSpaceId: string;
};

export type ProposeRequestMembershipParams = {
  authorSpaceId: string;
  spaceId: string;
  proposalId?: string;
};

export type VoteProposalParams = {
  authorSpaceId: string;
  spaceId: string;
  proposalId: string;
  vote: VoteOption;
};

export type ExecuteProposalParams = {
  authorSpaceId: string;
  spaceId: string;
  proposalId: string;
};

export type EntityVoteParams = {
  authorSpaceId: Id | string;
  spaceId: Id | string;
  entityId: Id | string;
};

export type Client = {
  network: GeoNetworkConfig;
  api: {
    graphql<T>(query: string): Promise<GraphQlResponse<T>>;
    getEditCalldata(params: EditCalldataParams): Promise<ApiCalldataResult>;
  };
  storage: {
    uploadImage(params: UploadImageParams): Promise<UploadImageResult>;
    uploadCSV(csvString: string): Promise<`ipfs://${string}`>;
  };
  entities: {
    delete(params: DeleteEntityParams): Promise<CreateResult>;
  };
  images: {
    create(params: CreateImageParams): Promise<CreateImageResult>;
  };
  comments: {
    create(params: CreateCommentParams): Promise<CreateResult>;
    update(params: UpdateCommentParams): CreateResult;
  };
  personalSpaces: {
    create(params: CreatePersonalSpaceParams): CreatePersonalSpaceResult;
    hasSpace(params: HasPersonalSpaceParams): Promise<boolean>;
    publishEdit(params: PublishPersonalSpaceEditParams): Promise<PublishPersonalSpaceEditResult>;
  };
  daoSpaces: {
    create(params: CreateDaoSpaceParams): Promise<CreateDaoSpaceResult>;
    proposeEdit(params: ProposeEditParams): Promise<ProposeEditResult>;
    proposeAddMember(params: ProposeAddMemberParams): ProposalResult;
    proposeRemoveMember(params: ProposeRemoveMemberParams): ProposalResult;
    proposeAddEditor(params: ProposeAddEditorParams): ProposalResult;
    proposeRemoveEditor(params: ProposeRemoveEditorParams): ProposalResult;
    proposeRequestMembership(params: ProposeRequestMembershipParams): ProposalResult;
    proposals: {
      create(params: CreateProposalParams): ProposalResult;
      vote(params: VoteProposalParams): CalldataResult;
      execute(params: ExecuteProposalParams): CalldataResult;
      actions: {
        publishEdit(daoSpaceAddress: `0x${string}`, cid: string): ProposalAction;
        addEditor(daoSpaceAddress: `0x${string}`, spaceId: string): ProposalAction;
        removeEditor(daoSpaceAddress: `0x${string}`, spaceId: string): ProposalAction;
        addMember(daoSpaceAddress: `0x${string}`, spaceId: string): ProposalAction;
        removeMember(daoSpaceAddress: `0x${string}`, spaceId: string): ProposalAction;
        updateVotingSettings(daoSpaceAddress: `0x${string}`, votingSettings: VotingSettingsInput): ProposalAction;
      };
    };
  };
  entityVotes: {
    upvote(params: EntityVoteParams): CalldataResult;
    downvote(params: EntityVoteParams): CalldataResult;
    withdraw(params: EntityVoteParams): CalldataResult;
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
  fetch?: FetchLike;
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
export function createGeoClient(params: CreateGeoClientParams): Client {
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
      async uploadImage(params: UploadImageParams) {
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
      delete: (params: DeleteEntityParams) => deleteEntity(context, params),
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
      async create(params: CreateImageParams) {
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
      create: (params: CreateCommentParams) => Comments.create(context, params),
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
      create: (params: CreatePersonalSpaceParams) => PersonalSpaces.create(context, params),
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
      hasSpace: (params: HasPersonalSpaceParams) => PersonalSpaces.hasSpace(context, params),
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
      publishEdit: (params: PublishPersonalSpaceEditParams) => PersonalSpaces.publishEdit(context, params),
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
      create: (params: CreateDaoSpaceParams) => DaoSpaces.create(context, params),
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
      proposeEdit: (params: ProposeEditParams) => DaoSpaces.proposeEdit(context, params),
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
      proposeAddMember: (params: ProposeAddMemberParams) => DaoSpaces.proposeAddMember(context, params),
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
      proposeRemoveMember: (params: ProposeRemoveMemberParams) => DaoSpaces.proposeRemoveMember(context, params),
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
      proposeAddEditor: (params: ProposeAddEditorParams) => DaoSpaces.proposeAddEditor(context, params),
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
      proposeRemoveEditor: (params: ProposeRemoveEditorParams) => DaoSpaces.proposeRemoveEditor(context, params),
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
      proposeRequestMembership: (params: ProposeRequestMembershipParams) =>
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
        create: (params: CreateProposalParams) => DaoSpaces.createProposal(context, params),
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
        vote: (params: VoteProposalParams) => DaoSpaces.voteProposal(context, params),
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
        execute: (params: ExecuteProposalParams) => DaoSpaces.executeProposal(context, params),
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
      upvote: (params: EntityVoteParams) => EntityVotes.upvote(context, params),
      /**
       * Builds calldata for downvoting an entity.
       *
       * @example
       * ```ts
       * const tx = geo.entityVotes.downvote({ authorSpaceId, spaceId, entityId });
       * ```
       */
      downvote: (params: EntityVoteParams) => EntityVotes.downvote(context, params),
      /**
       * Builds calldata for withdrawing an entity vote.
       *
       * @example
       * ```ts
       * const tx = geo.entityVotes.withdraw({ authorSpaceId, spaceId, entityId });
       * ```
       */
      withdraw: (params: EntityVoteParams) => EntityVotes.withdraw(context, params),
    },
  };
}
