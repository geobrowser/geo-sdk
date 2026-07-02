import { readFileSync } from 'node:fs';
import {
  createPublicClient,
  decodeAbiParameters,
  decodeFunctionData,
  encodeFunctionData,
  hexToString,
  http,
} from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { DaoSpaceAbi, DaoSpaceFactoryAbi, SpaceRegistryAbi } from '../abis/index.js';
import { createGeoClient } from '../client.js';
import {
  bytes16ToBytes32LeftAligned,
  EDITS_PUBLISHED_ACTION,
  EMPTY_TOPIC,
  PROPOSAL_CREATED_ACTION,
  PROPOSAL_VOTED_ACTION,
  VOTE_OPTION_VALUES,
  ZERO_ADDRESS,
} from '../dao-space/constants.js';
import { getCreateDaoSpaceCalldata } from '../encodings/get-create-dao-space-calldata.js';
import { defineGeoNetworkConfig } from '../networks.js';
import * as Ops from '../ops/index.js';

type ContractVotingSettings = {
  partialPercentageSupportThreshold: bigint;
  universalPercentageSupportThreshold: bigint;
  flatSupportThreshold: bigint;
  quorum: bigint;
  duration: bigint;
  disableFastPathAccessForNewMembers: boolean;
  executionGracePeriod: bigint;
};

type LocalGeobrowserDeployments = {
  spaceRegistry: `0x${string}`;
  daoSpaceFactory: `0x${string}`;
  daoSpace: `0x${string}`;
  owner?: `0x${string}`;
  rpcUrl?: string;
};

const deploymentsPath = process.env.GEO_LOCAL_GEOBROWSER_DEPLOYMENTS;
const localGeobrowserPath = process.env.GEO_LOCAL_GEOBROWSER_PATH;
const deployments = deploymentsPath
  ? (JSON.parse(readFileSync(deploymentsPath, 'utf8')) as LocalGeobrowserDeployments)
  : undefined;
const localRpcUrl = deployments?.rpcUrl ?? process.env.GEO_LOCAL_GEOBROWSER_RPC_URL;
const describeLocal = deployments ? describe : describe.skip;
const describeLocalRpc = deployments && localRpcUrl ? describe : describe.skip;
const describeLocalSource = localGeobrowserPath ? describe : describe.skip;

function readDeployments(): LocalGeobrowserDeployments {
  if (!deployments) {
    throw new Error('Set GEO_LOCAL_GEOBROWSER_DEPLOYMENTS to the local-geobrowser .deployments.json path.');
  }

  return deployments;
}

function readLocalContractSource(relativePath: string): string {
  if (!localGeobrowserPath) {
    throw new Error('Set GEO_LOCAL_GEOBROWSER_PATH to the local-geobrowser checkout path.');
  }

  return readFileSync(`${localGeobrowserPath}/contracts/src/${relativePath}`, 'utf8');
}

function localNetwork(deployments: LocalGeobrowserDeployments) {
  return defineGeoNetworkConfig({
    id: 'LOCAL_GEOBROWSER',
    name: 'Local Geobrowser',
    apiOrigin: process.env.GEO_LOCAL_GEOBROWSER_API_ORIGIN ?? 'http://localhost:3000',
    chain: {
      id: Number(process.env.GEO_LOCAL_GEOBROWSER_CHAIN_ID ?? 31337),
      name: 'Anvil',
      rpcUrl: deployments.rpcUrl ?? process.env.GEO_LOCAL_GEOBROWSER_RPC_URL,
    },
    contracts: {
      SPACE_REGISTRY_ADDRESS: deployments.spaceRegistry,
      DAO_SPACE_FACTORY_ADDRESS: deployments.daoSpaceFactory,
    },
  });
}

