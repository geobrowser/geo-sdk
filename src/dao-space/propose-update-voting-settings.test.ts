import { decodeAbiParameters, decodeFunctionData } from 'viem';
import { describe, expect, it } from 'vitest';

import { TESTNET } from '../../contracts.js';
import { DaoSpaceAbi, SpaceRegistryAbi } from '../abis/index.js';
import { PROPOSAL_CREATED_ACTION, ZERO_ADDRESS } from './constants.js';
import { proposeUpdateVotingSettings } from './propose-update-voting-settings.js';

describe('proposeUpdateVotingSettings', () => {
  const validAuthorSpaceId = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
  const validSpaceId = '0xabcdef12345678901234567890abcdef' as const;
  const validDaoSpaceAddress = '0x1234567890123456789012345678901234567890' as const;
  const validVotingSettings = {
    partialPercentageSupportThreshold: 60,
    universalPercentageSupportThreshold: 90,
    flatSupportThreshold: 2,
    quorum: 1,
    durationInDays: 3,
    disableFastPathAccessForNewMembers: true,
    executionGracePeriodInDays: 14,
  };

  it('should return correct structure', () => {
    const result = proposeUpdateVotingSettings({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      votingSettings: validVotingSettings,
    });

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('calldata');
    expect(result).toHaveProperty('proposalId');
  });

  it('should return the correct contract address (Space Registry)', () => {
    const { to } = proposeUpdateVotingSettings({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      votingSettings: validVotingSettings,
    });

    expect(to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
  });

  it('should encode a v2 updateVotingSettings DAO action', () => {
    const result = proposeUpdateVotingSettings({
      authorSpaceId: validAuthorSpaceId,
      spaceId: validSpaceId,
      daoSpaceAddress: validDaoSpaceAddress,
      votingSettings: validVotingSettings,
    });
    const decodedEnter = decodeFunctionData({
      abi: SpaceRegistryAbi,
      data: result.calldata,
    });
    const [, , action, , data] = decodedEnter.args as [
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
    ];
    const [, votingMode, actions] = decodeAbiParameters(
      [
        { type: 'bytes16', name: 'proposalId' },
        { type: 'uint8', name: 'votingMode' },
        {
          type: 'tuple[]',
          name: 'actions',
          components: [
            { type: 'address', name: 'toAddress' },
            { type: 'bytes16', name: 'toSpaceId' },
            { type: 'uint256', name: 'value' },
            { type: 'bytes', name: 'data' },
          ],
        },
      ],
      data,
    );
    const updateSettingsAction = actions[0];
    expect(updateSettingsAction).toBeDefined();
    if (!updateSettingsAction) {
      throw new Error('Expected updateVotingSettings action');
    }
    const decodedAction = decodeFunctionData({
      abi: DaoSpaceAbi,
      data: updateSettingsAction.data,
    });

    expect(action).toBe(PROPOSAL_CREATED_ACTION);
    expect(votingMode).toBe(0);
    expect(updateSettingsAction.toAddress).toBe(ZERO_ADDRESS);
    expect(updateSettingsAction.toSpaceId).toBe(validSpaceId);
    expect(decodedAction.functionName).toBe('updateVotingSettings');
    expect(decodedAction.args?.[0]).toEqual({
      partialPercentageSupportThreshold: 6000000n,
      universalPercentageSupportThreshold: 9000000n,
      flatSupportThreshold: 2n,
      quorum: 1n,
      duration: 259200n,
      disableFastPathAccessForNewMembers: true,
      executionGracePeriod: 1209600n,
    });
  });

  it('should reject FAST voting mode', () => {
    expect(() =>
      proposeUpdateVotingSettings({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validSpaceId,
        daoSpaceAddress: validDaoSpaceAddress,
        votingSettings: validVotingSettings,
        votingMode: 'FAST' as never,
      }),
    ).toThrow('proposeUpdateVotingSettings only supports SLOW voting mode');
  });

  it('should validate voting settings before encoding calldata', () => {
    expect(() =>
      proposeUpdateVotingSettings({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validSpaceId,
        daoSpaceAddress: validDaoSpaceAddress,
        votingSettings: {
          ...validVotingSettings,
          universalPercentageSupportThreshold: 101,
        },
      }),
    ).toThrow('universalPercentageSupportThreshold must be between 0 and 100');

    expect(() =>
      proposeUpdateVotingSettings({
        authorSpaceId: validAuthorSpaceId,
        spaceId: validSpaceId,
        daoSpaceAddress: validDaoSpaceAddress,
        votingSettings: {
          ...validVotingSettings,
          quorum: -1,
        },
      }),
    ).toThrow('quorum must be a non-negative integer');
  });
});
