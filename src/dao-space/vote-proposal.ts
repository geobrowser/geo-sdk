import { encodeAbiParameters, encodeFunctionData } from 'viem';

import { TESTNET } from '../../contracts.js';
import { SpaceRegistryAbi } from '../abis/index.js';
import {
  bytes16ToBytes32LeftAligned,
  EMPTY_SIGNATURE,
  isBytes16Hex,
  PROPOSAL_VOTED_ACTION,
  VOTE_OPTION_VALUES,
} from './constants.js';
import type { VoteProposalParams, VoteProposalResult } from './types.js';

/**
 * Ensures a hex string has the 0x prefix.
 */
function ensure0xPrefix(value: string): `0x${string}` {
  return (value.startsWith('0x') ? value : `0x${value}`) as `0x${string}`;
}

/**
 * Creates a vote transaction for a DAO space proposal.
 *
 * This function:
 * 1. Validates the author, DAO space, and proposal IDs
 * 2. Encodes the vote option as the data payload
 * 3. Encodes the SpaceRegistry's `enter()` call with the `PROPOSAL_VOTED` action
 *
 * No IPFS publish is needed — this is purely a governance action.
 *
 * @param params - The parameters for voting on a proposal
 * @returns Object containing `to` (Space Registry address) and `calldata`
 *
 * @example
 * ```ts
 * import { daoSpace } from '@geoprotocol/geo-sdk';
 *
 * const { to, calldata } = daoSpace.voteProposal({
 *   authorSpaceId: '0xAuthorBytes16SpaceId...',
 *   daoSpaceId: '0xDAOBytes16SpaceId...',
 *   proposalId: '0xProposalBytes16Id...',
 *   vote: 'YES',
 * });
 *
 * // Submit the transaction using viem or another client
 * await walletClient.sendTransaction({ to, data: calldata });
 * ```
 */
export function voteProposal(params: VoteProposalParams): VoteProposalResult {
  const { authorSpaceId: rawAuthorSpaceId, daoSpaceId: rawDaoSpaceId, proposalId: rawProposalId, vote } = params;

  // Ensure 0x prefix on all IDs
  const authorSpaceId = ensure0xPrefix(rawAuthorSpaceId);
  const daoSpaceId = ensure0xPrefix(rawDaoSpaceId);
  const proposalId = ensure0xPrefix(rawProposalId);

  // Validate inputs
  if (!isBytes16Hex(authorSpaceId)) {
    throw new Error(`authorSpaceId must be bytes16 hex (32 hex chars). Received: ${rawAuthorSpaceId}`);
  }
  if (!isBytes16Hex(daoSpaceId)) {
    throw new Error(`daoSpaceId must be bytes16 hex (32 hex chars). Received: ${rawDaoSpaceId}`);
  }
  if (!isBytes16Hex(proposalId)) {
    throw new Error(`proposalId must be bytes16 hex (32 hex chars). Received: ${rawProposalId}`);
  }

  // Convert proposalId to bytes32 for the topic (left-aligned)
  const topic = bytes16ToBytes32LeftAligned(proposalId);

  // Encode the vote data: proposalId + voteOption (matches the contract's abi.decode format)
  const data = encodeAbiParameters(
    [
      { type: 'bytes16', name: 'proposalId' },
      { type: 'uint8', name: 'voteOption' },
    ],
    [proposalId, VOTE_OPTION_VALUES[vote]],
  );

  // Encode the SpaceRegistry.enter() call
  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [
      authorSpaceId, // fromSpaceId
      daoSpaceId, // toSpaceId
      PROPOSAL_VOTED_ACTION, // action
      topic, // topic (proposalId left-aligned to bytes32)
      data, // data (encoded vote option)
      EMPTY_SIGNATURE, // signature (unused when msg.sender == fromSpace)
    ],
  });

  return {
    to: TESTNET.SPACE_REGISTRY_ADDRESS,
    calldata,
  };
}
