import type { Op } from '@geoprotocol/grc-20';
import { v4 as uuidv4 } from 'uuid';
import { createPublicClient, encodeAbiParameters, encodeFunctionData, http, toHex } from 'viem';
import { DaoSpaceAbi, SpaceRegistryAbi } from '../abis/index.js';
import { SPACE_TYPE } from '../core/ids/system.js';
import {
  bytes16ToBytes32LeftAligned,
  EDITS_PUBLISHED_ACTION,
  EMPTY_SIGNATURE,
  EMPTY_TOPIC,
  ensure0xPrefix,
  isBytes16Hex,
  MEMBERSHIP_REQUESTED_ACTION,
  PROPOSAL_CREATED_ACTION,
  PROPOSAL_EXECUTED_ACTION,
  PROPOSAL_UPDATED_ACTION,
  PROPOSAL_VOTED_ACTION,
  VOTE_OPTION_VALUES,
} from '../dao-space/constants.js';
import type { VoteOption, VotingMode } from '../dao-space/types.js';
import {
  type CreateDaoSpaceCalldataParams,
  getCreateDaoSpaceCalldata,
  toContractVotingSettings,
  type VotingSettingsInput,
  validateIpfsUri,
  validateVotingSettingsInput,
} from '../encodings/get-create-dao-space-calldata.js';
import type { Id } from '../id.js';
import * as IdUtils from '../id-utils.js';
import { assertValid } from '../id-utils.js';
import { requireGeoContract } from '../networks.js';
import * as Ops from '../ops/index.js';
import type { GeoClientContext } from './context.js';

const VALIDATION_CID = 'ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5';

export type CreateDaoSpaceParams = Omit<
  CreateDaoSpaceCalldataParams,
  'initialEditsContentUri' | 'initialMemberSpaceIds'
> & {
  name: string;
  author: Id | string;
  initialMemberSpaceIds?: `0x${string}`[];
  ops?: Op[];
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
  updateProposal?: boolean;
};

export type ProposeEditParams = {
  name: string;
  ops: Op[];
  author: Id | string;
  daoSpaceAddress: `0x${string}`;
  callerSpaceId: string;
  daoSpaceId: string;
  votingMode?: VotingMode;
  proposalId?: string;
  updateProposal?: boolean;
  versionId?: number;
};

export type VoteProposalParams = {
  authorSpaceId: string;
  spaceId: string;
  proposalId: string;
  versionId?: number;
  vote: VoteOption;
};

export type ExecuteProposalParams = {
  authorSpaceId: string;
  spaceId: string;
  proposalId: string;
};

type DaoSpaceRoleProposalBaseParams = {
  authorSpaceId: string;
  spaceId: string;
  daoSpaceAddress: `0x${string}`;
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

export type ProposeUpdateVotingSettingsParams = SlowDaoSpaceRoleProposalBaseParams & {
  votingSettings: VotingSettingsInput;
};

function bytes16Id(value: string, name: string): `0x${string}` {
  const normalized = ensure0xPrefix(value);
  if (!isBytes16Hex(normalized)) {
    throw new Error(`${name} must be bytes16 hex (32 hex chars). Received: ${value}`);
  }

  return normalized;
}

function createRoleProposal(context: GeoClientContext, params: DaoSpaceRoleProposalBaseParams, action: ProposalAction) {
  return createProposal(context, {
    fromSpaceId: params.authorSpaceId,
    daoSpaceId: params.spaceId,
    proposalId: params.proposalId,
    votingMode: params.votingMode ?? 'SLOW',
    actions: [action],
  });
}

function requireDaoSpaceAddress(daoSpaceAddress: `0x${string}` | undefined): `0x${string}` {
  if (!daoSpaceAddress) {
    throw new Error('daoSpaceAddress is required for DAO role proposal actions');
  }

  return daoSpaceAddress;
}

function validateProposalVersion(versionId: number | undefined, fallback = 1): number {
  const version = versionId ?? fallback;
  if (!Number.isInteger(version) || version < 1 || version > 255) {
    throw new Error('versionId must be an integer between 1 and 255');
  }

  return version;
}

async function resolveProposalVersion(
  context: GeoClientContext,
  params: {
    daoSpaceAddress: `0x${string}`;
    proposalId: `0x${string}`;
    updateProposal?: boolean;
    versionId?: number;
  },
): Promise<number> {
  if (!params.updateProposal) {
    if (params.versionId !== undefined) {
      throw new Error('versionId can only be provided when updateProposal is true');
    }

    return 1;
  }

  const requestedVersion = params.versionId === undefined ? undefined : validateProposalVersion(params.versionId);

  const rpcUrl = context.network.chain?.rpcUrl;
  if (!rpcUrl) {
    if (requestedVersion !== undefined) {
      return requestedVersion;
    }

    throw new Error('versionId is required when updateProposal is true and the network has no RPC URL');
  }

  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  });
  const latestVersion = await publicClient.readContract({
    address: params.daoSpaceAddress,
    abi: DaoSpaceAbi,
    functionName: 'latestProposalVersion',
    args: [params.proposalId],
  });

  const nextVersion = validateProposalVersion(Number(latestVersion) + 1);
  if (requestedVersion !== undefined && requestedVersion !== nextVersion) {
    throw new Error(`versionId ${requestedVersion} does not match next on-chain proposal version ${nextVersion}`);
  }

  return nextVersion;
}

