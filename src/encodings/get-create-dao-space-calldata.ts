import { encodeAbiParameters, encodeFunctionData } from 'viem';

import { DaoSpaceFactoryAbi } from '../abis/index.js';

/**
 * The base value for percentage ratios in the contract.
 * 100% = 10e6 (10,000,000), so 50% = 5e6 (5,000,000)
 */
export const RATIO_BASE = BigInt(10e6);

/** Minimum voting duration in seconds (2 days) */
export const MINIMUM_VOTING_DURATION = BigInt(2 * 24 * 60 * 60);

/** Minimum voting duration in days */
export const MINIMUM_VOTING_DURATION_DAYS = 2;

/**
 * User-friendly voting settings input (using percentages and days)
 */
export interface VotingSettingsInput {
  /** Percentage threshold for slow path (0-100) */
  slowPathPercentageThreshold: number;
  /** Number of editors required for fast path approval */
  fastPathFlatThreshold: number;
  /** Minimum number of editors required to vote */
  quorum: number;
  /** Voting duration in days (minimum 2 days) */
  durationInDays: number;
}

/**
 * Contract-level voting settings (using raw values)
 */
export interface VotingSettings {
  slowPathPercentageThreshold: bigint;
  fastPathFlatThreshold: bigint;
  quorum: bigint;
  duration: bigint;
}

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
    slowPathPercentageThreshold: percentageToRatio(input.slowPathPercentageThreshold),
    fastPathFlatThreshold: BigInt(input.fastPathFlatThreshold),
    quorum: BigInt(input.quorum),
    duration: daysToSeconds(input.durationInDays),
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

/**
 * Validate voting settings input.
 */
export function validateVotingSettingsInput(settings: VotingSettingsInput, totalEditors: number): string | null {
  if (settings.slowPathPercentageThreshold < 0 || settings.slowPathPercentageThreshold > 100) {
    return 'slowPathPercentageThreshold must be between 0 and 100';
  }
  if (settings.fastPathFlatThreshold < 0 || settings.fastPathFlatThreshold > totalEditors) {
    return `fastPathFlatThreshold must be between 0 and ${totalEditors} (number of initial editors)`;
  }
  if (settings.quorum < 0 || settings.quorum > totalEditors) {
    return `quorum must be between 0 and ${totalEditors} (number of initial editors)`;
  }
  if (settings.durationInDays < MINIMUM_VOTING_DURATION_DAYS) {
    return `durationInDays must be at least ${MINIMUM_VOTING_DURATION_DAYS} days`;
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
    initialEditsContentUri = encodeAbiParameters([{ type: 'string' }], [args.initialEditsContentUri]);
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
        slowPathPercentageThreshold: contractVotingSettings.slowPathPercentageThreshold,
        fastPathFlatThreshold: contractVotingSettings.fastPathFlatThreshold,
        quorum: contractVotingSettings.quorum,
        duration: contractVotingSettings.duration,
      },
      initialEditorSpaceIds,
      initialMemberSpaceIds,
      initialEditsContentUri,
      '0x',
      initialTopicId,
      '0x',
    ],
  });
}
