import { decodeAbiParameters, decodeFunctionData } from 'viem';
import { describe, expect, it } from 'vitest';
import { TESTNET } from '../../contracts.js';
import { SpaceRegistryAbi } from '../abis/index.js';
import { downvoteEntity, upvoteEntity, withdrawEntityVote } from './entity-vote.js';

const AUTHOR_SPACE_ID = '0eed5491b917cf58b33ac81255fe7ae9';
const SPACE_ID = 'abcdef12345678901234567890abcdef';
const ENTITY_ID = '11111111111111111111111111111111';

const UPVOTED_ACTION = '0x1fc04a8d9387c7bd1199a2a77c8e531a7a7b11991df5dcc8c9acb6abcb481725';
const DOWNVOTED_ACTION = '0xde8b897ce7cc541dacb388d5aabb3dc0fb7856920284f41582c15b5fc31a8662';
const UNVOTED_ACTION = '0x3bd4c337382f79aa5007a91169bb57723b5dd59e6b4bb60d20362bcc0d9d998b';

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
    data,
    signature,
    version,
    authorSpaceId,
    spaceId,
  };
}

describe('entity vote helpers', () => {
  it('returns the Space Registry address and calldata', () => {
    const result = upvoteEntity({
      authorSpaceId: AUTHOR_SPACE_ID,
      spaceId: SPACE_ID,
      entityId: ENTITY_ID,
    });

    expect(result.to).toBe(TESTNET.SPACE_REGISTRY_ADDRESS);
    expect(result.calldata).toBeTypeOf('string');
    expect(result.calldata.startsWith('0x')).toBe(true);
  });

  it('encodes an entity upvote action', () => {
    const result = upvoteEntity({
      authorSpaceId: AUTHOR_SPACE_ID,
      spaceId: SPACE_ID,
      entityId: ENTITY_ID,
    });

    const decoded = decodeEntityVote(result.calldata);

    expect(decoded.fromSpaceId).toBe(`0x${AUTHOR_SPACE_ID}`);
    expect(decoded.toSpaceId).toBe(`0x${SPACE_ID}`);
    expect(decoded.action).toBe(UPVOTED_ACTION);
    expect(decoded.topic).toBe(`0x00000000${ENTITY_ID}${'0'.repeat(24)}`);
    expect(decoded.signature).toBe('0x');
    expect(decoded.version).toBe(0);
    expect(decoded.authorSpaceId).toBe(`0x${AUTHOR_SPACE_ID}`);
    expect(decoded.spaceId).toBe(`0x${SPACE_ID}`);
  });

  it('encodes an entity downvote action', () => {
    const result = downvoteEntity({
      authorSpaceId: AUTHOR_SPACE_ID,
      spaceId: SPACE_ID,
      entityId: ENTITY_ID,
    });

    const decoded = decodeEntityVote(result.calldata);

    expect(decoded.action).toBe(DOWNVOTED_ACTION);
  });

  it('encodes an entity vote withdrawal action', () => {
    const result = withdrawEntityVote({
      authorSpaceId: AUTHOR_SPACE_ID,
      spaceId: SPACE_ID,
      entityId: ENTITY_ID,
    });

    const decoded = decodeEntityVote(result.calldata);

    expect(decoded.action).toBe(UNVOTED_ACTION);
  });

  it('accepts UUIDs with dashes', () => {
    const result = upvoteEntity({
      authorSpaceId: '0eed5491-b917-cf58-b33a-c81255fe7ae9',
      spaceId: 'abcdef12-3456-7890-1234-567890abcdef',
      entityId: '11111111-1111-1111-1111-111111111111',
    });

    const decoded = decodeEntityVote(result.calldata);

    expect(decoded.fromSpaceId).toBe(`0x${AUTHOR_SPACE_ID}`);
    expect(decoded.toSpaceId).toBe(`0x${SPACE_ID}`);
    expect(decoded.topic).toBe(`0x00000000${ENTITY_ID}${'0'.repeat(24)}`);
  });

  it('accepts IDs with 0x prefixes', () => {
    const withPrefix = upvoteEntity({
      authorSpaceId: `0x${AUTHOR_SPACE_ID}`,
      spaceId: `0x${SPACE_ID}`,
      entityId: `0x${ENTITY_ID}`,
    });
    const withoutPrefix = upvoteEntity({
      authorSpaceId: AUTHOR_SPACE_ID,
      spaceId: SPACE_ID,
      entityId: ENTITY_ID,
    });

    expect(withPrefix.calldata).toBe(withoutPrefix.calldata);
  });

  it('throws for an invalid authorSpaceId', () => {
    expect(() =>
      upvoteEntity({
        authorSpaceId: 'invalid',
        spaceId: SPACE_ID,
        entityId: ENTITY_ID,
      }),
    ).toThrow('Invalid id: "invalid" for `authorSpaceId` in entity vote');
  });

  it('throws for an invalid spaceId', () => {
    expect(() =>
      upvoteEntity({
        authorSpaceId: AUTHOR_SPACE_ID,
        spaceId: 'invalid',
        entityId: ENTITY_ID,
      }),
    ).toThrow('Invalid id: "invalid" for `spaceId` in entity vote');
  });

  it('throws for an invalid entityId', () => {
    expect(() =>
      upvoteEntity({
        authorSpaceId: AUTHOR_SPACE_ID,
        spaceId: SPACE_ID,
        entityId: 'invalid',
      }),
    ).toThrow('Invalid id: "invalid" for `entityId` in entity vote');
  });
});
