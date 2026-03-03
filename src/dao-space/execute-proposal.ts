import { encodeAbiParameters, encodeFunctionData } from 'viem';
import { TESTNET } from '../../contracts.js';
import { SpaceRegistryAbi } from '../abis/index.js';
import {
  bytes16ToBytes32LeftAligned,
  EMPTY_SIGNATURE,
  ensure0xPrefix,
  isBytes16Hex,
  PROPOSAL_EXECUTED_ACTION,
} from './constants.js';
import type { ExecuteProposalParams, ExecuteProposalResult } from './types.js';

/**
 * Creates an execute transaction for a passed DAO space proposal.
 *
 * This function:
 * 1. Validates the author, DAO space, and proposal IDs
 * 2. Encodes the proposal ID as the data payload
 * 3. Encodes the SpaceRegistry's `enter()` call with the `PROPOSAL_EXECUTED` action
 *
 * Anyone can execute a proposal once it has passed the support threshold.
 *
 * @param params - The parameters for executing a proposal
 * @returns Object containing `to` (Space Registry address) and `calldata`
 *
 * @example
 * ```ts
 * import { daoSpace } from '@geoprotocol/geo-sdk';
 *
 * const { to, calldata } = daoSpace.executeProposal({
 *   authorSpaceId: '0xAuthorBytes16SpaceId...',
 *   spaceId: '0xDAOBytes16SpaceId...',
 *   proposalId: '0xProposalBytes16Id...',
 * });
 *
 * await walletClient.sendTransaction({ to, data: calldata });
 * ```
 */
export function executeProposal(params: ExecuteProposalParams): ExecuteProposalResult {
  const { authorSpaceId: rawAuthorSpaceId, spaceId: rawSpaceId, proposalId: rawProposalId } = params;

  // Ensure 0x prefix on all IDs
  const authorSpaceId = ensure0xPrefix(rawAuthorSpaceId);
  const spaceId = ensure0xPrefix(rawSpaceId);
  const proposalId = ensure0xPrefix(rawProposalId);

  // Validate inputs
  if (!isBytes16Hex(authorSpaceId)) {
    throw new Error(`authorSpaceId must be bytes16 hex (32 hex chars). Received: ${rawAuthorSpaceId}`);
  }
  if (!isBytes16Hex(spaceId)) {
    throw new Error(`spaceId must be bytes16 hex (32 hex chars). Received: ${rawSpaceId}`);
  }
  if (!isBytes16Hex(proposalId)) {
    throw new Error(`proposalId must be bytes16 hex (32 hex chars). Received: ${rawProposalId}`);
  }

  // Convert proposalId to bytes32 for the topic (left-aligned)
  const topic = bytes16ToBytes32LeftAligned(proposalId);

  // Encode the execute data: proposalId (matches the contract's abi.decode format)
  const data = encodeAbiParameters([{ type: 'bytes16', name: 'proposalId' }], [proposalId]);

  // Encode the SpaceRegistry.enter() call
  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [
      authorSpaceId, // fromSpaceId
      spaceId, // toSpaceId
      PROPOSAL_EXECUTED_ACTION, // action
      topic, // topic (proposalId left-aligned to bytes32)
      data, // data (encoded proposalId)
      EMPTY_SIGNATURE, // signature (unused when msg.sender == fromSpace)
    ],
  });

  return {
    to: TESTNET.SPACE_REGISTRY_ADDRESS,
    calldata,
  };
}
