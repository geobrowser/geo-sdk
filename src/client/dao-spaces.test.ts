import { createPublicClient, decodeAbiParameters, decodeFunctionData, hexToString } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DaoSpaceAbi, SpaceRegistryAbi } from '../abis/index.js';
import { createGeoClient } from '../client.js';
import {
  bytes16ToBytes32LeftAligned,
  EDITS_PUBLISHED_ACTION,
  EMPTY_SIGNATURE,
  EMPTY_TOPIC,
  MEMBERSHIP_REQUESTED_ACTION,
  PROPOSAL_CREATED_ACTION,
  PROPOSAL_EXECUTED_ACTION,
  PROPOSAL_UPDATED_ACTION,
  PROPOSAL_VOTED_ACTION,
  VOTE_OPTION_VALUES,
} from '../dao-space/constants.js';
import { defineGeoNetworkConfig } from '../networks.js';
import * as Ops from '../ops/index.js';

vi.mock('viem', async importOriginal => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(),
  };
});

const CID = 'ipfs://bafkreigwfjixq5cm3s4youhshorkpqh3ykpviyv76c2ei6gaalujtlqz5i' as const;
const AUTHOR_ID = '5cade5757ecd41ae83481b22ffc2f94e';
const CALLER_SPACE_ID = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
const DAO_SPACE_ID = '0xabcdef12345678901234567890abcdef' as const;
const MEMBER_SPACE_ID = '0x22222222222222222222222222222222' as const;
const PROPOSAL_ID = '0x11111111111111111111111111111111' as const;
const DAO_SPACE_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const SPACE_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000001' as const;
const VALID_VOTING_SETTINGS = {
  partialPercentageSupportThreshold: 60,
  universalPercentageSupportThreshold: 90,
  flatSupportThreshold: 2,
  quorum: 1,
  durationInDays: 3,
  disableFastPathAccessForNewMembers: true,
  executionGracePeriodInDays: 14,
} as const;

function customNetwork({ rpcUrl }: { rpcUrl?: string } = {}) {
  return defineGeoNetworkConfig({
    id: 'LOCAL',
    name: 'Local Geo',
    apiOrigin: 'http://localhost:3000',
    ...(rpcUrl
      ? {
          chain: {
            id: 31337,
            name: 'Anvil',
            rpcUrl,
          },
        }
      : {}),
    contracts: {
      SPACE_REGISTRY_ADDRESS,
    },
  });
}

function mockUploadFetch() {
  return vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ cid: CID })));
}

function decodeEnter(calldata: `0x${string}`) {
  const decoded = decodeFunctionData({
    abi: SpaceRegistryAbi,
    data: calldata,
  });
  expect(decoded.functionName).toBe('enter');

  const [fromSpaceId, toSpaceId, action, topic, data, signature] = decoded.args as [
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
  ];

  return {
    fromSpaceId,
    toSpaceId,
    action,
    topic,
    data,
    signature,
  };
}

function decodeProposalPayload(data: `0x${string}`) {
  const [proposalId, votingMode, actions] = decodeAbiParameters(
    [
      { type: 'bytes16', name: 'proposalId' },
      { type: 'uint8', name: 'votingMode' },
      {
        type: 'tuple[]',
        name: 'actions',
        components: [
          { type: 'address', name: 'to' },
          { type: 'uint256', name: 'value' },
          { type: 'bytes', name: 'data' },
        ],
      },
    ],
    data,
  );

  return {
    proposalId,
    votingMode,
    actions,
  };
}

