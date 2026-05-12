import type { Op } from '@geoprotocol/grc-20';
import { v4 as uuidv4 } from 'uuid';
import { encodeAbiParameters, encodeFunctionData } from 'viem';
import { SpaceRegistryAbi } from '../abis/index.js';
import { SPACE_TYPE } from '../core/ids/system.js';
import {
  EMPTY_SIGNATURE,
  EMPTY_TOPIC,
  ensure0xPrefix,
  isBytes16Hex,
  MEMBERSHIP_REQUESTED_ACTION,
} from '../dao-space/constants.js';
import type { VotingMode } from '../dao-space/types.js';
import {
  type CreateDaoSpaceCalldataParams,
  getCreateDaoSpaceCalldata,
} from '../encodings/get-create-dao-space-calldata.js';
import type { Id } from '../id.js';
import * as IdUtils from '../id-utils.js';
import { requireGeoContract } from '../networks.js';
import * as Ops from '../ops/index.js';
import type { GeoClientContext } from './context.js';
import * as Proposals from './proposals.js';

export type CreateDaoSpaceParams = Omit<
  CreateDaoSpaceCalldataParams,
  'initialEditsContentUri' | 'initialMemberSpaceIds'
> & {
  name: string;
  author: Id | string;
  initialMemberSpaceIds?: `0x${string}`[];
  ops?: Op[];
};

type DaoSpaceRoleProposalBaseParams = {
  authorSpaceId: string;
  spaceId: string;
  daoSpaceAddress?: `0x${string}`;
  votingMode?: VotingMode;
  proposalId?: string;
};

type SlowDaoSpaceRoleProposalBaseParams = Omit<DaoSpaceRoleProposalBaseParams, 'votingMode'> & {
  votingMode?: 'SLOW';
};

export type ProposeAddMemberParams = DaoSpaceRoleProposalBaseParams & {
  newMemberSpaceId: string;
};

export type ProposeRemoveMemberParams = DaoSpaceRoleProposalBaseParams & {
  memberToRemoveSpaceId: string;
};

export type ProposeAddEditorParams = SlowDaoSpaceRoleProposalBaseParams & {
  newEditorSpaceId: string;
};

export type ProposeRemoveEditorParams = SlowDaoSpaceRoleProposalBaseParams & {
  editorToRemoveSpaceId: string;
};

export type ProposeRequestMembershipParams = {
  authorSpaceId: string;
  spaceId: string;
  proposalId?: string;
};

function bytes16Id(value: string, name: string): `0x${string}` {
  const normalized = ensure0xPrefix(value);
  if (!isBytes16Hex(normalized)) {
    throw new Error(`${name} must be bytes16 hex (32 hex chars). Received: ${value}`);
  }

  return normalized;
}

function proposalActionTarget(context: GeoClientContext, daoSpaceAddress?: `0x${string}`) {
  return daoSpaceAddress ?? requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS');
}

function createRoleProposal(
  context: GeoClientContext,
  params: DaoSpaceRoleProposalBaseParams,
  action: Proposals.ProposalAction,
) {
  return Proposals.create(context, {
    fromSpaceId: params.authorSpaceId,
    daoSpaceId: params.spaceId,
    proposalId: params.proposalId,
    votingMode: params.votingMode ?? 'SLOW',
    actions: [action],
  });
}

/**
 * Publishes the initial DAO edit and returns calldata for creating a DAO space.
 *
 * The helper first validates DAO voting settings and required contract
 * addresses, then creates the space entity ops, publishes the initial edit, and
 * encodes `createDAOSpaceProxy` calldata using the resulting CID.
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
 *     durationInDays: 3,
 *   },
 * });
 *
 * await walletClient.sendTransaction({
 *   to: tx.to,
 *   data: tx.calldata,
 * });
 * ```
 *
 * @param context Client context containing network, contract, API, and fetch configuration.
 * @param params DAO name, author, voting settings, initial editors/members, and optional extra ops.
 * @returns DAO factory address, calldata, generated space entity ID, and initial edit CID.
 * @throws When DAO settings are invalid, required contracts are missing, IDs are invalid, or edit publishing fails.
 */
