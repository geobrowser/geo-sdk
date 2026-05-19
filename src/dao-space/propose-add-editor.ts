import { createGeoClient } from '../client.js';
import { resolveGeoNetwork } from '../networks.js';
import { ensure0xPrefix, isBytes16Hex } from './constants.js';
import type { ProposeAddEditorParams, ProposeAddEditorResult } from './types.js';

/**
 * Creates a proposal to add an editor to a DAO space.
 *
 * @deprecated Use `createGeoClient({ network }).daoSpaces.proposeAddEditor(...)`.
 */
export function proposeAddEditor(params: ProposeAddEditorParams): ProposeAddEditorResult {
  const { network = 'TESTNET', ...args } = params;
  if (!isBytes16Hex(ensure0xPrefix(args.authorSpaceId))) {
    throw new Error(`authorSpaceId must be bytes16 hex (32 hex chars). Received: ${args.authorSpaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.spaceId))) {
    throw new Error(`spaceId must be bytes16 hex (32 hex chars). Received: ${args.spaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.newEditorSpaceId))) {
    throw new Error(`newEditorSpaceId must be bytes16 hex (32 hex chars). Received: ${args.newEditorSpaceId}`);
  }

  return createGeoClient({ network: resolveGeoNetwork(network) }).daoSpaces.proposeAddEditor(args);
}
