import { createGeoClient } from '../client.js';
import { resolveGeoNetwork } from '../networks.js';
import { ensure0xPrefix, isBytes16Hex } from './constants.js';
import type { ProposeUpdateVotingSettingsParams, ProposeUpdateVotingSettingsResult } from './types.js';

/**
 * Creates a proposal to update DAO voting settings.
 *
 * @deprecated Use `createGeoClient({ network }).daoSpaces.proposeUpdateVotingSettings(...)`.
 */
export function proposeUpdateVotingSettings(
  params: ProposeUpdateVotingSettingsParams,
): ProposeUpdateVotingSettingsResult {
  const { network = 'TESTNET', ...args } = params;
  if (!isBytes16Hex(ensure0xPrefix(args.authorSpaceId))) {
    throw new Error(`authorSpaceId must be bytes16 hex (32 hex chars). Received: ${args.authorSpaceId}`);
  }
  if (!isBytes16Hex(ensure0xPrefix(args.spaceId))) {
    throw new Error(`spaceId must be bytes16 hex (32 hex chars). Received: ${args.spaceId}`);
  }

  return createGeoClient({ network: resolveGeoNetwork(network) }).daoSpaces.proposeUpdateVotingSettings(args);
}
