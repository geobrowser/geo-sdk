import { encodeFunctionData, toHex } from 'viem';

import { DaoSpaceFactoryAbi } from '../abis/index.js';

/**
 * The base value for percentage ratios in the contract.
 * 100% = 10e6 (10,000,000), so 50% = 5e6 (5,000,000)
 */
export const RATIO_BASE = BigInt(10e6);

/** Minimum voting duration in seconds, matching the contracts v2 lower bound. */
export const MINIMUM_VOTING_DURATION = BigInt(60);

/** Minimum voting duration in days */
export const MINIMUM_VOTING_DURATION_DAYS = 1 / 24 / 60;

/** Minimum execution grace period in seconds, matching the contracts v2 lower bound. */
export const MINIMUM_EXECUTION_GRACE_PERIOD = BigInt(60 * 60);

/** Minimum execution grace period in days */
export const MINIMUM_EXECUTION_GRACE_PERIOD_DAYS = 1 / 24;

/**
 * User-friendly voting settings input (using percentages and days)
 */
export interface VotingSettingsInput {
  /** Partial percentage threshold for slow path late execution (0-100) */
  partialPercentageSupportThreshold: number;
  /** Universal percentage threshold for slow path early execution (0-100) */
  universalPercentageSupportThreshold: number;
  /** Number of editors required for fast path approval */
  flatSupportThreshold: number;
  /** Minimum number of editors required to vote */
  quorum: number;
  /** Voting duration in days */
  durationInDays: number;
  /** Whether newly added members start without fast-path access */
  disableFastPathAccessForNewMembers: boolean;
  /** Execution grace period in days */
  executionGracePeriodInDays: number;
}

/**
 * Contract-level voting settings (using raw values)
 */
export interface VotingSettings {
  partialPercentageSupportThreshold: bigint;
  universalPercentageSupportThreshold: bigint;
  flatSupportThreshold: bigint;
  quorum: bigint;
  duration: bigint;
  disableFastPathAccessForNewMembers: boolean;
  executionGracePeriod: bigint;
}

/**
 * Sensible user-friendly defaults for contracts v2 DAO spaces.
 */
export const DEFAULT_VOTING_SETTINGS: VotingSettingsInput = {
  partialPercentageSupportThreshold: 50,
  universalPercentageSupportThreshold: 90,
  flatSupportThreshold: 1,
  quorum: 1,
  durationInDays: 2,
  disableFastPathAccessForNewMembers: true,
  executionGracePeriodInDays: 14,
};

/**
 * Convert a percentage (0-100) to the contract's ratio format.
 */
export function percentageToRatio(percentage: number): bigint {
  return BigInt(Math.floor((percentage * 10e6) / 100));
}

/**
 * Convert days to seconds.
 */
export function daysToSeconds(days: number): bigint {
  return BigInt(Math.floor(days * 24 * 60 * 60));
}

/**
 * Convert user-friendly voting settings to contract format.
 */
export function toContractVotingSettings(input: VotingSettingsInput): VotingSettings {
  return {
    partialPercentageSupportThreshold: percentageToRatio(input.partialPercentageSupportThreshold),
    universalPercentageSupportThreshold: percentageToRatio(input.universalPercentageSupportThreshold),
    flatSupportThreshold: BigInt(input.flatSupportThreshold),
    quorum: BigInt(input.quorum),
    duration: daysToSeconds(input.durationInDays),
    disableFastPathAccessForNewMembers: input.disableFastPathAccessForNewMembers,
    executionGracePeriod: daysToSeconds(input.executionGracePeriodInDays),
  };
}

/**
 * Validate an IPFS URI format.
 */
export function validateIpfsUri(uri: string): string | null {
  if (!uri.startsWith('ipfs://')) {
    return 'IPFS URI must start with "ipfs://"';
  }

  const cid = uri.slice(7);
  if (cid.length === 0) {
    return 'IPFS URI must contain a CID after "ipfs://"';
  }

  const isValidCidV0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);
  const isValidCidV1 = /^b[a-z2-7]{58,}$/.test(cid);

  if (!isValidCidV0 && !isValidCidV1) {
    return 'IPFS URI contains an invalid CID format';
  }

  return null;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Validate voting settings input.
 *
 * When `totalEditors` is provided, the flat support threshold and quorum are
 * also checked against that known editor count. For existing DAO spaces the
 * current editor count may be unknown client-side, so callers can omit it and
 * still get deterministic local validation for numeric shape, percentages, and
 * duration lower bounds before the contract enforces editor-count limits.
 */
