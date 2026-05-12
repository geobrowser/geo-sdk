import { createGeoClient } from '../client.js';
import { resolveGeoNetwork } from '../networks.js';
import { ensure0xPrefix, isBytes16Hex } from './constants.js';
import type { VoteProposalParams, VoteProposalResult } from './types.js';

/**
 * Creates a vote transaction for a DAO space proposal.
 *
 * @deprecated Use `createGeoClient({ network }).daoSpaces.proposals.vote(...)`.
 */
export function voteProposal(params: VoteProposalParams): VoteProposalResult {
  const { network = 'TESTNET', ...args } = params;
  if (!isBytes16Hex(ensure0xPrefix(args.authorSpaceId))) {
    throw new Error(`authorSpaceId must be bytes16 hex (32 hex chars). Received: ${args.authorSpaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.spaceId))) {
    throw new Error(`spaceId must be bytes16 hex (32 hex chars). Received: ${args.spaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.proposalId))) {
    throw new Error(`proposalId must be bytes16 hex (32 hex chars). Received: ${args.proposalId}`);
  }

  return createGeoClient({ network: resolveGeoNetwork(network) }).daoSpaces.proposals.vote(args);
}
