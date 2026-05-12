import { createGeoClient } from '../client.js';
import { resolveGeoNetwork } from '../networks.js';
import { ensure0xPrefix, isBytes16Hex } from './constants.js';
import type { ProposeRemoveMemberParams, ProposeRemoveMemberResult } from './types.js';

/**
 * Creates a proposal to remove a member from a DAO space.
 *
 * @deprecated Use `createGeoClient({ network }).daoSpaces.proposeRemoveMember(...)`.
 */
export function proposeRemoveMember(params: ProposeRemoveMemberParams): ProposeRemoveMemberResult {
  const { network = 'TESTNET', ...args } = params;
  if (!isBytes16Hex(ensure0xPrefix(args.authorSpaceId))) {
    throw new Error(`authorSpaceId must be bytes16 hex (32 hex chars). Received: ${args.authorSpaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.spaceId))) {
    throw new Error(`spaceId must be bytes16 hex (32 hex chars). Received: ${args.spaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.memberToRemoveSpaceId))) {
    throw new Error(
      `memberToRemoveSpaceId must be bytes16 hex (32 hex chars). Received: ${args.memberToRemoveSpaceId}`,
    );
  }

  return createGeoClient({ network: resolveGeoNetwork(network) }).daoSpaces.proposeRemoveMember(args);
}
