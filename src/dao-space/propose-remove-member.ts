import { v4 as uuidv4 } from 'uuid';
import { encodeAbiParameters, encodeFunctionData } from 'viem';
import { TESTNET } from '../../contracts.js';
import { DaoSpaceAbi, SpaceRegistryAbi } from '../abis/index.js';
import {
  bytes16ToBytes32LeftAligned,
  EMPTY_SIGNATURE,
  ensure0xPrefix,
  isBytes16Hex,
  PROPOSAL_CREATED_ACTION,
} from './constants.js';
import type { ProposeRemoveMemberParams, ProposeRemoveMemberResult } from './types.js';

/**
 * Creates a proposal to remove a member from a DAO space.
 *
 * This function:
 * 1. Validates the author, DAO space, and member IDs
 * 2. Encodes the `removeMember()` call as the proposal action
 * 3. Encodes the SpaceRegistry's `enter()` call with the `PROPOSAL_CREATED` action
 *
 * @param params - The parameters for proposing member removal
 * @returns Object containing `to` (Space Registry address), `calldata`, and `proposalId`
 *
 * @example
 * ```ts
 * import { daoSpace } from '@geoprotocol/geo-sdk';
 *
 * const { to, calldata, proposalId } = daoSpace.proposeRemoveMember({
 *   authorSpaceId: '0xAuthorBytes16SpaceId...',
 *   spaceId: '0xDAOBytes16SpaceId...',
 *   memberToRemoveSpaceId: '0xMemberBytes16SpaceId...',
 *   network: 'TESTNET',
 * });
 *
 * // Submit the transaction using viem or another client
 * await walletClient.sendTransaction({ to, data: calldata });
 * ```
 */
export function proposeRemoveMember(params: ProposeRemoveMemberParams): ProposeRemoveMemberResult {
  const {
    authorSpaceId: rawAuthorSpaceId,
    spaceId: rawSpaceId,
    memberToRemoveSpaceId: rawMemberToRemoveSpaceId,
    votingMode = 'SLOW',
    proposalId: rawProposalId,
  } = params;

  // Ensure 0x prefix on all IDs
  const authorSpaceId = ensure0xPrefix(rawAuthorSpaceId);
  const spaceId = ensure0xPrefix(rawSpaceId);
  const memberToRemoveSpaceId = ensure0xPrefix(rawMemberToRemoveSpaceId);

  // Validate inputs
  if (!isBytes16Hex(authorSpaceId)) {
    throw new Error(`authorSpaceId must be bytes16 hex (32 hex chars). Received: ${rawAuthorSpaceId}`);
  }
  if (!isBytes16Hex(spaceId)) {
    throw new Error(`spaceId must be bytes16 hex (32 hex chars). Received: ${rawSpaceId}`);
  }
  if (!isBytes16Hex(memberToRemoveSpaceId)) {
    throw new Error(`memberToRemoveSpaceId must be bytes16 hex (32 hex chars). Received: ${rawMemberToRemoveSpaceId}`);
  }

  // Generate or use provided proposal ID (UUID v4 as bytes16 hex)
  const proposalId = rawProposalId
    ? ensure0xPrefix(rawProposalId)
    : (`0x${uuidv4().replaceAll('-', '')}` as `0x${string}`);

  if (!isBytes16Hex(proposalId)) {
    throw new Error(`proposalId must be bytes16 hex (32 hex chars). Received: ${rawProposalId}`);
  }

  // Encode the removeMember function call: removeMember(bytes16 _oldMemberSpaceId)
  const proposalActionCalldata = encodeFunctionData({
    abi: DaoSpaceAbi,
    functionName: 'removeMember',
    args: [memberToRemoveSpaceId],
  });

  // Create the proposal action (calling removeMember on the Space Registry)
  const proposalActions = [
    {
      to: TESTNET.SPACE_REGISTRY_ADDRESS,
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
    to: TESTNET.SPACE_REGISTRY_ADDRESS,
    calldata,
    proposalId,
  };
}
