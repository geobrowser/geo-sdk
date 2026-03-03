import { v4 as uuidv4 } from 'uuid';
import { encodeAbiParameters, encodeFunctionData } from 'viem';
import { TESTNET } from '../../contracts.js';
import { DaoSpaceAbi, SpaceRegistryAbi } from '../abis/index.js';
import {
  bytes16ToBytes32LeftAligned,
  EMPTY_SIGNATURE,
  ensure0xPrefix,
  getContractAddressesBasedOnNetwork,
  isBytes16Hex,
  PROPOSAL_CREATED_ACTION,
} from './constants.js';
import type { ProposeAddMemberParams, ProposeAddMemberResult } from './types.js';

/**
 * Creates a proposal to add a member to a DAO space.
 *
 * This function encodes a proposal that, when executed, will call the DAO
 * space's `addMember()` function to add the given member space ID.
 * The proposal is submitted via SpaceRegistry's `enter()` function.
 *
 * @param params - The parameters for creating the proposal
 * @returns Object containing `to` (Space Registry address), `calldata`, and `proposalId`
 *
 * @example
 * ```ts
 * import { daoSpace } from '@geoprotocol/geo-sdk';
 *
 * const { to, calldata } = daoSpace.proposeAddMember({
 *   daoSpaceAddress: '0xDAOSpaceContractAddress...',
 *   authorSpaceId: '0xCallerBytes16SpaceId...',
 *   spaceId: '0xDAOBytes16SpaceId...',
 *   newMemberSpaceId: '0xNewMemberBytes16SpaceId...',
 * });
 *
 * // Submit the transaction using viem or another client
 * await walletClient.sendTransaction({ to, data: calldata });
 * ```
 */
export function proposeAddMember(params: ProposeAddMemberParams): ProposeAddMemberResult {
  const {
    authorSpaceId: rawAuthroSpaceId,
    spaceId: rawSpaceId,
    newMemberSpaceId: rawNewMemberSpaceId,
    votingMode = 'SLOW',
    proposalId: rawProposalId,
    network = 'TESTNET',
  } = params;

  

  // Validate inputs
  const authorSpaceId = ensure0xPrefix(rawAuthroSpaceId);
  const newMemberSpaceId = ensure0xPrefix(rawNewMemberSpaceId);
  const spaceId = ensure0xPrefix(rawSpaceId);

  if (!isBytes16Hex(authorSpaceId)) {
    throw new Error(`authorSpaceId must be bytes16 hex (0x followed by 32 hex chars). Received: ${authorSpaceId}`);
  }
  if (!isBytes16Hex(spaceId)) {
    throw new Error(`spaceId must be bytes16 hex (0x followed by 32 hex chars). Received: ${spaceId}`);
  }
  if (!isBytes16Hex(newMemberSpaceId)) {
    throw new Error(
      `newMemberSpaceId must be bytes16 hex (0x followed by 32 hex chars). Received: ${newMemberSpaceId}`,
    );
  }

  const proposalId = rawProposalId
    ? ensure0xPrefix(rawProposalId)
    : (`0x${uuidv4().replaceAll('-', '')}` as `0x${string}`);

  // Encode the addMember function call: addMember(bytes16 _newMemberSpaceId)
  const proposalActionCalldata = encodeFunctionData({
    abi: DaoSpaceAbi,
    functionName: 'addMember',
    args: [newMemberSpaceId],
  });

  const contracts = getContractAddressesBasedOnNetwork(network);

  // Create the proposal action (calling addMember on the DAO space)
  const proposalActions = [
    {
      to: contracts.SPACE_REGISTRY_ADDRESS,
      value: 0n,
      data: proposalActionCalldata,
    },
  ] as const;

  // Encode the proposal data: abi.encode(bytes16 proposalId, VotingMode votingMode, Action[] actions)
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
    [proposalId, votingMode === 'FAST' ? 1 : 0, proposalActions],
  );

  // Convert proposalId to bytes32 for the topic (left-aligned)
  const topic = bytes16ToBytes32LeftAligned(proposalId);

  // Encode the SpaceRegistry.enter() call
  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [
      authorSpaceId, // fromSpaceId
      spaceId, // toSpaceId
      PROPOSAL_CREATED_ACTION, // action
      topic, // topic (proposalId left-aligned to bytes32)
      data, // data (encoded proposal)
      EMPTY_SIGNATURE, // signature (unused when msg.sender == fromSpace)
    ],
  });

  return {
    to: contracts.SPACE_REGISTRY_ADDRESS,
    calldata,
    proposalId,
  };
}
