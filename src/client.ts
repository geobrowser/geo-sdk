import * as Api from './client/api.js';
import * as Comments from './client/comments.js';
import type { FetchLike, GeoClientContext } from './client/context.js';
import * as DaoSpaces from './client/dao-spaces.js';
import type { PublishEditToSpaceParams } from './client/edits.js';
import { deleteEntity } from './client/entities.js';
import * as EntityVotes from './client/entity-votes.js';
import type { CreateImageParams } from './client/images.js';
import * as PersonalSpaces from './client/personal-spaces.js';
import * as Proposals from './client/proposals.js';
import type { PublishEditParams, PublishImageParams } from './ipfs-core.js';
import { resolveGeoNetwork } from './networks.js';
import type { Networkish } from './types.js';

export type CreateGeoClientParams = {
  /**
   * Built-in network ID or a custom network configuration.
   *
   * Omit this to use Geo TESTNET. Pass `GeoTestnetConfig` for the built-in
   * testnet config, or `defineGeoNetworkConfig(...)` when running against a
   * local or custom deployment.
   *
   * @example
   * ```ts
   * import { GeoTestnetConfig } from '@geoprotocol/geo-sdk';
   *
   * const geo = createGeoClient({ network: GeoTestnetConfig });
   * ```
   */
  network?: Networkish;
  /**
   * Fetch implementation used by API, IPFS, and GraphQL-backed helpers.
   *
   * Sync calldata helpers do not require fetch. Async helpers that upload or
   * query data will use this value, then fall back to `globalThis.fetch`.
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
export function createGeoClient(params: CreateGeoClientParams = {}) {
  const fetchFn = params.fetch ?? globalThis.fetch;

  const context: GeoClientContext = {
    network: resolveGeoNetwork(params.network),
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
      async uploadImage(params: PublishImageParams & { alternativeGateway?: boolean }) {
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
    /** Edit publishing helpers. */
    edits: {
      /**
       * Publishes an edit to IPFS and returns its CID and generated edit ID.
       *
       * @example
       * ```ts
       * import * as Ops from '@geoprotocol/geo-sdk/ops';
       *
       * const { ops } = Ops.entities.create({ name: 'Geo entity' });
       * const edit = await geo.edits.publish({
       *   name: 'Create Geo entity',
       *   author: authorSpaceId,
       *   ops,
       * });
       * ```
       */
      async publish(params: PublishEditParams) {
        const { publish } = await import('./client/edits.js');
        return publish(context, params);
      },
      /**
       * Publishes an edit to IPFS and returns personal-space calldata for the configured registry.
       *
       * @example
       * ```ts
       * const tx = await geo.edits.publishToSpace({
       *   name: 'Create entity',
       *   spaceId,
       *   author: spaceId,
       *   ops,
       * });
       *
       * await walletClient.sendTransaction({
       *   to: tx.to,
       *   data: tx.calldata,
       * });
       * ```
       */
      async publishToSpace(params: PublishEditToSpaceParams) {
        const { publishToSpace } = await import('./client/edits.js');
        return publishToSpace(context, params);
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
      delete: (params: Parameters<typeof deleteEntity>[1]) => deleteEntity(context, params),
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
      create: (params: Parameters<typeof Comments.create>[1]) => Comments.create(context, params),
      /**
       * Builds update-comment ops without network access.
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
      create: (params: PersonalSpaces.CreatePersonalSpaceParams) => PersonalSpaces.create(context, params),
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
      hasSpace: (params: PersonalSpaces.HasSpaceParams) => PersonalSpaces.hasSpace(context, params),
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
      publishEdit: (params: PublishEditToSpaceParams) => PersonalSpaces.publishEdit(context, params),
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
      create: (params: DaoSpaces.CreateDaoSpaceParams) => DaoSpaces.create(context, params),
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
      proposeEdit: (params: Proposals.ProposeEditParams) => DaoSpaces.proposeEdit(context, params),
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
      proposeAddMember: (params: DaoSpaces.ProposeAddMemberParams) => DaoSpaces.proposeAddMember(context, params),
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
      proposeRemoveMember: (params: DaoSpaces.ProposeRemoveMemberParams) =>
        DaoSpaces.proposeRemoveMember(context, params),
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
      proposeAddEditor: (params: DaoSpaces.ProposeAddEditorParams) => DaoSpaces.proposeAddEditor(context, params),
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
      proposeRemoveEditor: (params: DaoSpaces.ProposeRemoveEditorParams) =>
        DaoSpaces.proposeRemoveEditor(context, params),
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
      proposeRequestMembership: (params: DaoSpaces.ProposeRequestMembershipParams) =>
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
        create: (params: Proposals.CreateProposalParams) => Proposals.create(context, params),
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
        vote: (params: Proposals.VoteProposalParams) => Proposals.vote(context, params),
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
        execute: (params: Proposals.ExecuteProposalParams) => Proposals.execute(context, params),
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
        actions: Proposals.actions,
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
      upvote: (params: EntityVotes.ClientEntityVoteParams) => EntityVotes.upvote(context, params),
      /**
       * Builds calldata for downvoting an entity.
       *
       * @example
       * ```ts
       * const tx = geo.entityVotes.downvote({ authorSpaceId, spaceId, entityId });
       * ```
       */
      downvote: (params: EntityVotes.ClientEntityVoteParams) => EntityVotes.downvote(context, params),
      /**
       * Builds calldata for withdrawing an entity vote.
       *
       * @example
       * ```ts
       * const tx = geo.entityVotes.withdraw({ authorSpaceId, spaceId, entityId });
       * ```
       */
      withdraw: (params: EntityVotes.ClientEntityVoteParams) => EntityVotes.withdraw(context, params),
    },
  };
}