function encodeCreateProposal(params: CreateProposalParams & { spaceRegistryAddress: `0x${string}` }) {
  const fromSpaceId = bytes16Id(params.fromSpaceId, 'fromSpaceId');
  const daoSpaceId = bytes16Id(params.daoSpaceId, 'daoSpaceId');
  const proposalId = params.proposalId
    ? bytes16Id(params.proposalId, 'proposalId')
    : (`0x${uuidv4().replaceAll('-', '')}` as `0x${string}`);
  const votingMode = params.votingMode ?? 'FAST';
  if (votingMode !== 'FAST' && votingMode !== 'SLOW') {
    throw new Error('votingMode must be "FAST" or "SLOW"');
  }

  const data = encodeAbiParameters(
    [
      { type: 'bytes16', name: 'proposalId' },
      { type: 'uint8', name: 'votingMode' },
      {
        type: 'tuple[]',
        name: 'actions',
        components: [
          { type: 'address', name: 'to' },
          { type: 'uint256', name: 'value' },
          { type: 'bytes', name: 'data' },
        ],
      },
    ],
    [proposalId, votingMode === 'FAST' ? 1 : 0, params.actions],
  );

  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [
      fromSpaceId,
      daoSpaceId,
      params.updateProposal ? PROPOSAL_UPDATED_ACTION : PROPOSAL_CREATED_ACTION,
      bytes16ToBytes32LeftAligned(proposalId),
      data,
      EMPTY_SIGNATURE,
    ],
  });

  return {
    to: params.spaceRegistryAddress,
    calldata,
    proposalId,
  };
}

function encodePublishEditProposalAction(daoSpaceAddress: `0x${string}`, cid: string): ProposalAction {
  const ipfsError = validateIpfsUri(cid);
  if (ipfsError) {
    throw new Error(ipfsError);
  }

  return {
    to: daoSpaceAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: DaoSpaceAbi,
      functionName: 'ping',
      args: [
        EDITS_PUBLISHED_ACTION,
        EMPTY_TOPIC,
        encodeAbiParameters(
          [
            { type: 'bytes', name: 'editsContentUri' },
            { type: 'bytes', name: 'editsMetadata' },
          ],
          [toHex(cid), '0x'],
        ),
      ],
    }),
  };
}

function encodeDaoRoleAction(
  daoSpaceAddress: `0x${string}`,
  functionName: 'addEditor' | 'removeEditor' | 'addMember' | 'removeMember',
  spaceId: string,
): ProposalAction {
  return {
    to: daoSpaceAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: DaoSpaceAbi,
      functionName,
      args: [bytes16Id(spaceId, 'spaceId')],
    }),
  };
}

