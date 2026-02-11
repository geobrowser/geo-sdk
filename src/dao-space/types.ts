import type { Op } from "@geoprotocol/grc-20";
import type { VotingSettingsInput } from "../encodings/get-create-dao-space-calldata.js";
import type { Id } from "../id.js";
import type { Network } from "../types.js";

export type CreateSpaceParams = {
  /** Name of the DAO space */
  name: string;
  /** Voting settings for the DAO space */
  votingSettings: VotingSettingsInput;
  /** Space IDs of initial editors (at least one required). Must be bytes16 hex strings. */
  initialEditorSpaceIds: `0x${string}`[];
  /** Space IDs of initial members (can be empty). Must be bytes16 hex strings. */
  initialMemberSpaceIds?: `0x${string}`[];
  /** The author's personal space ID (UUID). */
  author: Id | string;
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

/**
 * Voting mode for DAO proposals.
 * - SLOW: Standard voting requiring percentage threshold
 * - FAST: Fast-path voting requiring flat threshold (for valid fast-path actions)
 */
export type VotingMode = "SLOW" | "FAST";

export type ProposeEditParams = {
  /** Name of the edit (used for IPFS metadata) */
  name: string;
  /** The ops to include in the edit */
  ops: Op[];
  /** The author's personal space ID (UUID). */
  author: Id | string;
  /**
   * The DAO space contract address.
   * This is the target of the publish() call in the proposal.
   */
  daoSpaceAddress: `0x${string}`;
  /**
   * The proposer's space ID (bytes16 hex).
   * This is the fromSpaceId in the enter() call.
   */
  callerSpaceId: `0x${string}`;
  /**
   * The DAO space ID (bytes16 hex).
   * This is the toSpaceId in the enter() call.
   */
  daoSpaceId: `0x${string}`;
  /**
   * Voting mode for the proposal.
   * Defaults to 'FAST' since publish() is a valid fast-path action.
   */
  votingMode?: VotingMode;
  /**
   * Optional bytes16 proposalId (0x + 32 hex chars).
   * If omitted, a unique id is generated.
   */
  proposalId?: `0x${string}`;
  /** Network to use (defaults to TESTNET) */
  network?: Network;
};

export type ProposeEditResult = {
  /** The generated edit ID */
  editId: Id;
  /** The IPFS CID of the published edit */
  cid: string;
  /** The contract address to send the transaction to (Space Registry) */
  to: `0x${string}`;
  /** The calldata for the enter() function call */
  calldata: `0x${string}`;
  /** The proposal ID (bytes16 hex) */
  proposalId: `0x${string}`;
};