describeLocal('local-geobrowser contracts v2 calldata', () => {
  const editorSpaceId = '0x11111111111111111111111111111111' as const;
  const daoSpaceId = '0x22222222222222222222222222222222' as const;
  const proposalId = '0x33333333333333333333333333333333' as const;
  const cid = 'ipfs://bafkreigwfjixq5cm3s4youhshorkpqh3ykpviyv76c2ei6gaalujtlqz5i' as const;
  const authorId = '5cade5757ecd41ae83481b22ffc2f94e';
  const votingSettings = {
    partialPercentageSupportThreshold: 50,
    universalPercentageSupportThreshold: 90,
    flatSupportThreshold: 1,
    quorum: 1,
    durationInDays: 2,
    disableFastPathAccessForNewMembers: true,
    executionGracePeriodInDays: 14,
  };

  it('builds a custom network from local-geobrowser deployments', () => {
    const deployments = readDeployments();
    const network = localNetwork(deployments);

    expect(network.contracts?.SPACE_REGISTRY_ADDRESS).toBe(deployments.spaceRegistry);
    expect(network.contracts?.DAO_SPACE_FACTORY_ADDRESS).toBe(deployments.daoSpaceFactory);
  });

  it('decodes DAO creation calldata against the v2 factory ABI', () => {
    const calldata = getCreateDaoSpaceCalldata({
      votingSettings,
      initialEditorSpaceIds: [editorSpaceId],
      initialMemberSpaceIds: [editorSpaceId],
      initialEditsContentUri: cid,
      initialTopicId: '9f9e7d45-5b11-4d6b-9c5d-9567eeb3a001',
    });
    const decoded = decodeFunctionData({
      abi: DaoSpaceFactoryAbi,
      data: calldata,
    });
    const [settings, initialEditors, initialMembers, initialEditContentUri, initialEditMetadata, initialTopicId] =
      decoded.args as [
        ContractVotingSettings,
        `0x${string}`[],
        `0x${string}`[],
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
      ];

    expect(decoded.functionName).toBe('createDAOSpaceProxy');
    expect(decoded.args).toHaveLength(6);
    expect(settings.partialPercentageSupportThreshold).toBe(5000000n);
    expect(settings.universalPercentageSupportThreshold).toBe(9000000n);
    expect(settings.executionGracePeriod).toBe(1209600n);
    expect(initialEditors).toEqual([editorSpaceId]);
    expect(initialMembers).toEqual([editorSpaceId]);
    expect(hexToString(initialEditContentUri)).toBe(cid);
    expect(initialEditMetadata).toBe('0x');
    expect(initialTopicId).toBe('0x9f9e7d455b114d6b9c5d9567eeb3a001');
  });

  it('decodes DAO proposal and versioned vote calldata against local v2 ABIs', async () => {
    const deployments = readDeployments();
    const network = localNetwork(deployments);
    const geo = createGeoClient({ network });
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ cid })));
    const geoWithFetch = createGeoClient({ network, fetch });
    const updateSettings = geo.daoSpaces.proposeUpdateVotingSettings({
      authorSpaceId: editorSpaceId,
      spaceId: daoSpaceId,
      daoSpaceAddress: deployments.daoSpace,
      proposalId,
      votingSettings,
    });
    const decodedProposal = decodeFunctionData({
      abi: SpaceRegistryAbi,
      data: updateSettings.calldata,
    });
    const [, , proposalAction, proposalTopic, proposalData] = decodedProposal.args as [
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
      proposalData,
    );
    const decodedAction = decodeFunctionData({
      abi: DaoSpaceAbi,
      data: actions[0]?.data ?? '0x',
    });

    expect(updateSettings.to).toBe(deployments.spaceRegistry);
    expect(proposalAction).toBe(PROPOSAL_CREATED_ACTION);
    expect(proposalTopic).toBe(bytes16ToBytes32LeftAligned(proposalId));
    expect(votingMode).toBe(0);
    expect(actions[0]?.toAddress).toBe(ZERO_ADDRESS);
    expect(actions[0]?.toSpaceId).toBe(daoSpaceId);
    expect(decodedAction.functionName).toBe('updateVotingSettings');

    const { ops } = Ops.entities.create({ name: 'Local v2 edit entity' });
    const editProposal = await geoWithFetch.daoSpaces.proposeEdit({
      name: 'Local v2 edit',
      ops,
      author: authorId,
      callerSpaceId: editorSpaceId,
      daoSpaceId,
      proposalId,
    });
    const decodedEditProposal = decodeFunctionData({
      abi: SpaceRegistryAbi,
      data: editProposal.calldata,
    });
    const [, , editProposalAction, , editProposalData] = decodedEditProposal.args as [
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
    ];
    const [, editVotingMode, editActions] = decodeAbiParameters(
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
      editProposalData,
    );
    const decodedEditAction = decodeFunctionData({
      abi: DaoSpaceAbi,
      data: editActions[0]?.data ?? '0x',
    });
    const [editContentUri, editMetadata] = decodeAbiParameters(
      [
        { type: 'bytes', name: 'editsContentUri' },
        { type: 'bytes', name: 'editsMetadata' },
      ],
      decodedEditAction.args?.[2] as `0x${string}`,
    );

    expect(editProposalAction).toBe(PROPOSAL_CREATED_ACTION);
    expect(editVotingMode).toBe(1);
    expect(editActions[0]?.toAddress).toBe(ZERO_ADDRESS);
    expect(editActions[0]?.toSpaceId).toBe(daoSpaceId);
    expect(decodedEditAction.functionName).toBe('ping');
    expect(decodedEditAction.args?.[0]).toBe(EDITS_PUBLISHED_ACTION);
    expect(decodedEditAction.args?.[1]).toBe(EMPTY_TOPIC);
    expect(hexToString(editContentUri)).toBe(cid);
    expect(editMetadata).toBe('0x');

    const vote = geo.daoSpaces.voteProposal({
      authorSpaceId: editorSpaceId,
      spaceId: daoSpaceId,
      proposalId,
      versionId: 2,
      vote: 'YES',
    });
    const decodedVote = decodeFunctionData({
      abi: SpaceRegistryAbi,
      data: vote.calldata,
    });
    const [, , voteAction, voteTopic, voteData] = decodedVote.args as [
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
    ];
    const [decodedProposalId, versionId, voteOption] = decodeAbiParameters(
      [
        { type: 'bytes16', name: 'proposalId' },
        { type: 'uint8', name: 'versionId' },
        { type: 'uint8', name: 'voteOption' },
      ],
      voteData,
    );

    expect(vote.to).toBe(deployments.spaceRegistry);
    expect(voteAction).toBe(PROPOSAL_VOTED_ACTION);
    expect(voteTopic).toBe(bytes16ToBytes32LeftAligned(proposalId));
    expect(decodedProposalId).toBe(proposalId);
    expect(versionId).toBe(2);
    expect(voteOption).toBe(VOTE_OPTION_VALUES.YES);
  });
});