function encodeUpdateVotingSettingsAction(
  daoSpaceAddress: `0x${string}`,
  votingSettings: VotingSettingsInput,
): ProposalAction {
  const validationError = validateVotingSettingsInput(votingSettings);
  if (validationError) {
    throw new Error(validationError);
  }

  const contractVotingSettings = toContractVotingSettings(votingSettings);

  return {
    to: daoSpaceAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: DaoSpaceAbi,
      functionName: 'updateVotingSettings',
      args: [
        {
          partialPercentageSupportThreshold: contractVotingSettings.partialPercentageSupportThreshold,
          universalPercentageSupportThreshold: contractVotingSettings.universalPercentageSupportThreshold,
          flatSupportThreshold: contractVotingSettings.flatSupportThreshold,
          quorum: contractVotingSettings.quorum,
          duration: contractVotingSettings.duration,
          disableFastPathAccessForNewMembers: contractVotingSettings.disableFastPathAccessForNewMembers,
          executionGracePeriod: contractVotingSettings.executionGracePeriod,
        },
      ],
    }),
  };
}

/**
 * Publishes the initial DAO edit and returns calldata for creating a DAO space.
 *
 * The helper first validates DAO voting settings and required contract
 * addresses, then creates the space entity ops, publishes the initial edit, and
 * encodes `createDAOSpaceProxy` calldata using the resulting CID. Unless
 * `initialTopicId` is provided, the DAO topic is set to the generated space
 * entity ID.
 *
 * @example
 * ```ts
 * const tx = await geo.daoSpaces.create({
 *   name: 'Research DAO',
 *   author: authorSpaceId,
 *   initialEditorSpaceIds: [authorSpaceId],
 *   votingSettings: {
 *     partialPercentageSupportThreshold: 50,
 *     universalPercentageSupportThreshold: 90,
 *     flatSupportThreshold: 1,
 *     quorum: 1,
 *     durationInDays: 2,
 *     disableFastPathAccessForNewMembers: true,
 *     executionGracePeriodInDays: 14,
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
  const spaceEntityId = IdUtils.generate();
  const initialTopicId = params.initialTopicId ?? spaceEntityId;

  getCreateDaoSpaceCalldata({
    votingSettings: params.votingSettings,
    initialEditorSpaceIds: params.initialEditorSpaceIds,
    initialMemberSpaceIds: params.initialMemberSpaceIds ?? [],
    initialEditsContentUri: 'ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5',
    initialTopicId,
  });

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
    initialTopicId,
  });

  return {
    to: daoSpaceFactoryAddress,
    calldata,
    spaceEntityId,
    cid,
  };
}

/**
 * Builds calldata for creating or updating a DAO proposal from prebuilt proposal actions.
 *
 * This uses the configured `SPACE_REGISTRY_ADDRESS` and encodes a
 * `GOVERNANCE.PROPOSAL_CREATED` or `GOVERNANCE.PROPOSAL_UPDATED`
 * `SpaceRegistry.enter(...)` call. Prefer the high-level
 * `geo.daoSpaces.propose*` helpers for public client code.
 *
 * @example
 * ```ts
 * const tx = geo.daoSpaces.proposeAddMember({
 *   authorSpaceId,
 *   spaceId: daoSpaceId,
 *   daoSpaceAddress,
 *   newMemberSpaceId,
 * });
 * ```
 *
 * @param context Client context containing the target network configuration.
 * @param params Caller space, DAO space, voting mode, optional proposal ID, and actions.
 * @returns Target registry address, calldata, and proposal ID.
 * @throws When IDs are invalid or the configured network is missing `SPACE_REGISTRY_ADDRESS`.
 * @internal
 */
export function createProposal(context: GeoClientContext, params: CreateProposalParams) {
  return encodeCreateProposal({
    ...params,
    spaceRegistryAddress: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
  });
}