export function validateVotingSettingsInput(settings: VotingSettingsInput, totalEditors?: number): string | null {
  if (
    !Number.isFinite(settings.partialPercentageSupportThreshold) ||
    settings.partialPercentageSupportThreshold < 0 ||
    settings.partialPercentageSupportThreshold > 100
  ) {
    return 'partialPercentageSupportThreshold must be between 0 and 100';
  }
  if (
    !Number.isFinite(settings.universalPercentageSupportThreshold) ||
    settings.universalPercentageSupportThreshold < 0 ||
    settings.universalPercentageSupportThreshold > 100
  ) {
    return 'universalPercentageSupportThreshold must be between 0 and 100';
  }
  if (!isNonNegativeInteger(settings.flatSupportThreshold)) {
    return 'flatSupportThreshold must be a non-negative integer';
  }
  if (totalEditors !== undefined && settings.flatSupportThreshold > totalEditors) {
    return `flatSupportThreshold must be between 0 and ${totalEditors} (number of initial editors)`;
  }
  if (!isNonNegativeInteger(settings.quorum)) {
    return 'quorum must be a non-negative integer';
  }
  if (totalEditors !== undefined && settings.quorum > totalEditors) {
    return `quorum must be between 0 and ${totalEditors} (number of initial editors)`;
  }
  if (!Number.isFinite(settings.durationInDays) || settings.durationInDays < MINIMUM_VOTING_DURATION_DAYS) {
    return `durationInDays must be at least ${MINIMUM_VOTING_DURATION_DAYS} days`;
  }
  if (
    !Number.isFinite(settings.executionGracePeriodInDays) ||
    settings.executionGracePeriodInDays < MINIMUM_EXECUTION_GRACE_PERIOD_DAYS
  ) {
    return `executionGracePeriodInDays must be at least ${MINIMUM_EXECUTION_GRACE_PERIOD_DAYS} days`;
  }
  return null;
}

export type CreateDaoSpaceCalldataParams = {
  /** Voting settings for the DAO space */
  votingSettings: VotingSettingsInput;
  /** Space IDs of initial editors (at least one required). Must be bytes16 hex strings without dashes. */
  initialEditorSpaceIds: `0x${string}`[];
  /** Space IDs of initial members (can be empty). Must be bytes16 hex strings without dashes. */
  initialMemberSpaceIds: `0x${string}`[];
  /** Initial edits content URI, e.g. "ipfs://Qm..." (optional) */
  initialEditsContentUri?: string;
  /** Initial topic ID as UUID string (optional - if provided, declares a topic on creation) */
  initialTopicId?: string;
};

/**
 * Get the calldata for creating a DAO space proxy.
 *
 * @deprecated Use `createGeoClient({ network: GeoTestnetConfig }).daoSpaces.create(...)` for the workflow, or keep
 * this helper temporarily for legacy calldata compatibility.
 */
export function getCreateDaoSpaceCalldata(args: CreateDaoSpaceCalldataParams): `0x${string}` {
  const initialEditorSpaceIds = args.initialEditorSpaceIds;
  const initialMemberSpaceIds = args.initialMemberSpaceIds;

  if (initialEditorSpaceIds.length === 0) {
    throw new Error('At least one initial editor space ID is required');
  }

  const validationError = validateVotingSettingsInput(args.votingSettings, initialEditorSpaceIds.length);
  if (validationError) {
    throw new Error(validationError);
  }

  const contractVotingSettings = toContractVotingSettings(args.votingSettings);

  let initialEditsContentUri: `0x${string}` = '0x';
  if (args.initialEditsContentUri) {
    const ipfsError = validateIpfsUri(args.initialEditsContentUri);
    if (ipfsError) {
      throw new Error(ipfsError);
    }
    initialEditsContentUri = toHex(args.initialEditsContentUri);
  }

  let initialTopicId: `0x${string}` = '0x00000000000000000000000000000000';
  if (args.initialTopicId) {
    initialTopicId = `0x${args.initialTopicId.replace(/-/g, '')}`;
  }

  return encodeFunctionData({
    abi: DaoSpaceFactoryAbi,
    functionName: 'createDAOSpaceProxy',
    args: [
      {
        partialPercentageSupportThreshold: contractVotingSettings.partialPercentageSupportThreshold,
        universalPercentageSupportThreshold: contractVotingSettings.universalPercentageSupportThreshold,
        flatSupportThreshold: contractVotingSettings.flatSupportThreshold,
        quorum: contractVotingSettings.quorum,
        duration: contractVotingSettings.duration,
        disableFastPathAccessForNewMembers: contractVotingSettings.disableFastPathAccessForNewMembers,
        executionGracePeriod: contractVotingSettings.executionGracePeriod,
      },
      initialEditorSpaceIds,
      initialMemberSpaceIds,
      initialEditsContentUri,
      '0x',
      initialTopicId,
    ],
  });
}
