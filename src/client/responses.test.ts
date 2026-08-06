import { decodeAbiParameters, decodeFunctionData, keccak256, toHex } from 'viem';
import { describe, expect, it } from 'vitest';
import { SpaceRegistryAbi } from '../abis/index.js';
import { defineGeoNetworkConfig } from '../networks.js';
import type { GeoClientContext } from './context.js';
import {
  agree,
  disagree,
  dispute,
  downvote,
  RESPONSE_ACTIONS,
  unagree,
  unverify,
  unvote,
  upvote,
  verify,
} from './responses.js';

const AUTHOR_SPACE_ID = '0eed5491b917cf58b33ac81255fe7ae9';
const SPACE_ID = 'abcdef12345678901234567890abcdef';
const ENTITY_ID = '11111111111111111111111111111111';
const SPACE_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000001' as const;

const EXPECTED_ACTIONS = {
  upvote: {
    name: 'PERMISSIONLESS.UPVOTED',
    hash: '0x1fc04a8d9387c7bd1199a2a77c8e531a7a7b11991df5dcc8c9acb6abcb481725',
  },
  downvote: {
    name: 'PERMISSIONLESS.DOWNVOTED',
    hash: '0xde8b897ce7cc541dacb388d5aabb3dc0fb7856920284f41582c15b5fc31a8662',
  },
  unvote: {
    name: 'PERMISSIONLESS.UNVOTED',
    hash: '0x3bd4c337382f79aa5007a91169bb57723b5dd59e6b4bb60d20362bcc0d9d998b',
  },
  agree: {
    name: 'PERMISSIONLESS.AGREED',
    hash: '0xcc1f104e089fb96ad3a3f1e70607f3dda4ed556e810bdc30193f19df474369b9',
  },
  disagree: {
    name: 'PERMISSIONLESS.DISAGREED',
    hash: '0x285c96f1d9b8f9143d333a762cb9fa03e98b3f551a824e99ed14072ca3c51179',
  },
  unagree: {
    name: 'PERMISSIONLESS.UNAGREED',
    hash: '0xa1d2a63f4172ef63617e69ca00a8a5e0e0f886fcd26d742208cc5da02fe32328',
  },
  verify: {
    name: 'PERMISSIONLESS.VERIFIED',
    hash: '0x588446c29505d69d73cba2f34aa402447b77f055539a93aec891beb3fbf3f0fd',
  },
  dispute: {
    name: 'PERMISSIONLESS.DISPUTED',
    hash: '0x839d074bf1854255cda5c35a5c89feb5687db041c8ff22370e8597a58ef7706d',
  },
  unverify: {
    name: 'PERMISSIONLESS.UNVERIFIED',
    hash: '0x9516e48c1d614910098dd6197889f54cb08474c630efdb4cd07bbeee329912c2',
  },
} as const;

const OPERATIONS = {
  upvote,
  downvote,
  unvote,
  agree,
  disagree,
  unagree,
  verify,
  dispute,
  unverify,
} as const;

function testContext(): GeoClientContext {
  return {
    network: defineGeoNetworkConfig({
      id: 'LOCAL',
      name: 'Local Geo',
      apiOrigin: 'http://localhost:3000',
      contracts: {
        SPACE_REGISTRY_ADDRESS,
      },
    }),
  };
}

