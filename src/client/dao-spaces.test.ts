import { decodeAbiParameters, decodeFunctionData, encodeAbiParameters } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { DaoSpaceAbi, SpaceRegistryAbi } from '../abis/index.js';
import { createGeoClient } from '../client.js';
import {
  bytes16ToBytes32LeftAligned,
  EMPTY_SIGNATURE,
  EMPTY_TOPIC,
  MEMBERSHIP_REQUESTED_ACTION,
  PROPOSAL_CREATED_ACTION,
  PROPOSAL_EXECUTED_ACTION,
  PROPOSAL_VOTED_ACTION,
  VOTE_OPTION_VALUES,
} from '../dao-space/constants.js';
import { defineGeoNetworkConfig } from '../networks.js';
import * as Ops from '../ops/index.js';

const CID = 'ipfs://bafkreigwfjixq5cm3s4youhshorkpqh3ykpviyv76c2ei6gaalujtlqz5i' as const;
const AUTHOR_ID = '5cade5757ecd41ae83481b22ffc2f94e';
const CALLER_SPACE_ID = '0x0eed5491b917cf58b33ac81255fe7ae9' as const;
const DAO_SPACE_ID = '0xabcdef12345678901234567890abcdef' as const;
const MEMBER_SPACE_ID = '0x22222222222222222222222222222222' as const;
const PROPOSAL_ID = '0x11111111111111111111111111111111' as const;
const DAO_SPACE_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const SPACE_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000001' as const;

function customNetwork() {
  return defineGeoNetworkConfig({
    id: 'LOCAL',
    name: 'Local Geo',
    apiOrigin: 'http://localhost:3000',
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

describe('geo DAO proposal client', () => {
  it('creates proposal calldata for supplied actions without uploading', () => {
    const geo = createGeoClient({ network: customNetwork() });
    const action = geo.daoSpaces.proposals.actions.addMember(DAO_SPACE_ADDRESS, MEMBER_SPACE_ID);

    const result = geo.daoSpaces.proposals.create({
      fromSpaceId: CALLER_SPACE_ID,
      daoSpaceId: DAO_SPACE_ID,
      proposalId: PROPOSAL_ID,
      votingMode: 'SLOW',
      actions: [action],
    });
    const decoded = decodeEnter(result.calldata);
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
      decoded.data,
    );

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
    const vote = geo.daoSpaces.proposals.vote({
      authorSpaceId: CALLER_SPACE_ID,
      spaceId: DAO_SPACE_ID,
      proposalId: PROPOSAL_ID,
      vote: 'NO',
    });
    const execute = geo.daoSpaces.proposals.execute({
      authorSpaceId: CALLER_SPACE_ID,
      spaceId: DAO_SPACE_ID,
      proposalId: PROPOSAL_ID,
    });
    const decodedVote = decodeEnter(vote.calldata);
    const decodedExecute = decodeEnter(execute.calldata);
    const [, voteOption] = decodeAbiParameters(
      [
        { type: 'bytes16', name: 'proposalId' },
        { type: 'uint8', name: 'voteOption' },
      ],
      decodedVote.data,
    );

    expect(vote.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(execute.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(decodedVote.action).toBe(PROPOSAL_VOTED_ACTION);
    expect(decodedVote.topic).toBe(bytes16ToBytes32LeftAligned(PROPOSAL_ID));
    expect(voteOption).toBe(VOTE_OPTION_VALUES.NO);
    expect(decodedExecute.action).toBe(PROPOSAL_EXECUTED_ACTION);
    expect(decodedExecute.topic).toBe(bytes16ToBytes32LeftAligned(PROPOSAL_ID));
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
    const [, , actions] = decodeAbiParameters(
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
      decoded.data,
    );
    const publishAction = actions[0];
    expect(publishAction).toBeDefined();
    if (!publishAction) {
      throw new Error('Expected a publish action');
    }
    const publishCall = decodeFunctionData({
      abi: DaoSpaceAbi,
      data: publishAction.data,
    });

    expect(result.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(result.cid).toBe(CID);
    expect(result.proposalId).toBe(PROPOSAL_ID);
    expect(publishAction.to).toBe(DAO_SPACE_ADDRESS);
    expect(publishCall.functionName).toBe('publish');
    expect(publishCall.args?.[1]).toBe(encodeAbiParameters([{ type: 'string' }], [CID]));
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/ipfs/upload-edit',
      expect.objectContaining({ method: 'POST' }),
    );
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
    const [, memberVotingMode, memberActions] = decodeAbiParameters(
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
      decodedAddMember.data,
    );
    const [, editorVotingMode] = decodeAbiParameters(
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
      decodeEnter(addEditor.calldata).data,
    );
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
    const action = geo.daoSpaces.proposals.actions.addMember(DAO_SPACE_ADDRESS, MEMBER_SPACE_ID);

    expect(() =>
      geo.daoSpaces.proposals.create({
        fromSpaceId: CALLER_SPACE_ID,
        daoSpaceId: DAO_SPACE_ID,
        proposalId: PROPOSAL_ID,
        votingMode: 'MAYBE' as never,
        actions: [action],
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
