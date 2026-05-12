import { decodeFunctionData, hexToString } from 'viem';
import { describe, expect, it } from 'vitest';

import { DaoSpaceFactoryAbi } from '../abis/index.js';
import {
  DEFAULT_VOTING_SETTINGS,
  daysToSeconds,
  getCreateDaoSpaceCalldata,
  MINIMUM_EXECUTION_GRACE_PERIOD,
  MINIMUM_EXECUTION_GRACE_PERIOD_DAYS,
  MINIMUM_VOTING_DURATION,
  MINIMUM_VOTING_DURATION_DAYS,
  percentageToRatio,
  RATIO_BASE,
  toContractVotingSettings,
  validateIpfsUri,
  validateVotingSettingsInput,
} from './get-create-dao-space-calldata.js';

describe('percentageToRatio', () => {
  it('should convert 100% to RATIO_BASE', () => {
    expect(percentageToRatio(100)).toBe(RATIO_BASE);
  });

  it('should convert 50% to half of RATIO_BASE', () => {
    expect(percentageToRatio(50)).toBe(RATIO_BASE / BigInt(2));
  });

  it('should convert 0% to 0', () => {
    expect(percentageToRatio(0)).toBe(BigInt(0));
  });

  it('should handle decimal percentages', () => {
    expect(percentageToRatio(33.33)).toBe(BigInt(3333000));
  });
});

describe('daysToSeconds', () => {
  it('should convert 1 day to 86400 seconds', () => {
    expect(daysToSeconds(1)).toBe(BigInt(86400));
  });

  it('should convert 2 days to 172800 seconds', () => {
    expect(daysToSeconds(2)).toBe(BigInt(172800));
  });

  it('should expose the contracts v2 minimum duration', () => {
    expect(MINIMUM_VOTING_DURATION).toBe(BigInt(60));
  });

  it('should handle fractional days', () => {
    expect(daysToSeconds(0.5)).toBe(BigInt(43200));
  });
});

describe('toContractVotingSettings', () => {
  it('should convert user-friendly settings to contract format', () => {
    const input = {
      partialPercentageSupportThreshold: 50,
      universalPercentageSupportThreshold: 90,
      flatSupportThreshold: 3,
      quorum: 2,
      durationInDays: 7,
      disableFastPathAccessForNewMembers: true,
      executionGracePeriodInDays: 14,
    };

    const result = toContractVotingSettings(input);

    expect(result.partialPercentageSupportThreshold).toBe(percentageToRatio(50));
    expect(result.universalPercentageSupportThreshold).toBe(percentageToRatio(90));
    expect(result.flatSupportThreshold).toBe(BigInt(3));
    expect(result.quorum).toBe(BigInt(2));
    expect(result.duration).toBe(daysToSeconds(7));
    expect(result.disableFastPathAccessForNewMembers).toBe(true);
    expect(result.executionGracePeriod).toBe(daysToSeconds(14));
  });
});

describe('validateIpfsUri', () => {
  it('should return null for valid CIDv0', () => {
    expect(validateIpfsUri('ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5')).toBeNull();
  });

  it('should return null for valid CIDv1', () => {
    expect(validateIpfsUri('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')).toBeNull();
  });

  it('should reject URI without ipfs:// prefix', () => {
    expect(validateIpfsUri('QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5')).toBe(
      'IPFS URI must start with "ipfs://"',
    );
  });

  it('should reject empty CID', () => {
    expect(validateIpfsUri('ipfs://')).toBe('IPFS URI must contain a CID after "ipfs://"');
  });

  it('should reject invalid CID format', () => {
    expect(validateIpfsUri('ipfs://invalid')).toBe('IPFS URI contains an invalid CID format');
  });

  it('should reject http URLs', () => {
    expect(validateIpfsUri('https://example.com/file')).toBe('IPFS URI must start with "ipfs://"');
  });
});