/**
 * Publishes an edit and wraps it in a DAO-space proposal.
 *
 * This helper validates the proposal shape before upload, publishes the edit
 * through the configured API, creates a DAO `ping(...)` action with the
 * resulting CID, and returns calldata for proposal creation.
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
 *
 * @param context Client context containing network, contract, API, and fetch configuration.
 * @param params Edit publication params plus DAO proposal target details.
 * @returns Edit ID, CID, target registry address, calldata, and proposal ID.
 * @throws When IDs are invalid, required contracts are missing, or edit publishing fails.
 */
export async function proposeEdit(context: GeoClientContext, params: ProposeEditParams) {
  assertValid(String(params.author), '`author` in `proposeEdit`');
  if (params.updateProposal && !params.proposalId) {
    throw new Error('proposalId is required when updateProposal is true');
  }
  const spaceRegistryAddress = requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS');
  const validated = encodeCreateProposal({
    fromSpaceId: params.callerSpaceId,
    daoSpaceId: params.daoSpaceId,
    proposalId: params.proposalId,
    votingMode: params.votingMode ?? 'FAST',
    updateProposal: params.updateProposal,
    actions: [encodePublishEditProposalAction(params.daoSpaceAddress, VALIDATION_CID)],
    spaceRegistryAddress,
  });
  const versionId = await resolveProposalVersion(context, {
    daoSpaceAddress: params.daoSpaceAddress,
    proposalId: validated.proposalId,
    updateProposal: params.updateProposal,
    versionId: params.versionId,
  });

  const { publish } = await import('./edits.js');
  const { cid, editId } = await publish(context, {
    name: params.name,
    ops: params.ops,
    author: params.author,
  });
  const result = encodeCreateProposal({
    fromSpaceId: params.callerSpaceId,
    daoSpaceId: params.daoSpaceId,
    proposalId: validated.proposalId,
    votingMode: params.votingMode ?? 'FAST',
    updateProposal: params.updateProposal,
    actions: [encodePublishEditProposalAction(params.daoSpaceAddress, cid)],
    spaceRegistryAddress,
  });

  return {
    editId,
    cid,
    versionId,
    ...result,
  };
}

/**
 * Builds calldata for a DAO proposal that adds a member space.
 *
 * `daoSpaceAddress` is required because the proposal action calls the DAO
 * space contract directly.
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
    actions.addMember(requireDaoSpaceAddress(params.daoSpaceAddress), params.newMemberSpaceId),
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
    actions.removeMember(requireDaoSpaceAddress(params.daoSpaceAddress), params.memberToRemoveSpaceId),
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
    actions.addEditor(requireDaoSpaceAddress(params.daoSpaceAddress), params.newEditorSpaceId),
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
    actions.removeEditor(requireDaoSpaceAddress(params.daoSpaceAddress), params.editorToRemoveSpaceId),
  );
}

/**
 * Builds calldata for a DAO proposal that updates voting settings.
 *
 * Updating voting settings only supports SLOW voting.
 * The client validates deterministic numeric bounds before encoding; the DAO
 * contract still enforces flat threshold and quorum against the current editor
 * count when the proposal executes.
 *
 * @example
 * ```ts
 * const tx = geo.daoSpaces.proposeUpdateVotingSettings({
 *   authorSpaceId,
 *   spaceId: daoSpaceId,
 *   daoSpaceAddress,
 *   votingSettings: {
 *     partialPercentageSupportThreshold: 50,
 *     universalPercentageSupportThreshold: 90,
 *     flatSupportThreshold: 1,
 *     quorum: 1,
 *     durationInDays: 2,
 *     disableFastPathAccessForNewMembers: true,
 *     executionGracePeriodInDays: 14,
 *   },
 * });
 * ```
 */
