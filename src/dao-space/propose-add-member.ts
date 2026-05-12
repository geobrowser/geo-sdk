import { createGeoClient } from '../client.js';
import { resolveGeoNetwork } from '../networks.js';
import { ensure0xPrefix, isBytes16Hex } from './constants.js';
import type { ProposeAddMemberParams, ProposeAddMemberResult } from './types.js';

/**
 * Creates a proposal to add a member to a DAO space.
 *
 * @deprecated Use `createGeoClient({ network }).daoSpaces.proposeAddMember(...)`.
 */
export function proposeAddMember(params: ProposeAddMemberParams): ProposeAddMemberResult {
  const { network = 'TESTNET', ...args } = params;
  if (!isBytes16Hex(ensure0xPrefix(args.authorSpaceId))) {
    throw new Error(`authorSpaceId must be bytes16 hex (32 hex chars). Received: ${args.authorSpaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.spaceId))) {
    throw new Error(`spaceId must be bytes16 hex (32 hex chars). Received: ${args.spaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.newMemberSpaceId))) {
    throw new Error(`newMemberSpaceId must be bytes16 hex (32 hex chars). Received: ${args.newMemberSpaceId}`);
  }

  return createGeoClient({ network: resolveGeoNetwork(network) }).daoSpaces.proposeAddMember(args);
}