describeLocalSource('local-geobrowser contracts v2 source compatibility', () => {
  it('confirms edit publishing is a DAO ping fast-path action in local contracts', () => {
    const daoSpaceSource = readLocalContractSource('contracts/DAOSpace.sol');
    const actionsSource = readLocalContractSource('ActionsConstants.sol');

    expect(actionsSource).toContain("EDITS_PUBLISHED = keccak256('GOVERNANCE.EDITS_PUBLISHED')");
    expect(daoSpaceSource).toContain('$_.actionIsFastPathValid[IDAOSpace.ping.selector] = true;');
    expect(daoSpaceSource).not.toContain('actionIsFastPathValid[IDAOSpace.publish.selector]');
    expect(daoSpaceSource).toContain("_ping(ActionsConstants.EDITS_PUBLISHED, '', _publishEditsData)");
  });
});

describeLocalRpc('local-geobrowser deployed contracts v2 compatibility', () => {
  it('checks the deployed DAO fast-path selector allowlist', async () => {
    const deployments = readDeployments();
    if (!localRpcUrl) {
      throw new Error('Set GEO_LOCAL_GEOBROWSER_RPC_URL or deployments.rpcUrl for local-geobrowser RPC checks.');
    }

    const publicClient = createPublicClient({ transport: http(localRpcUrl) });
    const pingSelector = encodeFunctionData({
      abi: DaoSpaceAbi,
      functionName: 'ping',
      args: [EDITS_PUBLISHED_ACTION, EMPTY_TOPIC, '0x'],
    }).slice(0, 10) as `0x${string}`;
    const publishSelector = '0x6b47f61a' as const;

    await expect(
      publicClient.readContract({
        address: deployments.daoSpace,
        abi: DaoSpaceAbi,
        functionName: 'actionIsFastPathValid',
        args: [pingSelector],
      }),
    ).resolves.toBe(true);
    await expect(
      publicClient.readContract({
        address: deployments.daoSpace,
        abi: DaoSpaceAbi,
        functionName: 'actionIsFastPathValid',
        args: [publishSelector],
      }),
    ).resolves.toBe(false);
  });
});