export function proposeUpdateVotingSettings(context: GeoClientContext, params: ProposeUpdateVotingSettingsParams) {
  const votingMode = (params as { votingMode?: string }).votingMode ?? 'SLOW';
  if (votingMode !== 'SLOW') {
    throw new Error('proposeUpdateVotingSettings only supports SLOW voting mode');
  }

  return createRoleProposal(
    context,
    params,
    actions.updateVotingSettings(requireDaoSpaceAddress(params.daoSpaceAddress), params.votingSettings),
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

/**
 * Builds calldata for voting on a DAO proposal.
 *
 * @example
 * ```ts
 * const tx = geo.daoSpaces.voteProposal({
 *   authorSpaceId,
 *   spaceId: daoSpaceId,
 *   proposalId,
 *   versionId: 1,
 *   vote: 'YES',
 * });
 * ```
 *
 * @param context Client context containing the target network configuration.
 * @param params Author space, DAO space, proposal ID, and vote option.
 * @returns Target registry address and calldata for `GOVERNANCE.PROPOSAL_VOTED`.
 * @throws When IDs are invalid or the configured network is missing `SPACE_REGISTRY_ADDRESS`.
 */
export function voteProposal(context: GeoClientContext, params: VoteProposalParams) {
  const authorSpaceId = bytes16Id(params.authorSpaceId, 'authorSpaceId');
  const spaceId = bytes16Id(params.spaceId, 'spaceId');
  const proposalId = bytes16Id(params.proposalId, 'proposalId');
  const versionId = validateProposalVersion(params.versionId, 1);
  const topic = bytes16ToBytes32LeftAligned(proposalId);
  const data = encodeAbiParameters(
    [
      { type: 'bytes16', name: 'proposalId' },
      { type: 'uint8', name: 'versionId' },
      { type: 'uint8', name: 'voteOption' },
    ],
    [proposalId, versionId, VOTE_OPTION_VALUES[params.vote]],
  );
  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [authorSpaceId, spaceId, PROPOSAL_VOTED_ACTION, topic, data, EMPTY_SIGNATURE],
  });

  return {
    to: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
    calldata,
  };
}

/**
 * Builds calldata for executing a passed DAO proposal.
 *
 * @example
 * ```ts
 * const tx = geo.daoSpaces.executeProposal({
 *   authorSpaceId,
 *   spaceId: daoSpaceId,
 *   proposalId,
 * });
 * ```
 *
 * @param context Client context containing the target network configuration.
 * @param params Author space, DAO space, and proposal ID.
 * @returns Target registry address and calldata for `GOVERNANCE.PROPOSAL_EXECUTED`.
 * @throws When IDs are invalid or the configured network is missing `SPACE_REGISTRY_ADDRESS`.
 */
export function executeProposal(context: GeoClientContext, params: ExecuteProposalParams) {
  const authorSpaceId = bytes16Id(params.authorSpaceId, 'authorSpaceId');
  const spaceId = bytes16Id(params.spaceId, 'spaceId');
  const proposalId = bytes16Id(params.proposalId, 'proposalId');
  const topic = bytes16ToBytes32LeftAligned(proposalId);
  const data = encodeAbiParameters([{ type: 'bytes16', name: 'proposalId' }], [proposalId]);
  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [authorSpaceId, spaceId, PROPOSAL_EXECUTED_ACTION, topic, data, EMPTY_SIGNATURE],
  });

  return {
    to: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
    calldata,
  };
}

/**
 * Internal helpers for constructing DAO proposal actions.
 *
 * These helpers only encode DAO-space action payloads for the higher-level
 * proposal helpers in this module.
 *
 * @example
 * ```ts
 * const action = actions.addEditor(daoSpaceAddress, editorSpaceId);
 * ```
 *
 * @internal
 */
export const actions = {
  publishEdit: encodePublishEditProposalAction,
  addEditor: (daoSpaceAddress: `0x${string}`, spaceId: string) =>
    encodeDaoRoleAction(daoSpaceAddress, 'addEditor', spaceId),
  removeEditor: (daoSpaceAddress: `0x${string}`, spaceId: string) =>
    encodeDaoRoleAction(daoSpaceAddress, 'removeEditor', spaceId),
  addMember: (daoSpaceAddress: `0x${string}`, spaceId: string) =>
    encodeDaoRoleAction(daoSpaceAddress, 'addMember', spaceId),
  removeMember: (daoSpaceAddress: `0x${string}`, spaceId: string) =>
    encodeDaoRoleAction(daoSpaceAddress, 'removeMember', spaceId),
  updateVotingSettings: encodeUpdateVotingSettingsAction,
};
