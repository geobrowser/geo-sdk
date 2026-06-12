import { v4 as uuidv4 } from 'uuid';
import { encodeAbiParameters, encodeFunctionData } from 'viem';
import { DaoSpaceAbi, SpaceRegistryAbi } from '../abis/index.js';
import {
  bytes16ToBytes32LeftAligned,
  EMPTY_SIGNATURE,
  ensure0xPrefix,
  getContractAddressesBasedOnNetwork,
  isBytes16Hex,
  PROPOSAL_CREATED_ACTION,
} from './constants.js';
import type { ProposeAddEditorParams, ProposeAddEditorResult } from './types.js';

/**
 * Creates a proposal to add an editor to a DAO space.
 *
 * This function encodes a proposal that, when executed, will call the DAO
 * space's `addEditor()` function to add the given editor space ID.
 * The proposal is submitted via SpaceRegistry's `enter()` function.
 *
 * @param params - The parameters for creating the proposal
 * @returns Object containing `to` (Space Registry address), `calldata`, and `proposalId`
 *
 * @example
 * ```ts
 * import { daoSpace } from '@geoprotocol/geo-sdk';
 *
 * const { to, calldata, proposalId } = daoSpace.proposeAddEditor({
 *   authorSpaceId: '0xProposerBytes16SpaceId...',
 *   spaceId: '0xDAOBytes16SpaceId...',
 *   daoSpaceAddress: '0xDAOSpaceContractAddress...',
 *   newEditorSpaceId: '0xNewEditorBytes16SpaceId...',
 * });
 *
 * // Submit the transaction using viem or another client
 * await walletClient.sendTransaction({ to, data: calldata });
 * ```
 */
export function proposeAddEditor(params: ProposeAddEditorParams): ProposeAddEditorResult {
  const {
    authorSpaceId: rawAuthorSpaceId,
    spaceId: rawSpaceId,
    daoSpaceAddress,
    newEditorSpaceId: rawNewEditorSpaceId,
    votingMode = 'SLOW',
    proposalId: rawProposalId,
    network = 'TESTNET',
  } = params;

  // Validate inputs
  const authorSpaceId = ensure0xPrefix(rawAuthorSpaceId);
  const newEditorSpaceId = ensure0xPrefix(rawNewEditorSpaceId);
  const spaceId = ensure0xPrefix(rawSpaceId);

  if (!isBytes16Hex(authorSpaceId)) {
    throw new Error(`authorSpaceId must be bytes16 hex (0x followed by 32 hex chars). Received: ${authorSpaceId}`);
  }
  if (!isBytes16Hex(spaceId)) {
    throw new Error(`spaceId must be bytes16 hex (0x followed by 32 hex chars). Received: ${spaceId}`);
  }
  if (!isBytes16Hex(newEditorSpaceId)) {
    throw new Error(
      `newEditorSpaceId must be bytes16 hex (0x followed by 32 hex chars). Received: ${newEditorSpaceId}`,
    );
  }

  const proposalId = rawProposalId
    ? ensure0xPrefix(rawProposalId)
    : (`0x${uuidv4().replaceAll('-', '')}` as `0x${string}`);

  // Encode the addEditor function call: addEditor(bytes16 _newEditorSpaceId)
  const proposalActionCalldata = encodeFunctionData({
    abi: DaoSpaceAbi,
    functionName: 'addEditor',
    args: [newEditorSpaceId],
  });

  const contracts = getContractAddressesBasedOnNetwork(network);

  // Create the proposal action (calling addEditor on the DAO space)
  const proposalActions = [
    {
      to: daoSpaceAddress,
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