export async function create(context: GeoClientContext, params: CreateDaoSpaceParams) {
  const daoSpaceFactoryAddress = requireGeoContract(context.network, 'DAO_SPACE_FACTORY_ADDRESS');
  getCreateDaoSpaceCalldata({
    votingSettings: params.votingSettings,
    initialEditorSpaceIds: params.initialEditorSpaceIds,
    initialMemberSpaceIds: params.initialMemberSpaceIds ?? [],
    initialEditsContentUri: 'ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5',
    initialTopicId: params.initialTopicId,
  });

  const spaceEntityId = IdUtils.generate();
  const ops: Op[] = [];
  const { ops: createSpaceEntityOps } = Ops.entities.create({
    id: spaceEntityId,
    name: params.name,
    types: [SPACE_TYPE],
  });
  ops.push(...createSpaceEntityOps);
  ops.push(...(params.ops ?? []));

  const { publish } = await import('./edits.js');
  const { cid } = await publish(context, {
    name: `Create DAO Space: ${params.name}`,
    ops,
    author: params.author,
  });

  const calldata = getCreateDaoSpaceCalldata({
    votingSettings: params.votingSettings,
    initialEditorSpaceIds: params.initialEditorSpaceIds,
    initialMemberSpaceIds: params.initialMemberSpaceIds ?? [],
    initialEditsContentUri: cid,
    initialTopicId: params.initialTopicId,
  });

  return {
    to: daoSpaceFactoryAddress,
    calldata,
    spaceEntityId,
    cid,
  };
}

/**
 * Publishes an edit and wraps it in a DAO-space proposal.
 *
 * @example
 * ```ts
 * const proposal = await geo.daoSpaces.proposeEdit({
 *   name: 'Update entity',
 *   ops,
 *   author: authorSpaceId,
 *   daoSpaceAddress,
 *   callerSpaceId: authorSpaceId,
 *   daoSpaceId,
 * });
 * ```
 */
export function proposeEdit(context: GeoClientContext, params: Proposals.ProposeEditParams) {
  return Proposals.proposeEdit(context, params);
}

/**
 * Builds calldata for a DAO proposal that adds a member space.
 *
 * Pass `daoSpaceAddress` when the proposal action should call the DAO space
 * contract directly. If omitted, the configured space registry address is used
 * for compatibility with legacy helpers.
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
export function proposeAddMember(context: GeoClientContext, params: ProposeAddMemberParams) {
  return createRoleProposal(
    context,
    params,
    Proposals.actions.addMember(proposalActionTarget(context, params.daoSpaceAddress), params.newMemberSpaceId),
  );
}

/**
 * Builds calldata for a DAO proposal that removes a member space.
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
export function proposeRemoveMember(context: GeoClientContext, params: ProposeRemoveMemberParams) {
  return createRoleProposal(
    context,
    params,
    Proposals.actions.removeMember(proposalActionTarget(context, params.daoSpaceAddress), params.memberToRemoveSpaceId),
  );
}

/**
 * Builds calldata for a DAO proposal that adds an editor space.
 *
 * Editor changes only support SLOW voting.
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
export function proposeAddEditor(context: GeoClientContext, params: ProposeAddEditorParams) {
  const votingMode = (params as { votingMode?: string }).votingMode ?? 'SLOW';
  if (votingMode !== 'SLOW') {
    throw new Error('proposeAddEditor only supports SLOW voting mode');
  }

  return createRoleProposal(
    context,
    params,
    Proposals.actions.addEditor(proposalActionTarget(context, params.daoSpaceAddress), params.newEditorSpaceId),
  );
}

/**
 * Builds calldata for a DAO proposal that removes an editor space.
 *
 * Editor changes only support SLOW voting.
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
export function proposeRemoveEditor(context: GeoClientContext, params: ProposeRemoveEditorParams) {
  const votingMode = (params as { votingMode?: string }).votingMode ?? 'SLOW';
  if (votingMode !== 'SLOW') {
    throw new Error('proposeRemoveEditor only supports SLOW voting mode');
  }

  return createRoleProposal(
    context,
    params,
    Proposals.actions.removeEditor(proposalActionTarget(context, params.daoSpaceAddress), params.editorToRemoveSpaceId),
  );
}

/**
 * Builds calldata for requesting membership in a DAO space.
 *
 * Unlike governance proposals, this emits `GOVERNANCE.MEMBERSHIP_REQUESTED`
 * and can be submitted by a non-member space.
 *
 * @example
 * ```ts
 * const tx = geo.daoSpaces.proposeRequestMembership({
 *   authorSpaceId: requesterSpaceId,
 *   spaceId: daoSpaceId,
 * });
 * ```
 */
export function proposeRequestMembership(context: GeoClientContext, params: ProposeRequestMembershipParams) {
  const authorSpaceId = bytes16Id(params.authorSpaceId, 'authorSpaceId');
  const spaceId = bytes16Id(params.spaceId, 'spaceId');
  const proposalId = params.proposalId
    ? bytes16Id(params.proposalId, 'proposalId')
    : (`0x${uuidv4().replaceAll('-', '')}` as `0x${string}`);
  const data = encodeAbiParameters(
    [
      { type: 'bytes16', name: 'proposalId' },
      { type: 'bytes16', name: 'newMemberSpaceId' },
    ],
    [proposalId, authorSpaceId],
  );
  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [authorSpaceId, spaceId, MEMBERSHIP_REQUESTED_ACTION, EMPTY_TOPIC, data, EMPTY_SIGNATURE],
  });

  return {
    to: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
    calldata,
    proposalId,
  };
}