describe('validateVotingSettingsInput', () => {
  const validSettings = {
    partialPercentageSupportThreshold: 50,
    universalPercentageSupportThreshold: 90,
    flatSupportThreshold: 3,
    quorum: 2,
    durationInDays: 7,
    disableFastPathAccessForNewMembers: true,
    executionGracePeriodInDays: 14,
  };

  it('should return null for valid settings', () => {
    expect(validateVotingSettingsInput(validSettings, 5)).toBeNull();
  });

  it('should reject partialPercentageSupportThreshold below 0', () => {
    const settings = { ...validSettings, partialPercentageSupportThreshold: -1 };
    expect(validateVotingSettingsInput(settings, 5)).toBe(
      'partialPercentageSupportThreshold must be between 0 and 100',
    );
  });

  it('should reject partialPercentageSupportThreshold above 100', () => {
    const settings = { ...validSettings, partialPercentageSupportThreshold: 101 };
    expect(validateVotingSettingsInput(settings, 5)).toBe(
      'partialPercentageSupportThreshold must be between 0 and 100',
    );
  });

  it('should reject universalPercentageSupportThreshold above 100', () => {
    const settings = { ...validSettings, universalPercentageSupportThreshold: 101 };
    expect(validateVotingSettingsInput(settings, 5)).toBe(
      'universalPercentageSupportThreshold must be between 0 and 100',
    );
  });

  it('should reject flatSupportThreshold above total editors', () => {
    const settings = { ...validSettings, flatSupportThreshold: 10 };
    expect(validateVotingSettingsInput(settings, 5)).toBe(
      'flatSupportThreshold must be between 0 and 5 (number of initial editors)',
    );
  });

  it('should reject quorum above total editors', () => {
    const settings = { ...validSettings, quorum: 10 };
    expect(validateVotingSettingsInput(settings, 5)).toBe('quorum must be between 0 and 5 (number of initial editors)');
  });

  it('should allow omitted total editors for existing DAO settings validation', () => {
    const settings = { ...validSettings, flatSupportThreshold: 10, quorum: 10 };
    expect(validateVotingSettingsInput(settings)).toBeNull();
  });

  it('should reject non-integer flatSupportThreshold and quorum', () => {
    expect(validateVotingSettingsInput({ ...validSettings, flatSupportThreshold: 1.5 })).toBe(
      'flatSupportThreshold must be a non-negative integer',
    );
    expect(validateVotingSettingsInput({ ...validSettings, quorum: -1 })).toBe('quorum must be a non-negative integer');
  });

  it('should reject durationInDays below minimum', () => {
    const settings = { ...validSettings, durationInDays: MINIMUM_VOTING_DURATION_DAYS / 2 };
    expect(validateVotingSettingsInput(settings, 5)).toBe(
      `durationInDays must be at least ${MINIMUM_VOTING_DURATION_DAYS} days`,
    );
  });

  it('should reject executionGracePeriodInDays below minimum', () => {
    const settings = { ...validSettings, executionGracePeriodInDays: MINIMUM_EXECUTION_GRACE_PERIOD_DAYS / 2 };
    expect(validateVotingSettingsInput(settings, 5)).toBe(
      `executionGracePeriodInDays must be at least ${MINIMUM_EXECUTION_GRACE_PERIOD_DAYS} days`,
    );
  });
});

