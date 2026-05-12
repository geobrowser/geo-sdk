import { createGeoClient } from '../client.js';
import { resolveGeoNetwork } from '../networks.js';
import { isBytes16Hex } from './constants.js';
import type { ProposeEditParams, ProposeEditResult } from './types.js';

/**
 * Creates a proposal to publish an edit to a DAO space.
 *
 * @deprecated Use `createGeoClient({ network }).daoSpaces.proposeEdit(...)`.
 */
export async function proposeEdit(params: ProposeEditParams): Promise<ProposeEditResult> {
  const { network = 'TESTNET', ...args } = params;
  if (!isBytes16Hex(args.callerSpaceId)) {
    throw new Error(`callerSpaceId must be bytes16 hex (0x followed by 32 hex chars). Received: ${args.callerSpaceId}`);
  }
  if (!isBytes16Hex(args.daoSpaceId)) {
    throw new Error(`daoSpaceId must be bytes16 hex (0x followed by 32 hex chars). Received: ${args.daoSpaceId}`);
  }
  if (args.proposalId && !isBytes16Hex(args.proposalId)) {
    throw new Error(`proposalId must be bytes16 hex (0x followed by 32 hex chars). Received: ${args.proposalId}`);
  }

  return createGeoClient({ network: resolveGeoNetwork(network) }).daoSpaces.proposeEdit(args);
}
