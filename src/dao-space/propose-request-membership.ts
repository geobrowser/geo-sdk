import { v4 as uuidv4 } from 'uuid';
import { encodeAbiParameters, encodeFunctionData } from 'viem';
import { TESTNET } from '../../contracts.js';
import { SpaceRegistryAbi } from '../abis/index.js';
import {
  EMPTY_SIGNATURE,
  EMPTY_TOPIC,
  ensure0xPrefix,
  isBytes16Hex,
  MEMBERSHIP_REQUESTED_ACTION,
} from './constants.js';
import type { ProposeRequestMembershipParams, ProposeRequestMembershipResult } from './types.js';

/**
 * Creates a membership request for a DAO space.
 *
 * This function:
 * 1. Validates the requestor and DAO space IDs
 * 2. Encodes the membership request data (proposalId, requestorSpaceId)
 * 3. Encodes the SpaceRegistry's `enter()` call with the `MEMBERSHIP_REQUESTED` action
 *
 * Unlike governance proposals, this can be called by non-members to request membership.
 * Editors can then approve or reject the request.
 *
 * @param params - The parameters for requesting membership
 * @returns Object containing `to` (Space Registry address), `calldata`, and `proposalId`
 *
 * @example
 * ```ts
 * import { daoSpace } from '@geoprotocol/geo-sdk';
 *
 * const { to, calldata, proposalId } = daoSpace.proposeRequestMembership({
 *   authorSpaceId: '0xRequestorBytes16SpaceId...',
 *   spaceId: '0xDAOBytes16SpaceId...',
 * });
 *
 * // Submit the transaction using viem or another client
 * await walletClient.sendTransaction({ to, data: calldata });
 * ```
 */
export function proposeRequestMembership(params: ProposeRequestMembershipParams): ProposeRequestMembershipResult {
  const { authorSpaceId: rawAuthorSpaceId, spaceId: rawSpaceId, proposalId: rawProposalId } = params;

  // Ensure 0x prefix on all IDs
  const authorSpaceId = ensure0xPrefix(rawAuthorSpaceId);
  const spaceId = ensure0xPrefix(rawSpaceId);

  // Validate inputs
  if (!isBytes16Hex(authorSpaceId)) {
    throw new Error(`authorSpaceId must be bytes16 hex (32 hex chars). Received: ${rawAuthorSpaceId}`);
  }
  if (!isBytes16Hex(spaceId)) {
    throw new Error(`spaceId must be bytes16 hex (32 hex chars). Received: ${rawSpaceId}`);
  }

  // Generate or use provided proposal ID (UUID v4 as bytes16 hex)
  const proposalId = rawProposalId
    ? ensure0xPrefix(rawProposalId)
    : (`0x${uuidv4().replaceAll('-', '')}` as `0x${string}`);

  if (!isBytes16Hex(proposalId)) {
    throw new Error(`proposalId must be bytes16 hex (32 hex chars). Received: ${rawProposalId}`);
  }

  // Encode the membership request data: (bytes16 proposalId, bytes16 newMemberSpaceId)
  const data = encodeAbiParameters(
    [
      { type: 'bytes16', name: 'proposalId' },
      { type: 'bytes16', name: 'newMemberSpaceId' },
    ],
    [proposalId, authorSpaceId],
  );

  // Encode the SpaceRegistry.enter() call
  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: 'enter',
    args: [
      authorSpaceId, // fromSpaceId
      spaceId, // toSpaceId
      MEMBERSHIP_REQUESTED_ACTION, // action
      EMPTY_TOPIC, // topic (empty for membership requests)
      data, // data (proposalId + newMemberSpaceId)
      EMPTY_SIGNATURE, // signature (unused when msg.sender == fromSpace)
    ],
  });

  return {
    to: TESTNET.SPACE_REGISTRY_ADDRESS,
    calldata,
    proposalId,
  };
}
