import { createGeoClient } from '../client.js';
import { resolveGeoNetwork } from '../networks.js';
import { ensure0xPrefix, isBytes16Hex } from './constants.js';
import type { ProposeRemoveEditorParams, ProposeRemoveEditorResult } from './types.js';

/**
 * Creates a proposal to remove an editor from a DAO space.
 *
 * @deprecated Use `createGeoClient({ network }).daoSpaces.proposeRemoveEditor(...)`.
 */
export function proposeRemoveEditor(params: ProposeRemoveEditorParams): ProposeRemoveEditorResult {
  const { network = 'TESTNET', ...args } = params;
  if (!isBytes16Hex(ensure0xPrefix(args.authorSpaceId))) {
    throw new Error(`authorSpaceId must be bytes16 hex (32 hex chars). Received: ${args.authorSpaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.spaceId))) {
    throw new Error(`spaceId must be bytes16 hex (32 hex chars). Received: ${args.spaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.editorToRemoveSpaceId))) {
    throw new Error(
      `editorToRemoveSpaceId must be bytes16 hex (32 hex chars). Received: ${args.editorToRemoveSpaceId}`,
    );
  }

  return createGeoClient({ network: resolveGeoNetwork(network) }).daoSpaces.proposeRemoveEditor(args);
}
