import type { Op } from '@geoprotocol/grc-20';
import { v4 as uuidv4 } from 'uuid';
import { encodeAbiParameters, encodeFunctionData } from 'viem';
import { DaoSpaceAbi, SpaceRegistryAbi } from '../abis/index.js';
import {
  bytes16ToBytes32LeftAligned,
  EMPTY_SIGNATURE,
  EMPTY_TOPIC,
  ensure0xPrefix,
  isBytes16Hex,
  PROPOSAL_CREATED_ACTION,
  PROPOSAL_EXECUTED_ACTION,
  PROPOSAL_VOTED_ACTION,
  VOTE_OPTION_VALUES,
} from '../dao-space/constants.js';
import type { VoteOption, VotingMode } from '../dao-space/types.js';
import {
  toContractVotingSettings,
  type VotingSettingsInput,
  validateIpfsUri,
} from '../encodings/get-create-dao-space-calldata.js';
import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import { requireGeoContract } from '../networks.js';
import type { GeoClientContext } from './context.js';

const VALIDATION_CID = 'ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5';

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

export type ProposeEditParams = {
  name: string;
  ops: Op[];
  author: Id | string;
  daoSpaceAddress: `0x${string}`;
  callerSpaceId: string;
  daoSpaceId: string;
  votingMode?: VotingMode;
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

function bytes16Id(value: string, name: string): `0x${string}` {
  const normalized = ensure0xPrefix(value);
  if (!isBytes16Hex(normalized)) {
    throw new Error(`${name} must be bytes16 hex (32 hex chars). Received: ${value}`);
  }

  return normalized;
}

function encodeCreateProposal(params: CreateProposalParams & { spaceRegistryAddress: `0x${string}` }) {
  const fromSpaceId = bytes16Id(params.fromSpaceId, 'fromSpaceId');
  const daoSpaceId = bytes16Id(params.daoSpaceId, 'daoSpaceId');
  const proposalId = params.proposalId
    ? bytes16Id(params.proposalId, 'proposalId')
    : (`0x${uuidv4().replaceAll('-', '')}` as `0x${string}`);
  const votingMode = params.votingMode ?? 'FAST';

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
      PROPOSAL_CREATED_ACTION,
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
      functionName: 'publish',
      args: [EMPTY_TOPIC, encodeAbiParameters([{ type: 'string' }], [cid]), '0x'],
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
  const contractVotingSettings = toContractVotingSettings(votingSettings);

  return {
    to: daoSpaceAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: DaoSpaceAbi,
      functionName: 'updateVotingSettings',
      args: [
        {
          slowPathPercentageThreshold: contractVotingSettings.slowPathPercentageThreshold,
          fastPathFlatThreshold: contractVotingSettings.fastPathFlatThreshold,
          quorum: contractVotingSettings.quorum,
          duration: contractVotingSettings.duration,
        },
      ],
    }),
  };
}

/**
 * Builds calldata for creating a DAO proposal from prebuilt proposal actions.
 *
 * This helper is synchronous and does not publish or fetch. It uses the
 * configured `SPACE_REGISTRY_ADDRESS` and encodes a
 * `GOVERNANCE.PROPOSAL_CREATED` `SpaceRegistry.enter(...)` call.
 *
 * @example
 * ```ts
 * const actions = [
 *   geo.daoSpaces.proposals.actions.addMember(daoSpaceAddress, memberSpaceId),
 *   geo.daoSpaces.proposals.actions.updateVotingSettings(daoSpaceAddress, {
 *     slowPathPercentageThreshold: 60,
 *     fastPathFlatThreshold: 2,
 *     quorum: 3,
 *     durationInDays: 5,
 *   }),
 * ];
 *
 * const tx = geo.daoSpaces.proposals.create({
 *   fromSpaceId: authorSpaceId,
 *   daoSpaceId,
 *   votingMode: 'SLOW',
 *   actions,
 * });
 * ```
 *
 * @param context Client context containing the target network configuration.
 * @param params Caller space, DAO space, voting mode, optional proposal ID, and actions.
 * @returns Target registry address, calldata, and proposal ID.
 * @throws When IDs are invalid or the configured network is missing `SPACE_REGISTRY_ADDRESS`.
 */
export function create(context: GeoClientContext, params: CreateProposalParams) {
  return encodeCreateProposal({
    ...params,
    spaceRegistryAddress: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
  });
}

/**
 * Publishes an edit and wraps it in a DAO proposal.
 *
 * This helper validates the proposal shape before upload, publishes the edit
 * through the configured API, creates a DAO `publish(...)` action with the
 * resulting CID, and returns calldata for proposal creation.
 *
 * @example
 * ```ts
 * import * as Ops from '@geoprotocol/geo-sdk/ops';
 *
 * const { ops } = Ops.entities.update({
 *   id: entityId,
 *   name: 'Updated name',
 * });
 *
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
  const spaceRegistryAddress = requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS');
  const validated = encodeCreateProposal({
    fromSpaceId: params.callerSpaceId,
    daoSpaceId: params.daoSpaceId,
    proposalId: params.proposalId,
    votingMode: params.votingMode ?? 'FAST',
    actions: [encodePublishEditProposalAction(params.daoSpaceAddress, VALIDATION_CID)],
    spaceRegistryAddress,
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
    actions: [encodePublishEditProposalAction(params.daoSpaceAddress, cid)],
    spaceRegistryAddress,
  });

  return {
    editId,
    cid,
    ...result,
  };
}

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
 *
 * @param context Client context containing the target network configuration.
 * @param params Author space, DAO space, proposal ID, and vote option.
 * @returns Target registry address and calldata for `GOVERNANCE.PROPOSAL_VOTED`.
 * @throws When IDs are invalid or the configured network is missing `SPACE_REGISTRY_ADDRESS`.
 */
export function vote(context: GeoClientContext, params: VoteProposalParams) {
  const authorSpaceId = bytes16Id(params.authorSpaceId, 'authorSpaceId');
  const spaceId = bytes16Id(params.spaceId, 'spaceId');
  const proposalId = bytes16Id(params.proposalId, 'proposalId');
  const topic = bytes16ToBytes32LeftAligned(proposalId);
  const data = encodeAbiParameters(
    [
      { type: 'bytes16', name: 'proposalId' },
      { type: 'uint8', name: 'voteOption' },
    ],
    [proposalId, VOTE_OPTION_VALUES[params.vote]],
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
 * const tx = geo.daoSpaces.proposals.execute({
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
export function execute(context: GeoClientContext, params: ExecuteProposalParams) {
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
 * Helpers for constructing DAO proposal actions.
 *
 * These helpers only encode DAO-space action payloads. Pass their results to
 * `geo.daoSpaces.proposals.create(...)` when building a proposal from explicit actions.
 *
 * @example
 * ```ts
 * const action = geo.daoSpaces.proposals.actions.addEditor(daoSpaceAddress, editorSpaceId);
 * const proposal = geo.daoSpaces.proposals.create({
 *   fromSpaceId: authorSpaceId,
 *   daoSpaceId,
 *   votingMode: 'SLOW',
 *   actions: [action],
 * });
 * ```
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