describe('geo DAO proposal client', () => {
  beforeEach(() => {
    vi.mocked(createPublicClient).mockClear();
  });

  it('creates member proposal calldata without uploading', () => {
    const geo = createGeoClient({ network: customNetwork() });

    const result = geo.daoSpaces.proposeAddMember({
      authorSpaceId: CALLER_SPACE_ID,
      spaceId: DAO_SPACE_ID,
      daoSpaceAddress: DAO_SPACE_ADDRESS,
      newMemberSpaceId: MEMBER_SPACE_ID,
      proposalId: PROPOSAL_ID,
      votingMode: 'SLOW',
    });
    const decoded = decodeEnter(result.calldata);
    const { proposalId, votingMode, actions } = decodeProposalPayload(decoded.data);

    expect(result.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(result.proposalId).toBe(PROPOSAL_ID);
    expect(decoded.fromSpaceId).toBe(CALLER_SPACE_ID);
    expect(decoded.toSpaceId).toBe(DAO_SPACE_ID);
    expect(decoded.action).toBe(PROPOSAL_CREATED_ACTION);
    expect(decoded.topic).toBe(bytes16ToBytes32LeftAligned(PROPOSAL_ID));
    expect(decoded.signature).toBe(EMPTY_SIGNATURE);
    expect(proposalId).toBe(PROPOSAL_ID);
    expect(votingMode).toBe(0);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.to).toBe(DAO_SPACE_ADDRESS);
    expect(actions[0]?.value).toBe(0n);
  });

  it('encodes proposal vote and execute calldata for the configured registry', () => {
    const geo = createGeoClient({ network: customNetwork() });
    const vote = geo.daoSpaces.voteProposal({
      authorSpaceId: CALLER_SPACE_ID,
      spaceId: DAO_SPACE_ID,
      proposalId: PROPOSAL_ID,
      versionId: 2,
      vote: 'NO',
    });
    const execute = geo.daoSpaces.executeProposal({
      authorSpaceId: CALLER_SPACE_ID,
      spaceId: DAO_SPACE_ID,
      proposalId: PROPOSAL_ID,
    });
    const decodedVote = decodeEnter(vote.calldata);
    const decodedExecute = decodeEnter(execute.calldata);
    const [proposalId, versionId, voteOption] = decodeAbiParameters(
      [
        { type: 'bytes16', name: 'proposalId' },
        { type: 'uint8', name: 'versionId' },
        { type: 'uint8', name: 'voteOption' },
      ],
      decodedVote.data,
    );

    expect(vote.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(execute.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(decodedVote.action).toBe(PROPOSAL_VOTED_ACTION);
    expect(decodedVote.topic).toBe(bytes16ToBytes32LeftAligned(PROPOSAL_ID));
    expect(proposalId).toBe(PROPOSAL_ID);
    expect(versionId).toBe(2);
    expect(voteOption).toBe(VOTE_OPTION_VALUES.NO);
    expect(decodedExecute.action).toBe(PROPOSAL_EXECUTED_ACTION);
    expect(decodedExecute.topic).toBe(bytes16ToBytes32LeftAligned(PROPOSAL_ID));
  });

  it('defaults proposal votes to version 1', () => {
    const geo = createGeoClient({ network: customNetwork() });
    const vote = geo.daoSpaces.voteProposal({
      authorSpaceId: CALLER_SPACE_ID,
      spaceId: DAO_SPACE_ID,
      proposalId: PROPOSAL_ID,
      vote: 'YES',
    });
    const decodedVote = decodeEnter(vote.calldata);
    const [, versionId] = decodeAbiParameters(
      [
        { type: 'bytes16', name: 'proposalId' },
        { type: 'uint8', name: 'versionId' },
        { type: 'uint8', name: 'voteOption' },
      ],
      decodedVote.data,
    );

    expect(versionId).toBe(1);
  });

  it('publishes an edit and wraps it as a DAO proposal action', async () => {
    const fetch = mockUploadFetch();
    const geo = createGeoClient({ network: customNetwork(), fetch });
    const { ops } = Ops.entities.create({ name: 'Test Entity' });

    const result = await geo.daoSpaces.proposeEdit({
      name: 'Test Edit',
      ops,
      author: AUTHOR_ID,
      daoSpaceAddress: DAO_SPACE_ADDRESS,
      callerSpaceId: CALLER_SPACE_ID,
      daoSpaceId: DAO_SPACE_ID,
      proposalId: PROPOSAL_ID,
    });
    const decoded = decodeEnter(result.calldata);
    const { actions } = decodeProposalPayload(decoded.data);
    const editAction = actions[0];
    expect(editAction).toBeDefined();
    if (!editAction) {
      throw new Error('Expected an edit action');
    }
    const editCall = decodeFunctionData({
      abi: DaoSpaceAbi,
      data: editAction.data,
    });
    const [editsContentUri, editsMetadata] = decodeAbiParameters(
      [
        { type: 'bytes', name: 'editsContentUri' },
        { type: 'bytes', name: 'editsMetadata' },
      ],
      editCall.args?.[2] as `0x${string}`,
    );

    expect(result.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(result.cid).toBe(CID);
    expect(result.proposalId).toBe(PROPOSAL_ID);
    expect(result.versionId).toBe(1);
    expect(decoded.action).toBe(PROPOSAL_CREATED_ACTION);
    expect(editAction.to).toBe(DAO_SPACE_ADDRESS);
    expect(editCall.functionName).toBe('ping');
    expect(editCall.args?.[0]).toBe(EDITS_PUBLISHED_ACTION);
    expect(editCall.args?.[1]).toBe(EMPTY_TOPIC);
    expect(hexToString(editsContentUri)).toBe(CID);
    expect(editsMetadata).toBe('0x');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/ipfs/upload-edit',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('publishes an edit as a new version of an existing DAO proposal', async () => {
    const fetch = mockUploadFetch();
    const geo = createGeoClient({ network: customNetwork(), fetch });
    const { ops } = Ops.entities.create({ name: 'Updated Entity' });

    const result = await geo.daoSpaces.proposeEdit({
      name: 'Update Proposal Version',
      ops,
      author: AUTHOR_ID,
      daoSpaceAddress: DAO_SPACE_ADDRESS,
      callerSpaceId: CALLER_SPACE_ID,
      daoSpaceId: DAO_SPACE_ID,
      proposalId: PROPOSAL_ID,
      updateProposal: true,
      versionId: 2,
    });
    const decoded = decodeEnter(result.calldata);
    const { proposalId, actions } = decodeProposalPayload(decoded.data);

    expect(result.proposalId).toBe(PROPOSAL_ID);
    expect(result.versionId).toBe(2);
    expect(decoded.action).toBe(PROPOSAL_UPDATED_ACTION);
    expect(decoded.topic).toBe(bytes16ToBytes32LeftAligned(PROPOSAL_ID));
    expect(proposalId).toBe(PROPOSAL_ID);
    expect(actions[0]?.to).toBe(DAO_SPACE_ADDRESS);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('requires a proposal version before uploading when updating without RPC config', async () => {
    const fetch = mockUploadFetch();
    const geo = createGeoClient({ network: customNetwork(), fetch });
    const { ops } = Ops.entities.create({ name: 'Updated Entity' });

    await expect(
      geo.daoSpaces.proposeEdit({
        name: 'Update Proposal Version',
        ops,
        author: AUTHOR_ID,
        daoSpaceAddress: DAO_SPACE_ADDRESS,
        callerSpaceId: CALLER_SPACE_ID,
        daoSpaceId: DAO_SPACE_ID,
        proposalId: PROPOSAL_ID,
        updateProposal: true,
      }),
    ).rejects.toThrow('versionId is required when updateProposal is true and the network has no RPC URL');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects proposal version IDs for new proposals before uploading', async () => {
    const fetch = mockUploadFetch();
    const geo = createGeoClient({ network: customNetwork(), fetch });
    const { ops } = Ops.entities.create({ name: 'Test Entity' });

    await expect(
      geo.daoSpaces.proposeEdit({
        name: 'Test Edit',
        ops,
        author: AUTHOR_ID,
        daoSpaceAddress: DAO_SPACE_ADDRESS,
        callerSpaceId: CALLER_SPACE_ID,
        daoSpaceId: DAO_SPACE_ID,
        proposalId: PROPOSAL_ID,
        versionId: 2,
      }),
    ).rejects.toThrow('versionId can only be provided when updateProposal is true');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('resolves the next proposal version from RPC before uploading', async () => {
    const readContract = vi.fn().mockResolvedValue(1);
    vi.mocked(createPublicClient).mockReturnValueOnce({ readContract } as never);
    const fetch = mockUploadFetch();
    const geo = createGeoClient({ network: customNetwork({ rpcUrl: 'http://localhost:8545' }), fetch });
    const { ops } = Ops.entities.create({ name: 'Updated Entity' });

    const result = await geo.daoSpaces.proposeEdit({
      name: 'Update Proposal Version',
      ops,
      author: AUTHOR_ID,
      daoSpaceAddress: DAO_SPACE_ADDRESS,
      callerSpaceId: CALLER_SPACE_ID,
      daoSpaceId: DAO_SPACE_ID,
      proposalId: PROPOSAL_ID,
      updateProposal: true,
    });

    expect(result.versionId).toBe(2);
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: DAO_SPACE_ADDRESS,
        functionName: 'latestProposalVersion',
        args: [PROPOSAL_ID],
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects mismatched explicit proposal versions before uploading when RPC is configured', async () => {
    const readContract = vi.fn().mockResolvedValue(1);
    vi.mocked(createPublicClient).mockReturnValueOnce({ readContract } as never);
    const fetch = mockUploadFetch();
    const geo = createGeoClient({ network: customNetwork({ rpcUrl: 'http://localhost:8545' }), fetch });
    const { ops } = Ops.entities.create({ name: 'Updated Entity' });

    await expect(
      geo.daoSpaces.proposeEdit({
        name: 'Update Proposal Version',
        ops,
        author: AUTHOR_ID,
        daoSpaceAddress: DAO_SPACE_ADDRESS,
        callerSpaceId: CALLER_SPACE_ID,
        daoSpaceId: DAO_SPACE_ID,
        proposalId: PROPOSAL_ID,
        updateProposal: true,
        versionId: 3,
      }),
    ).rejects.toThrow('versionId 3 does not match next on-chain proposal version 2');
    expect(readContract).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates member and editor role proposals from daoSpaces', () => {
    const geo = createGeoClient({ network: customNetwork() });

    const addMember = geo.daoSpaces.proposeAddMember({
      authorSpaceId: CALLER_SPACE_ID,
      spaceId: DAO_SPACE_ID,
      daoSpaceAddress: DAO_SPACE_ADDRESS,
      newMemberSpaceId: MEMBER_SPACE_ID,
      proposalId: PROPOSAL_ID,
    });
    const addEditor = geo.daoSpaces.proposeAddEditor({
      authorSpaceId: CALLER_SPACE_ID,
      spaceId: DAO_SPACE_ID,
      daoSpaceAddress: DAO_SPACE_ADDRESS,
      newEditorSpaceId: MEMBER_SPACE_ID,
      proposalId: PROPOSAL_ID,
    });

    const decodedAddMember = decodeEnter(addMember.calldata);
    const { votingMode: memberVotingMode, actions: memberActions } = decodeProposalPayload(decodedAddMember.data);
    const { votingMode: editorVotingMode } = decodeProposalPayload(decodeEnter(addEditor.calldata).data);
    const addMemberAction = memberActions[0];
    expect(addMemberAction).toBeDefined();
    if (!addMemberAction) {
      throw new Error('Expected addMember action');
    }
    const addMemberCall = decodeFunctionData({
      abi: DaoSpaceAbi,
      data: addMemberAction.data,
    });

    expect(addMember.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(addMemberAction.to).toBe(DAO_SPACE_ADDRESS);
    expect(addMemberCall.functionName).toBe('addMember');
    expect(addMemberCall.args?.[0]).toBe(MEMBER_SPACE_ID);
    expect(memberVotingMode).toBe(0);
    expect(editorVotingMode).toBe(0);
  });

  it('creates update-voting-settings proposals from daoSpaces', () => {
    const geo = createGeoClient({ network: customNetwork() });

    const result = geo.daoSpaces.proposeUpdateVotingSettings({
      authorSpaceId: CALLER_SPACE_ID,
      spaceId: DAO_SPACE_ID,
      daoSpaceAddress: DAO_SPACE_ADDRESS,
      proposalId: PROPOSAL_ID,
      votingSettings: VALID_VOTING_SETTINGS,
    });
    const decoded = decodeEnter(result.calldata);
    const { votingMode, actions } = decodeProposalPayload(decoded.data);
    const action = actions[0];
    expect(action).toBeDefined();
    if (!action) {
      throw new Error('Expected updateVotingSettings action');
    }
    const updateSettingsCall = decodeFunctionData({
      abi: DaoSpaceAbi,
      data: action.data,
    });

    expect(result.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(decoded.action).toBe(PROPOSAL_CREATED_ACTION);
    expect(votingMode).toBe(0);
    expect(action.to).toBe(DAO_SPACE_ADDRESS);
    expect(updateSettingsCall.functionName).toBe('updateVotingSettings');
    expect(updateSettingsCall.args?.[0]).toEqual({
      partialPercentageSupportThreshold: 6000000n,
      universalPercentageSupportThreshold: 9000000n,
      flatSupportThreshold: 2n,
      quorum: 1n,
      duration: 259200n,
      disableFastPathAccessForNewMembers: true,
      executionGracePeriod: 1209600n,
    });
  });

  it('validates voting settings before building update-voting-settings proposals', () => {
    const geo = createGeoClient({ network: customNetwork() });

    expect(() =>
      geo.daoSpaces.proposeUpdateVotingSettings({
        authorSpaceId: CALLER_SPACE_ID,
        spaceId: DAO_SPACE_ID,
        daoSpaceAddress: DAO_SPACE_ADDRESS,
        proposalId: PROPOSAL_ID,
        votingSettings: {
          ...VALID_VOTING_SETTINGS,
          partialPercentageSupportThreshold: 101,
        },
      }),
    ).toThrow('partialPercentageSupportThreshold must be between 0 and 100');

    expect(() =>
      geo.daoSpaces.proposeUpdateVotingSettings({
        authorSpaceId: CALLER_SPACE_ID,
        spaceId: DAO_SPACE_ID,
        daoSpaceAddress: DAO_SPACE_ADDRESS,
        proposalId: PROPOSAL_ID,
        votingSettings: {
          ...VALID_VOTING_SETTINGS,
          flatSupportThreshold: -1,
        },
      }),
    ).toThrow('flatSupportThreshold must be a non-negative integer');

    expect(() =>
      geo.daoSpaces.proposeUpdateVotingSettings({
        authorSpaceId: CALLER_SPACE_ID,
        spaceId: DAO_SPACE_ID,
        daoSpaceAddress: DAO_SPACE_ADDRESS,
        proposalId: PROPOSAL_ID,
        votingSettings: {
          ...VALID_VOTING_SETTINGS,
          durationInDays: 0,
        },
      }),
    ).toThrow('durationInDays must be at least');
  });

  it('restricts editor role proposals to SLOW voting', () => {
    const geo = createGeoClient({ network: customNetwork() });

    expect(() =>
      geo.daoSpaces.proposeAddEditor({
        authorSpaceId: CALLER_SPACE_ID,
        spaceId: DAO_SPACE_ID,
        daoSpaceAddress: DAO_SPACE_ADDRESS,
        newEditorSpaceId: MEMBER_SPACE_ID,
        votingMode: 'FAST' as never,
      }),
    ).toThrow('proposeAddEditor only supports SLOW voting mode');
  });

  it('requires daoSpaceAddress for DAO role proposal actions', () => {
    const geo = createGeoClient({ network: customNetwork() });

    expect(() =>
      geo.daoSpaces.proposeAddMember({
        authorSpaceId: CALLER_SPACE_ID,
        spaceId: DAO_SPACE_ID,
        newMemberSpaceId: MEMBER_SPACE_ID,
        proposalId: PROPOSAL_ID,
      } as never),
    ).toThrow('daoSpaceAddress is required');
  });

  it('rejects unknown voting modes at runtime', () => {
    const geo = createGeoClient({ network: customNetwork() });

    expect(() =>
      geo.daoSpaces.proposeAddMember({
        authorSpaceId: CALLER_SPACE_ID,
        spaceId: DAO_SPACE_ID,
        daoSpaceAddress: DAO_SPACE_ADDRESS,
        newMemberSpaceId: MEMBER_SPACE_ID,
        proposalId: PROPOSAL_ID,
        votingMode: 'MAYBE' as never,
      }),
    ).toThrow('votingMode must be "FAST" or "SLOW"');
  });

  it('creates membership request calldata from daoSpaces', () => {
    const geo = createGeoClient({ network: customNetwork() });

    const result = geo.daoSpaces.proposeRequestMembership({
      authorSpaceId: CALLER_SPACE_ID,
      spaceId: DAO_SPACE_ID,
      proposalId: PROPOSAL_ID,
    });
    const decoded = decodeEnter(result.calldata);
    const [proposalId, newMemberSpaceId] = decodeAbiParameters(
      [
        { type: 'bytes16', name: 'proposalId' },
        { type: 'bytes16', name: 'newMemberSpaceId' },
      ],
      decoded.data,
    );

    expect(result.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(result.proposalId).toBe(PROPOSAL_ID);
    expect(decoded.action).toBe(MEMBERSHIP_REQUESTED_ACTION);
    expect(decoded.topic).toBe(EMPTY_TOPIC);
    expect(proposalId).toBe(PROPOSAL_ID);
    expect(newMemberSpaceId).toBe(CALLER_SPACE_ID);
  });
});