describe('getCreateDaoSpaceCalldata', () => {
  const validArgs = {
    votingSettings: {
      partialPercentageSupportThreshold: 50,
      universalPercentageSupportThreshold: 90,
      flatSupportThreshold: 2,
      quorum: 1,
      durationInDays: 7,
      disableFastPathAccessForNewMembers: true,
      executionGracePeriodInDays: 14,
    },
    initialEditorSpaceIds: [
      '0x12345678901234567890123456789012' as `0x${string}`,
      '0x22345678901234567890123456789012' as `0x${string}`,
      '0x32345678901234567890123456789012' as `0x${string}`,
    ],
    initialMemberSpaceIds: ['0xabcdefabcdefabcdefabcdefabcdefab' as `0x${string}`],
  };

  it('should generate valid calldata', () => {
    const calldata = getCreateDaoSpaceCalldata(validArgs);
    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should encode the v2 six-argument factory call', () => {
    const calldata = getCreateDaoSpaceCalldata(validArgs);
    const decoded = decodeFunctionData({
      abi: DaoSpaceFactoryAbi,
      data: calldata,
    });

    expect(decoded.functionName).toBe('createDAOSpaceProxy');
    expect(decoded.args).toHaveLength(6);
    expect(decoded.args[0]).toMatchObject({
      partialPercentageSupportThreshold: percentageToRatio(50),
      universalPercentageSupportThreshold: percentageToRatio(90),
      flatSupportThreshold: 2n,
      quorum: 1n,
      duration: daysToSeconds(7),
      disableFastPathAccessForNewMembers: true,
      executionGracePeriod: daysToSeconds(14),
    });
  });

  it('should throw if no initial editors provided', () => {
    const args = { ...validArgs, initialEditorSpaceIds: [] as `0x${string}`[] };
    expect(() => getCreateDaoSpaceCalldata(args)).toThrow('At least one initial editor space ID is required');
  });

  it('should throw if voting settings are invalid', () => {
    const args = {
      ...validArgs,
      votingSettings: { ...validArgs.votingSettings, partialPercentageSupportThreshold: 150 },
    };
    expect(() => getCreateDaoSpaceCalldata(args)).toThrow(
      'partialPercentageSupportThreshold must be between 0 and 100',
    );
  });

  it('should throw if duration is below minimum', () => {
    const args = {
      ...validArgs,
      votingSettings: { ...validArgs.votingSettings, durationInDays: MINIMUM_VOTING_DURATION_DAYS / 2 },
    };
    expect(() => getCreateDaoSpaceCalldata(args)).toThrow(
      `durationInDays must be at least ${MINIMUM_VOTING_DURATION_DAYS} days`,
    );
  });

  it('should accept empty initial members', () => {
    const args = { ...validArgs, initialMemberSpaceIds: [] as `0x${string}`[] };
    const calldata = getCreateDaoSpaceCalldata(args);
    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should accept space IDs', () => {
    const calldata = getCreateDaoSpaceCalldata(validArgs);
    expect(calldata).toBeTypeOf('string');
  });

  it('should generate calldata without initialEditsContentUri', () => {
    const calldata = getCreateDaoSpaceCalldata(validArgs);
    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
  });

  it('should generate calldata with initialEditsContentUri', () => {
    const args = {
      ...validArgs,
      initialEditsContentUri: 'ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5',
    };
    const calldata = getCreateDaoSpaceCalldata(args);
    expect(calldata).toBeTypeOf('string');
    expect(calldata.startsWith('0x')).toBe(true);
    // Calldata with URI should be longer than without
    const calldataWithoutUri = getCreateDaoSpaceCalldata(validArgs);
    expect(calldata.length).toBeGreaterThan(calldataWithoutUri.length);

    const decoded = decodeFunctionData({
      abi: DaoSpaceFactoryAbi,
      data: calldata,
    });
    expect(hexToString(decoded.args[3] as `0x${string}`)).toBe(args.initialEditsContentUri);
    expect(decoded.args[4]).toBe('0x');
  });

  it('should generate different calldata for different URIs', () => {
    const calldata1 = getCreateDaoSpaceCalldata({
      ...validArgs,
      initialEditsContentUri: 'ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5',
    });
    const calldata2 = getCreateDaoSpaceCalldata({
      ...validArgs,
      initialEditsContentUri: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    });
    expect(calldata1).not.toBe(calldata2);
  });

  it('should provide conservative v2 default voting settings', () => {
    const result = toContractVotingSettings(DEFAULT_VOTING_SETTINGS);

    expect(result.partialPercentageSupportThreshold).toBe(percentageToRatio(50));
    expect(result.universalPercentageSupportThreshold).toBe(percentageToRatio(90));
    expect(result.flatSupportThreshold).toBe(1n);
    expect(result.quorum).toBe(1n);
    expect(result.duration).toBe(daysToSeconds(2));
    expect(result.disableFastPathAccessForNewMembers).toBe(true);
    expect(result.executionGracePeriod).toBeGreaterThan(MINIMUM_EXECUTION_GRACE_PERIOD);
  });

  it('should throw for invalid IPFS URI', () => {
    const args = {
      ...validArgs,
      initialEditsContentUri: 'https://example.com/file',
    };
    expect(() => getCreateDaoSpaceCalldata(args)).toThrow('IPFS URI must start with "ipfs://"');
  });

  it('should throw for invalid CID format', () => {
    const args = {
      ...validArgs,
      initialEditsContentUri: 'ipfs://invalid-cid',
    };
    expect(() => getCreateDaoSpaceCalldata(args)).toThrow('IPFS URI contains an invalid CID format');
  });
});
