import { describe, expect, it } from 'vitest';

import {
  DaoSpaceAbi,
  DaoSpaceFactoryAbi,
  ProposalParametersV2Components,
  VotingSettingsV2Components,
} from './index.js';

const VOTING_SETTINGS_FIELD_NAMES = [
  'partialPercentageSupportThreshold',
  'universalPercentageSupportThreshold',
  'flatSupportThreshold',
  'quorum',
  'duration',
  'disableFastPathAccessForNewMembers',
  'executionGracePeriod',
];

const PROPOSAL_PARAMETERS_FIELD_NAMES = [
  'votingMode',
  'partialPercentageSupportThreshold',
  'universalPercentageSupportThreshold',
  'flatSupportThreshold',
  'quorum',
  'startDate',
  'lastDate',
  'executeBy',
];

function functionAbi(abi: readonly unknown[], name: string) {
  const item = abi.find(
    entry =>
      (entry as { type?: string; name?: string }).type === 'function' && (entry as { name?: string }).name === name,
  );
  if (!item) {
    throw new Error(`Missing ABI function ${name}`);
  }

  return item as {
    inputs?: Array<{ name?: string; components?: readonly { name: string; type: string }[] }>;
    outputs?: Array<{ name?: string; components?: readonly { name: string; type: string }[] }>;
  };
}

function componentNames(components: readonly { name: string }[]) {
  return components.map(component => component.name);
}

describe('contracts v2 DAO ABI fragments', () => {
  it('defines the v2 VotingSettings tuple components', () => {
    expect(componentNames(VotingSettingsV2Components)).toEqual(VOTING_SETTINGS_FIELD_NAMES);
    expect(VotingSettingsV2Components.at(5)?.type).toBe('bool');
  });

  it('defines the v2 ProposalParameters tuple components', () => {
    expect(componentNames(ProposalParametersV2Components)).toEqual(PROPOSAL_PARAMETERS_FIELD_NAMES);
  });

  it('exposes createDAOSpaceProxy with six inputs and v2 voting settings', () => {
    const createDao = functionAbi(DaoSpaceFactoryAbi, 'createDAOSpaceProxy');

    expect(createDao.inputs?.map(input => input.name)).toEqual([
      '_votingSettings',
      '_initialEditors',
      '_initialMembers',
      '_initialEditsContentUri',
      '_initialEditsMetadata',
      '_initialTopicId',
    ]);
    expect(componentNames(createDao.inputs?.[0]?.components ?? [])).toEqual(VOTING_SETTINGS_FIELD_NAMES);
  });

  it('exposes DAO voting settings reads and writes with v2 settings', () => {
    const updateVotingSettings = functionAbi(DaoSpaceAbi, 'updateVotingSettings');
    const votingSettings = functionAbi(DaoSpaceAbi, 'votingSettings');

    expect(componentNames(updateVotingSettings.inputs?.[0]?.components ?? [])).toEqual(VOTING_SETTINGS_FIELD_NAMES);
    expect(componentNames(votingSettings.outputs?.[0]?.components ?? [])).toEqual(VOTING_SETTINGS_FIELD_NAMES);
  });

  it('exposes version-aware proposal reads with v2 proposal parameters', () => {
    const getLatestProposalInformation = functionAbi(DaoSpaceAbi, 'getLatestProposalInformation');
    const getProposalInformation = functionAbi(DaoSpaceAbi, 'getProposalInformation');

    expect(componentNames(getLatestProposalInformation.outputs?.[2]?.components ?? [])).toEqual(
      PROPOSAL_PARAMETERS_FIELD_NAMES,
    );
    expect(componentNames(getProposalInformation.outputs?.[2]?.components ?? [])).toEqual(
      PROPOSAL_PARAMETERS_FIELD_NAMES,
    );
    expect(functionAbi(DaoSpaceAbi, 'latestProposalVersion')).toBeDefined();
    expect(functionAbi(DaoSpaceAbi, 'MINIMUM_EXECUTION_GRACE_PERIOD')).toBeDefined();
  });
});
