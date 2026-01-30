import type { Op } from '@geoprotocol/grc-20';

import type { VotingSettingsInput } from '../encodings/get-create-dao-space-calldata.js';
import type { Network } from '../types.js';

export type CreateSpaceParams = {
  /** Name of the DAO space */
  name: string;
  /** Voting settings for the DAO space */
  votingSettings: VotingSettingsInput;
  /** Space IDs of initial editors (at least one required). Must be bytes16 hex strings. */
  initialEditorSpaceIds: `0x${string}`[];
  /** Space IDs of initial members (can be empty). Must be bytes16 hex strings. */
  initialMemberSpaceIds?: `0x${string}`[];
  /** Author address for the initial edit */
  author: `0x${string}`;
  /** Additional ops to include in the initial edit (optional) */
  ops?: Op[];
  /** Initial topic ID as UUID string (optional - if provided, declares a topic on creation) */
  initialTopicId?: string;
  /** Network to use (defaults to TESTNET) */
  network?: Network;
};

export type CreateSpaceResult = {
  to: `0x${string}`;
  calldata: `0x${string}`;
  /** The generated space entity ID */
  spaceEntityId: string;
  /** The IPFS CID of the initial edit */
  cid: string;
};
