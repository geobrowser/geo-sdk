import { decodeAbiParameters, decodeFunctionData } from 'viem';
import { describe, expect, it } from 'vitest';
import { SpaceRegistryAbi } from '../abis/index.js';
import { defineGeoNetwork } from '../networks.js';
import type { GeoClientContext } from './context.js';
import {
  downvote,
  encodeDownvoteEntityCalldata,
  encodeUpvoteEntityCalldata,
  encodeWithdrawEntityVoteCalldata,
  upvote,
  withdraw,
} from './entity-votes.js';

const AUTHOR_SPACE_ID = '0eed5491b917cf58b33ac81255fe7ae9';
const SPACE_ID = 'abcdef12345678901234567890abcdef';
const ENTITY_ID = '11111111111111111111111111111111';
const SPACE_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000001' as const;
const UPVOTED_ACTION = '0x1fc04a8d9387c7bd1199a2a77c8e531a7a7b11991df5dcc8c9acb6abcb481725';
const DOWNVOTED_ACTION = '0xde8b897ce7cc541dacb388d5aabb3dc0fb7856920284f41582c15b5fc31a8662';
const UNVOTED_ACTION = '0x3bd4c337382f79aa5007a91169bb57723b5dd59e6b4bb60d20362bcc0d9d998b';

function testContext(): GeoClientContext {
  return {
    network: defineGeoNetwork({
      id: 'LOCAL',
      name: 'Local Geo',
      apiOrigin: 'http://localhost:3000',
      contracts: {
        SPACE_REGISTRY_ADDRESS,
      },
    }),
  };
}

function decodeEntityVote(calldata: `0x${string}`) {
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
  const [version, authorSpaceId, spaceId] = decodeAbiParameters(
    [{ type: 'uint16' }, { type: 'bytes16' }, { type: 'bytes16' }],
    data,
  );

  return {
    fromSpaceId,
    toSpaceId,
    action,
    topic,
    signature,
    version,
    authorSpaceId,
    spaceId,
  };
}

describe('client entity vote helpers', () => {
  it('encodes an upvote without context', () => {
    const result = encodeUpvoteEntityCalldata({
      authorSpaceId: AUTHOR_SPACE_ID,
      spaceId: SPACE_ID,
      entityId: ENTITY_ID,
      spaceRegistryAddress: SPACE_REGISTRY_ADDRESS,
    });

    const decoded = decodeEntityVote(result.calldata);

    expect(result.to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(decoded.fromSpaceId).toBe(`0x${AUTHOR_SPACE_ID}`);
    expect(decoded.toSpaceId).toBe(`0x${SPACE_ID}`);
    expect(decoded.action).toBe(UPVOTED_ACTION);
    expect(decoded.topic).toBe(`0x00000000${ENTITY_ID}${'0'.repeat(24)}`);
    expect(decoded.signature).toBe('0x');
    expect(decoded.version).toBe(0);
    expect(decoded.authorSpaceId).toBe(`0x${AUTHOR_SPACE_ID}`);
    expect(decoded.spaceId).toBe(`0x${SPACE_ID}`);
  });

  it('encodes downvote and withdraw variants without context', () => {
    const base = {
      authorSpaceId: AUTHOR_SPACE_ID,
      spaceId: SPACE_ID,
      entityId: ENTITY_ID,
      spaceRegistryAddress: SPACE_REGISTRY_ADDRESS,
    };

    expect(decodeEntityVote(encodeDownvoteEntityCalldata(base).calldata).action).toBe(DOWNVOTED_ACTION);
    expect(decodeEntityVote(encodeWithdrawEntityVoteCalldata(base).calldata).action).toBe(UNVOTED_ACTION);
  });

  it('uses the configured registry address for context-aware helpers', () => {
    const context = testContext();
    const params = {
      authorSpaceId: AUTHOR_SPACE_ID,
      spaceId: SPACE_ID,
      entityId: ENTITY_ID,
    };

    expect(upvote(context, params).to).toBe(SPACE_REGISTRY_ADDRESS);
    expect(decodeEntityVote(downvote(context, params).calldata).action).toBe(DOWNVOTED_ACTION);
    expect(decodeEntityVote(withdraw(context, params).calldata).action).toBe(UNVOTED_ACTION);
  });

  it('throws for invalid ids before encoding', () => {
    expect(() =>
      encodeUpvoteEntityCalldata({
        authorSpaceId: 'invalid',
        spaceId: SPACE_ID,
        entityId: ENTITY_ID,
        spaceRegistryAddress: SPACE_REGISTRY_ADDRESS,
      }),
    ).toThrow('Invalid id: "invalid" for `authorSpaceId` in entity vote');
  });
});
