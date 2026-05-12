import { createGeoClient } from '../client.js';
import { ensure0xPrefix, isBytes16Hex } from './constants.js';
import type { ExecuteProposalParams, ExecuteProposalResult } from './types.js';

/**
 * Creates an execute transaction for a passed DAO space proposal.
 *
 * @deprecated Use `createGeoClient({ network }).proposals.execute(...)`.
 */
export function executeProposal(params: ExecuteProposalParams): ExecuteProposalResult {
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

  return createGeoClient({ network }).proposals.execute(args);
}