function decodeResponse(calldata: `0x${string}`) {
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

describe('client response helpers', () => {
  it('pins every protocol action name and hash', () => {
    expect(RESPONSE_ACTIONS).toEqual(EXPECTED_ACTIONS);

    const hashes = Object.values(RESPONSE_ACTIONS).map(({ name, hash }) => {
      expect(hash).toBe(keccak256(toHex(name)));
      return hash;
    });

    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('encodes all nine response actions with the same entity payload', () => {
    const context = testContext();
    const params = {
      authorSpaceId: AUTHOR_SPACE_ID,
      spaceId: SPACE_ID,
      entityId: ENTITY_ID,
    };

    for (const [method, operation] of Object.entries(OPERATIONS)) {
      const result = operation(context, params);
      const decoded = decodeResponse(result.calldata);

      expect(result.to).toBe(SPACE_REGISTRY_ADDRESS);
      expect(decoded.fromSpaceId).toBe(`0x${AUTHOR_SPACE_ID}`);
      expect(decoded.toSpaceId).toBe(`0x${SPACE_ID}`);
      expect(decoded.action).toBe(EXPECTED_ACTIONS[method as keyof typeof EXPECTED_ACTIONS].hash);
      expect(decoded.topic).toBe(`0x00000000${ENTITY_ID}${'0'.repeat(24)}`);
      expect(decoded.signature).toBe('0x');
      expect(decoded.version).toBe(0);
      expect(decoded.authorSpaceId).toBe(`0x${AUTHOR_SPACE_ID}`);
      expect(decoded.spaceId).toBe(`0x${SPACE_ID}`);
    }
  });

  it('keeps positive, negative, and clear actions distinct across response kinds', () => {
    expect(
      new Set([RESPONSE_ACTIONS.upvote.hash, RESPONSE_ACTIONS.agree.hash, RESPONSE_ACTIONS.verify.hash]).size,
    ).toBe(3);
    expect(
      new Set([RESPONSE_ACTIONS.downvote.hash, RESPONSE_ACTIONS.disagree.hash, RESPONSE_ACTIONS.dispute.hash]).size,
    ).toBe(3);
    expect(
      new Set([RESPONSE_ACTIONS.unvote.hash, RESPONSE_ACTIONS.unagree.hash, RESPONSE_ACTIONS.unverify.hash]).size,
    ).toBe(3);
  });

  it('normalizes dashed, raw, and 0x-prefixed ids', () => {
    const context = testContext();
    const raw = upvote(context, {
      authorSpaceId: AUTHOR_SPACE_ID,
      spaceId: SPACE_ID,
      entityId: ENTITY_ID,
    });
    const dashed = upvote(context, {
      authorSpaceId: '0eed5491-b917-cf58-b33a-c81255fe7ae9',
      spaceId: 'abcdef12-3456-7890-1234-567890abcdef',
      entityId: '11111111-1111-1111-1111-111111111111',
    });
    const prefixed = upvote(context, {
      authorSpaceId: `0x${AUTHOR_SPACE_ID}`,
      spaceId: `0x${SPACE_ID}`,
      entityId: `0x${ENTITY_ID}`,
    });

    expect(dashed).toEqual(raw);
    expect(prefixed).toEqual(raw);
  });

  it('rejects invalid ids for representative response kinds', () => {
    const context = testContext();

    expect(() =>
      agree(context, {
        authorSpaceId: 'invalid',
        spaceId: SPACE_ID,
        entityId: ENTITY_ID,
      }),
    ).toThrow('Invalid id: "invalid" for `authorSpaceId` in entity response');
    expect(() =>
      dispute(context, {
        authorSpaceId: AUTHOR_SPACE_ID,
        spaceId: 'invalid',
        entityId: ENTITY_ID,
      }),
    ).toThrow('Invalid id: "invalid" for `spaceId` in entity response');
    expect(() =>
      unverify(context, {
        authorSpaceId: AUTHOR_SPACE_ID,
        spaceId: SPACE_ID,
        entityId: 'invalid',
      }),
    ).toThrow('Invalid id: "invalid" for `entityId` in entity response');
  });

  it('requires a configured space registry address', () => {
    const context: GeoClientContext = {
      network: defineGeoNetworkConfig({
        id: 'LOCAL',
        name: 'Local Geo',
        apiOrigin: 'http://localhost:3000',
      }),
    };

    expect(() =>
      verify(context, {
        authorSpaceId: AUTHOR_SPACE_ID,
        spaceId: SPACE_ID,
        entityId: ENTITY_ID,
      }),
    ).toThrow('Geo network "Local Geo" is missing required contract address SPACE_REGISTRY_ADDRESS');
  });
});
