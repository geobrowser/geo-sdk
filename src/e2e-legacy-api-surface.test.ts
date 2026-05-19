import type { CreateRelation, Op } from '@geoprotocol/grc-20';
import { createPublicClient, createWalletClient, type Hex, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';

import { daoSpace, Graph, Ipfs, personalSpace } from '../index.js';
import { SpaceRegistryAbi } from './abis/index.js';
import { DESCRIPTION_PROPERTY, RELATION_TYPE, REPLY_TO_PROPERTY } from './core/ids/system.js';
import { createE2ETestEnvironment } from './e2e-test-environment.js';
import { deriveCommentName } from './graph/comment-utils.js';
import { toGrcId } from './id-utils.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Hex;
const EMPTY_SPACE_ID = '0x00000000000000000000000000000000' as Hex;
const INDEXER_TIMEOUT_MS = 120_000;
const TEST_TIMEOUT_MS = 600_000;
const replyToGrcId = toGrcId(REPLY_TO_PROPERTY);
const e2e = createE2ETestEnvironment();
const legacyNetwork = e2e.networkish as 'TESTNET';

type WalletSetup = {
  account: ReturnType<typeof privateKeyToAccount>;
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
};

type GraphQlResponse<T> = {
  data?: T;
  errors?: unknown;
};

type EntityQueryResponse = {
  entity: {
    id: string;
    name: string | null;
    valuesList: Array<{ propertyId: string; spaceId: string }>;
    relationsList: Array<{ id: string; spaceId: string }>;
  } | null;
};

type ReplyToRelationsResponse = {
  entity: {
    relationsList: Array<{
      toEntity: { id: string };
      toSpace: { id: string } | null;
      position: string | null;
    }>;
  } | null;
};

type ProposalActionType =
  | 'ADD_MEMBER'
  | 'REMOVE_MEMBER'
  | 'ADD_EDITOR'
  | 'REMOVE_EDITOR'
  | 'PUBLISH'
  | 'UPDATE_VOTING_SETTINGS'
  | 'UNKNOWN';

type ProposalQueryResponse = {
  proposals: Array<{
    id: string;
    spaceId: string;
    proposedBy: string;
    currentVersion: number;
    proposalVersions: Array<{
      proposalVersion: number;
      votingMode: 'FAST' | 'SLOW';
      name: string | null;
    }>;
  }>;
  proposalActions: Array<{
    proposalId: string;
    proposalVersion: number;
    actionType: ProposalActionType;
    targetId: string | null;
    contentUri: string | null;
  }>;
};

type ProposalVoteQueryResponse = {
  proposalVotes: Array<{
    proposalId: string;
    voterId: string;
    spaceId: string;
    vote: 'YES' | 'NO' | 'ABSTAIN';
  }>;
};

type VoteQueryResponse = {
  votes: Array<{
    voterId: string;
    objectId: string;
    objectType: number;
    spaceId: string;
    vote: number;
  }>;
};

type TestContext = WalletSetup & {
  spaceId: string;
  spaceIdHex: Hex;
};

type DaoContext = TestContext & {
  daoSpaceAddress: Hex;
  daoSpaceId: string;
  daoSpaceIdHex: Hex;
};

class GraphQlRequestError extends Error {
  constructor(readonly errors: unknown) {
    super(`GraphQL errors: ${JSON.stringify(errors)}`);
  }

  hasValidationError() {
    return JSON.stringify(this.errors).includes('GRAPHQL_VALIDATION_FAILED');
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function filterReplyToRelations(ops: Op[]): CreateRelation[] {
  return ops.filter(
    (op): op is CreateRelation =>
      op.type === 'createRelation' &&
      'relationType' in op &&
      (op as CreateRelation).relationType.every((b, i) => b === replyToGrcId[i]),
  );
}

function hexToUuid(hex: Hex): string {
  return hex.slice(2, 34).toLowerCase();
}

function uniqueName(prefix: string) {
  return `${prefix} ${Date.now().toString(36)}`;
}

function tinyPngBlob() {
  return new Blob(
    [
      new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21,
        196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 255, 255, 63, 0, 5, 254, 2, 254, 167, 53, 129, 132, 0,
        0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
      ]),
    ],
    { type: 'image/png' },
  );
}

function entityQuery(id: string, spaceId: string) {
  const normalizedSpaceId = spaceId.replaceAll('-', '');

  return `query entity {
    entity(id: ${JSON.stringify(id)}) {
      id
      name
      valuesList(filter: { spaceId: { in: [${JSON.stringify(normalizedSpaceId)}] } }) {
        propertyId
        spaceId
      }
      relationsList(filter: { spaceId: { in: [${JSON.stringify(normalizedSpaceId)}] } }) {
        id
        spaceId
      }
    }
  }`;
}

function replyToRelationsQuery(id: string) {
  return `query entity {
    entity(id: ${JSON.stringify(id)}) {
      relationsList(filter: { typeId: { in: [${JSON.stringify(REPLY_TO_PROPERTY)}] } }) {
        toEntity { id }
        toSpace { id }
        position
      }
    }
  }`;
}

function proposalUuid(proposalId: string) {
  return proposalId.replace(/^0x/, '').toLowerCase();
}

function proposalQuery(proposalId: string) {
  const id = proposalUuid(proposalId);

  return `query proposal {
    proposals(condition: { id: ${JSON.stringify(id)} }) {
      id
      spaceId
      proposedBy
      currentVersion
      proposalVersions {
        proposalVersion
        votingMode
        name
      }
    }
    proposalActions(condition: { proposalId: ${JSON.stringify(id)} }) {
      proposalId
      proposalVersion
      actionType
      targetId
      contentUri
    }
  }`;
}

function proposalVoteQuery(proposalId: string, voterId: string, spaceId: string) {
  return `query proposalVote {
    proposalVotes(condition: {
      proposalId: ${JSON.stringify(proposalUuid(proposalId))}
      voterId: ${JSON.stringify(voterId.replaceAll('-', ''))}
      spaceId: ${JSON.stringify(spaceId.replaceAll('-', ''))}
    }) {
      proposalId
      voterId
      spaceId
      vote
    }
  }`;
}

function entityVoteQuery(entityId: string, voterId: string, spaceId: string) {
  return `query entityVote {
    votes(condition: {
      voterId: ${JSON.stringify(voterId.replaceAll('-', ''))}
      objectId: ${JSON.stringify(entityId.replaceAll('-', ''))}
      objectType: 0
      spaceId: ${JSON.stringify(spaceId.replaceAll('-', ''))}
    }) {
      voterId
      objectId
      objectType
      spaceId
      vote
    }
  }`;
}

async function queryGraph<T>(query: string): Promise<T> {
  const response = await fetch(`${e2e.apiOrigin}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${await response.text()}`);
  }

  const envelope = (await response.json()) as GraphQlResponse<T>;
  if (envelope.errors) {
    throw new GraphQlRequestError(envelope.errors);
  }
  if (envelope.data === undefined) {
    throw new Error('GraphQL response did not include data');
  }

  return envelope.data;
}

async function waitFor<T>(label: string, read: () => Promise<T>, predicate: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + INDEXER_TIMEOUT_MS;
  let lastValue: T | undefined;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      lastValue = await read();
      lastError = undefined;
      if (predicate(lastValue)) {
        return lastValue;
      }
    } catch (error) {
      if (error instanceof GraphQlRequestError && error.hasValidationError()) {
        throw error;
      }
      lastError = error;
    }
    await sleep(3_000);
  }

  throw new Error(
    `Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue)}. Last error: ${String(lastError)}`,
  );
}

async function waitForEntityName(entityId: string, spaceId: string, expectedName: string) {
  const data = await waitFor(
    `entity ${entityId} name "${expectedName}"`,
    () => queryGraph<EntityQueryResponse>(entityQuery(entityId, spaceId)),
    value => value.entity?.name === expectedName,
  );

  expect(data.entity?.name).toBe(expectedName);
  return data.entity;
}

async function waitForEntityDeleted(entityId: string, spaceId: string) {
  await waitFor(
    `entity ${entityId} deletion in space ${spaceId}`,
    () => queryGraph<EntityQueryResponse>(entityQuery(entityId, spaceId)),
    value => !value.entity || (value.entity.valuesList.length === 0 && value.entity.relationsList.length === 0),
  );
}

async function waitForReplyToRelations(entityId: string, expectedTargets: string[]) {
  const data = await waitFor(
    `reply-to relations for ${entityId}`,
    () => queryGraph<ReplyToRelationsResponse>(replyToRelationsQuery(entityId)),
    value => {
      const targets = value.entity?.relationsList.map(relation => relation.toEntity.id) ?? [];
      return expectedTargets.every(target => targets.includes(target));
    },
  );

  const targets = data.entity?.relationsList.map(relation => relation.toEntity.id) ?? [];
  expect(targets).toEqual(expect.arrayContaining(expectedTargets));
  return data.entity?.relationsList ?? [];
}

async function waitForProposal(
  proposalId: string,
  expected: {
    daoSpaceId: string;
    proposedBy: string;
    votingMode?: 'FAST' | 'SLOW';
    actionType?: ProposalActionType | ProposalActionType[];
    targetId?: string;
    contentUri?: string;
  },
) {
  const data = await waitFor(
    `proposal ${proposalUuid(proposalId)}`,
    () => queryGraph<ProposalQueryResponse>(proposalQuery(proposalId)),
    value => {
      const proposal = value.proposals[0];
      if (!proposal) return false;
      if (proposal.spaceId !== expected.daoSpaceId.replaceAll('-', '')) return false;
      if (proposal.proposedBy !== expected.proposedBy.replaceAll('-', '')) return false;
      const currentVersion = proposal.proposalVersions.find(
        version => version.proposalVersion === proposal.currentVersion,
      );
      if (expected.votingMode && currentVersion?.votingMode !== expected.votingMode) return false;
      if (!expected.actionType) return true;
      const expectedActionTypes = Array.isArray(expected.actionType) ? expected.actionType : [expected.actionType];

      return value.proposalActions.some(
        action =>
          expectedActionTypes.includes(action.actionType) &&
          (expected.targetId === undefined ||
            action.targetId === expected.targetId.replace(/^0x/, '').replaceAll('-', '')) &&
          (expected.contentUri === undefined || action.contentUri === expected.contentUri),
      );
    },
  );

  expect(data.proposals[0]?.id).toBe(proposalUuid(proposalId));
  if (expected.actionType) {
    const expectedActionTypes = Array.isArray(expected.actionType) ? expected.actionType : [expected.actionType];
    expect(data.proposalActions.some(action => expectedActionTypes.includes(action.actionType))).toBe(true);
  }
}

async function waitForProposalVote(
  proposalId: string,
  voterId: string,
  daoSpaceId: string,
  vote: 'YES' | 'NO' | 'ABSTAIN',
) {
  const data = await waitFor(
    `proposal ${proposalUuid(proposalId)} vote ${vote}`,
    () => queryGraph<ProposalVoteQueryResponse>(proposalVoteQuery(proposalId, voterId, daoSpaceId)),
    value => value.proposalVotes.some(proposalVote => proposalVote.vote === vote),
  );

  expect(data.proposalVotes.map(proposalVote => proposalVote.vote)).toContain(vote);
}

async function waitForEntityVote(
  entityId: string,
  voterId: string,
  spaceId: string,
  predicate: (votes: VoteQueryResponse['votes']) => boolean,
) {
  const data = await waitFor(
    `entity vote for ${entityId}`,
    () => queryGraph<VoteQueryResponse>(entityVoteQuery(entityId, voterId, spaceId)),
    value => predicate(value.votes),
  );

  expect(predicate(data.votes)).toBe(true);
}

async function getSpaceIdHex(publicClient: ReturnType<typeof createPublicClient>, address: Hex): Promise<Hex> {
  return (await publicClient.readContract({
    address: e2e.contracts.SPACE_REGISTRY_ADDRESS,
    abi: SpaceRegistryAbi,
    functionName: 'addressToSpaceId',
    args: [address],
  })) as Hex;
}

async function ensurePersonalSpace({ account, publicClient, walletClient }: WalletSetup) {
  let spaceIdHex = await getSpaceIdHex(publicClient, account.address);
  const hasExistingSpace = await personalSpace.hasSpace({
    address: account.address,
    network: e2e.networkish,
  });
  expect(hasExistingSpace).toBe(spaceIdHex.toLowerCase() !== EMPTY_SPACE_ID.toLowerCase());

  if (spaceIdHex.toLowerCase() === EMPTY_SPACE_ID.toLowerCase()) {
    const createSpace = personalSpace.createSpace({ network: e2e.networkish });
    await sendTransactionAndWait(
      { account, publicClient, walletClient },
      {
        label: 'legacy create personal space',
        to: createSpace.to,
        calldata: createSpace.calldata,
      },
    );
    spaceIdHex = await getSpaceIdHex(publicClient, account.address);
  }

  if (spaceIdHex.toLowerCase() === EMPTY_SPACE_ID.toLowerCase()) {
    throw new Error(`Failed to create personal space for address ${account.address}`);
  }

  return {
    spaceIdHex,
    spaceId: hexToUuid(spaceIdHex),
  };
}

async function setupWallet(): Promise<WalletSetup> {
  const account = privateKeyToAccount(e2e.privateKey);
  const walletClient = createWalletClient({
    account,
    chain: e2e.chain,
    transport: http(e2e.rpcUrl),
  });
  expect(account.address).toBe(privateKeyToAccount(e2e.privateKey).address);

  const publicClient = createPublicClient({
    chain: e2e.chain,
    transport: http(e2e.rpcUrl),
  });

  return { account, publicClient, walletClient };
}

async function sendTransactionAndWait(
  { account, publicClient, walletClient }: WalletSetup,
  {
    label,
    to,
    calldata,
    value = 0n,
  }: {
    label: string;
    to: `0x${string}`;
    calldata: `0x${string}`;
    value?: bigint;
  },
) {
  const hash = await walletClient.sendTransaction({
    account,
    chain: walletClient.chain ?? null,
    to,
    value,
    data: calldata,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  expect(receipt.status, `${label} transaction ${hash}`).toBe('success');

  return { hash, receipt };
}

let contextPromise: Promise<TestContext> | undefined;
let daoContextPromise: Promise<DaoContext> | undefined;

async function getTestContext(): Promise<TestContext> {
  contextPromise ??= (async () => {
    const wallet = await setupWallet();
    const { spaceId, spaceIdHex } = await ensurePersonalSpace(wallet);

    return {
      ...wallet,
      spaceId,
      spaceIdHex,
    };
  })();

  return contextPromise;
}

async function publishOps(context: TestContext, name: string, ops: Op[], spaceId = context.spaceId) {
  const publish = await personalSpace.publishEdit({
    name,
    spaceId,
    author: context.spaceId,
    ops,
    network: legacyNetwork,
  });
  await sendTransactionAndWait(context, {
    label: name,
    to: publish.to,
    calldata: publish.calldata,
  });

  return publish;
}

async function createIndexedEntity(context: TestContext, name = uniqueName('E2E Legacy Entity')) {
  const entity = Graph.createEntity({ name });
  await publishOps(context, `Publish ${name}`, entity.ops);
  await waitForEntityName(entity.id, context.spaceId, name);

  return entity;
}

async function getDaoContext(): Promise<DaoContext> {
  daoContextPromise ??= (async () => {
    const context = await getTestContext();
    const daoName = uniqueName('E2E Legacy DAO Space');
    const createdDaoSpace = await daoSpace.createSpace({
      name: daoName,
      votingSettings: {
        partialPercentageSupportThreshold: 50,
        universalPercentageSupportThreshold: 90,
        flatSupportThreshold: 1,
        quorum: 1,
        durationInDays: 2,
        disableFastPathAccessForNewMembers: true,
        executionGracePeriodInDays: 14,
      },
      initialEditorSpaceIds: [context.spaceIdHex],
      author: context.spaceId,
      network: legacyNetwork,
    });
    const daoCreateTx = await sendTransactionAndWait(context, {
      label: 'create legacy API DAO space',
      to: createdDaoSpace.to,
      calldata: createdDaoSpace.calldata,
    });

    const daoSpaceAddress = daoCreateTx.receipt.logs.find(
      log => log.address.toLowerCase() !== createdDaoSpace.to.toLowerCase(),
    )?.address as Hex | undefined;
    if (!daoSpaceAddress) {
      throw new Error('Could not find DAO space address in creation logs');
    }

    const daoSpaceIdHex = await getSpaceIdHex(context.publicClient, daoSpaceAddress);
    expect(daoSpaceIdHex.toLowerCase()).not.toBe(EMPTY_SPACE_ID.toLowerCase());
    const daoSpaceId = hexToUuid(daoSpaceIdHex);
    await waitForEntityName(createdDaoSpace.spaceEntityId, daoSpaceId, daoName);

    return {
      ...context,
      daoSpaceAddress,
      daoSpaceId,
      daoSpaceIdHex,
    };
  })();

  return daoContextPromise;
}

async function createLegacyAddMemberProposal(context: DaoContext, label: string) {
  const proposal = daoSpace.proposeAddMember({
    authorSpaceId: context.spaceIdHex,
    spaceId: context.daoSpaceIdHex,
    daoSpaceAddress: context.daoSpaceAddress,
    newMemberSpaceId: context.spaceIdHex,
    network: legacyNetwork,
  });
  await sendTransactionAndWait(context, {
    label,
    to: proposal.to,
    calldata: proposal.calldata,
  });
  await waitForProposal(proposal.proposalId, {
    daoSpaceId: context.daoSpaceId,
    proposedBy: context.spaceId,
    votingMode: 'SLOW',
  });

  return proposal;
}

describe.skip('legacy deprecated API e2e surface', () => {
  // describe.sequential('legacy deprecated API e2e surface', () => {
  it(
    'personalSpace.hasSpace validates the account space onchain',
    async () => {
      const context = await getTestContext();
      const hasSpace = await personalSpace.hasSpace({
        address: context.account.address,
        network: e2e.networkish,
      });

      expect(hasSpace).toBe(true);

      const spaceAddress = (await context.publicClient.readContract({
        address: e2e.contracts.SPACE_REGISTRY_ADDRESS,
        abi: SpaceRegistryAbi,
        functionName: 'spaceIdToAddress',
        args: [context.spaceIdHex],
      })) as Hex;
      expect(spaceAddress.toLowerCase()).not.toBe(ZERO_ADDRESS.toLowerCase());
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Ipfs.uploadCSV uploads CSV data',
    async () => {
      const csvCid = await Ipfs.uploadCSV(`name,run\nLegacy API surface,${Date.now().toString(36)}`, legacyNetwork);

      expect(csvCid).toMatch(/^ipfs:\/\//);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Ipfs.uploadImage uploads an image and returns dimensions',
    async () => {
      const uploadedImage = await Ipfs.uploadImage({ blob: tinyPngBlob() }, legacyNetwork, true);

      expect(uploadedImage.cid).toMatch(/^ipfs:\/\//);
      expect(uploadedImage.dimensions).toEqual({ width: 1, height: 1 });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.createImage builds publishable image ops',
    async () => {
      const context = await getTestContext();
      const imageName = uniqueName('E2E Legacy Image');
      const image = await Graph.createImage({
        blob: tinyPngBlob(),
        name: imageName,
        description: 'Created by the legacy API e2e surface test',
        network: legacyNetwork,
      });

      expect(image.cid).toMatch(/^ipfs:\/\//);
      await publishOps(context, 'E2E legacy API image', image.ops);
      await waitForEntityName(image.id, context.spaceId, imageName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Ipfs.publishEdit uploads an edit payload',
    async () => {
      const context = await getTestContext();
      const entity = Graph.createEntity({
        name: uniqueName('E2E Legacy Upload Only Entity'),
      });
      const edit = await Ipfs.publishEdit({
        name: 'E2E legacy upload-only edit',
        ops: entity.ops,
        author: context.spaceId,
        network: legacyNetwork,
      });

      expect(edit.cid).toMatch(/^ipfs:\/\//);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'personalSpace.publishEdit publishes ops into an indexed personal space',
    async () => {
      const context = await getTestContext();
      const entityName = uniqueName('E2E Legacy Publish Edit Entity');
      const entity = Graph.createEntity({ name: entityName });

      await publishOps(context, 'E2E legacy personal publish', entity.ops);
      await waitForEntityName(entity.id, context.spaceId, entityName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.createProperty creates an indexed property entity',
    async () => {
      const context = await getTestContext();
      const propertyName = uniqueName('E2E Legacy Property');
      const property = Graph.createProperty({
        name: propertyName,
        dataType: 'TEXT',
      });

      await publishOps(context, 'E2E legacy property', property.ops);
      await waitForEntityName(property.id, context.spaceId, propertyName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.createType creates an indexed type entity',
    async () => {
      const context = await getTestContext();
      const property = Graph.createProperty({
        name: uniqueName('E2E Legacy Type Property'),
        dataType: 'TEXT',
      });
      const typeName = uniqueName('E2E Legacy Type');
      const type = Graph.createType({
        name: typeName,
        properties: [property.id],
      });

      await publishOps(context, 'E2E legacy type', [...property.ops, ...type.ops]);
      await waitForEntityName(type.id, context.spaceId, typeName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.createEntity creates an indexed entity',
    async () => {
      const context = await getTestContext();
      const entityName = uniqueName('E2E Legacy Entity');
      const entity = Graph.createEntity({
        name: entityName,
        description: 'Created through the legacy API e2e surface test',
      });

      await publishOps(context, 'E2E legacy entity', entity.ops);
      await waitForEntityName(entity.id, context.spaceId, entityName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.updateEntity updates an indexed entity',
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(context, uniqueName('E2E Legacy Entity To Update'));
      const updatedName = `${entity.id} updated`;
      const update = Graph.updateEntity({
        id: entity.id,
        name: updatedName,
        unset: [{ property: DESCRIPTION_PROPERTY }],
      });

      await publishOps(context, 'E2E legacy entity update', update.ops);
      await waitForEntityName(entity.id, context.spaceId, updatedName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.createRelation creates an indexed relation',
    async () => {
      const context = await getTestContext();
      const fromName = uniqueName('E2E Legacy Relation From');
      const from = Graph.createEntity({ name: fromName });
      const to = Graph.createEntity({
        name: uniqueName('E2E Legacy Relation To'),
      });
      const relation = Graph.createRelation({
        fromEntity: from.id,
        toEntity: to.id,
        type: RELATION_TYPE,
        position: 'a0',
      });

      await publishOps(context, 'E2E legacy relation', [...from.ops, ...to.ops, ...relation.ops]);
      const entity = await waitForEntityName(from.id, context.spaceId, fromName);
      expect(entity?.relationsList.map(item => item.id)).toContain(relation.id);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.updateRelation keeps an updated relation indexed',
    async () => {
      const context = await getTestContext();
      const fromName = uniqueName('E2E Legacy Relation Update From');
      const from = Graph.createEntity({ name: fromName });
      const to = Graph.createEntity({
        name: uniqueName('E2E Legacy Relation Update To'),
      });
      const relation = Graph.createRelation({
        fromEntity: from.id,
        toEntity: to.id,
        type: RELATION_TYPE,
        position: 'a0',
      });
      const update = Graph.updateRelation({
        id: relation.id,
        position: 'a1',
      });

      await publishOps(context, 'E2E legacy relation update', [...from.ops, ...to.ops, ...relation.ops, ...update.ops]);
      const entity = await waitForEntityName(from.id, context.spaceId, fromName);
      expect(entity?.relationsList.map(item => item.id)).toContain(relation.id);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.deleteRelation removes an indexed relation',
    async () => {
      const context = await getTestContext();
      const fromName = uniqueName('E2E Legacy Relation Delete From');
      const from = Graph.createEntity({ name: fromName });
      const to = Graph.createEntity({
        name: uniqueName('E2E Legacy Relation Delete To'),
      });
      const relation = Graph.createRelation({
        fromEntity: from.id,
        toEntity: to.id,
        type: RELATION_TYPE,
      });
      await publishOps(context, 'E2E legacy relation delete setup', [...from.ops, ...to.ops, ...relation.ops]);
      await waitForEntityName(from.id, context.spaceId, fromName);

      const deleteRelation = Graph.deleteRelation({ id: relation.id });
      await publishOps(context, 'E2E legacy relation delete', deleteRelation.ops);
      await waitFor(
        `relation ${relation.id} deletion`,
        () => queryGraph<EntityQueryResponse>(entityQuery(from.id, context.spaceId)),
        value => !(value.entity?.relationsList ?? []).some(item => item.id === relation.id),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.createProposalReview creates an indexed proposal review',
    async () => {
      const context = await getTestContext();
      const proposal = await createIndexedEntity(context, uniqueName('E2E Legacy Reviewed Proposal'));
      const reviewName = uniqueName('E2E Legacy Proposal Review');
      const review = Graph.createProposalReview({
        proposal: { id: proposal.id, name: reviewName },
        pass: true,
        content: 'The proposal looks good.',
        completeness: 1,
        accuracy: 0.8,
        skill: 0.8,
        effort: 0.6,
      });

      await publishOps(context, 'E2E legacy proposal review', review.ops);
      await waitForEntityName(review.id, context.spaceId, reviewName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.updateProposalReview updates an indexed proposal review',
    async () => {
      const context = await getTestContext();
      const proposal = await createIndexedEntity(context, uniqueName('E2E Legacy Reviewed Proposal Update'));
      const reviewName = uniqueName('E2E Legacy Proposal Review Update');
      const review = Graph.createProposalReview({
        proposal: { id: proposal.id, name: reviewName },
        pass: true,
        content: 'The proposal looks good.',
      });
      await publishOps(context, 'E2E legacy proposal review setup', review.ops);
      await waitForEntityName(review.id, context.spaceId, reviewName);

      const update = Graph.updateProposalReview({
        proposalReviewId: review.id,
        pass: false,
        content: 'Updated legacy review content.',
      });
      await publishOps(context, 'E2E legacy proposal review update', update.ops);
      await waitForEntityName(review.id, context.spaceId, reviewName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.createComment creates indexed comments with reply-to chains',
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(context, uniqueName('E2E Legacy Commented Entity'));
      const commentAContent = 'Legacy API comment A on the entity';
      const commentA = await Graph.createComment({
        content: commentAContent,
        replyTo: { entityId: entity.id, spaceId: context.spaceId },
        network: legacyNetwork,
      });
      expect(filterReplyToRelations(commentA.ops)).toHaveLength(1);
      await publishOps(context, 'E2E legacy comment A', commentA.ops);
      await waitForEntityName(commentA.id, context.spaceId, deriveCommentName(commentAContent));
      await waitForReplyToRelations(commentA.id, [entity.id]);

      const commentBContent = 'Legacy API comment B on comment A';
      const commentB = await Graph.createComment({
        content: commentBContent,
        replyTo: { entityId: commentA.id, spaceId: context.spaceId },
        network: legacyNetwork,
      });
      expect(filterReplyToRelations(commentB.ops)).toHaveLength(2);
      await publishOps(context, 'E2E legacy comment B', commentB.ops);
      await waitForEntityName(commentB.id, context.spaceId, deriveCommentName(commentBContent));
      await waitForReplyToRelations(commentB.id, [commentA.id, entity.id]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.updateComment updates an indexed comment',
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(context, uniqueName('E2E Legacy Comment Update Entity'));
      const comment = await Graph.createComment({
        content: 'Legacy API comment before update',
        replyTo: { entityId: entity.id, spaceId: context.spaceId },
        network: legacyNetwork,
      });
      await publishOps(context, 'E2E legacy comment update setup', comment.ops);
      await waitForEntityName(comment.id, context.spaceId, deriveCommentName('Legacy API comment before update'));

      const updatedContent = 'Legacy API comment after update';
      const update = Graph.updateComment({
        id: comment.id,
        content: updatedContent,
        resolved: true,
      });
      await publishOps(context, 'E2E legacy comment update', update.ops);
      await waitForEntityName(comment.id, context.spaceId, deriveCommentName(updatedContent));
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.deleteEntity removes indexed entity values and relations',
    async () => {
      const context = await getTestContext();
      const related = await createIndexedEntity(context, uniqueName('E2E Legacy Delete Related Entity'));
      const deleteContextName = uniqueName('E2E Legacy Entity To Delete');
      const deleteContextEntity = Graph.createEntity({
        name: deleteContextName,
      });
      const deleteContextRelation = Graph.createRelation({
        fromEntity: deleteContextEntity.id,
        toEntity: related.id,
        type: RELATION_TYPE,
      });
      await publishOps(context, 'E2E legacy create entity for deletion', [
        ...deleteContextEntity.ops,
        ...deleteContextRelation.ops,
      ]);
      await waitForEntityName(deleteContextEntity.id, context.spaceId, deleteContextName);

      const deleteResult = await Graph.deleteEntity({
        id: deleteContextEntity.id,
        spaceId: context.spaceId,
        network: legacyNetwork,
      });
      expect(deleteResult.ops.length).toBeGreaterThan(0);
      await publishOps(context, 'E2E legacy delete entity', deleteResult.ops);
      await waitForEntityDeleted(deleteContextEntity.id, context.spaceId);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.upvoteEntity submits and indexes an upvote',
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(context, uniqueName('E2E Legacy Upvoted Entity'));
      const upvote = Graph.upvoteEntity({
        authorSpaceId: context.spaceId,
        spaceId: context.spaceId,
        entityId: entity.id,
        network: legacyNetwork,
      });
      await sendTransactionAndWait(context, {
        label: 'E2E legacy upvote entity',
        to: upvote.to,
        calldata: upvote.calldata,
      });
      await waitForEntityVote(entity.id, context.spaceId, context.spaceId, votes =>
        votes.some(vote => vote.vote === 0),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.downvoteEntity submits and indexes a downvote',
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(context, uniqueName('E2E Legacy Downvoted Entity'));
      const downvote = Graph.downvoteEntity({
        authorSpaceId: context.spaceId,
        spaceId: context.spaceId,
        entityId: entity.id,
        network: legacyNetwork,
      });
      await sendTransactionAndWait(context, {
        label: 'E2E legacy downvote entity',
        to: downvote.to,
        calldata: downvote.calldata,
      });
      await waitForEntityVote(entity.id, context.spaceId, context.spaceId, votes =>
        votes.some(vote => vote.vote === 1),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'Graph.withdrawEntityVote submits and indexes a vote withdrawal',
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(context, uniqueName('E2E Legacy Vote Withdraw Entity'));
      const upvote = Graph.upvoteEntity({
        authorSpaceId: context.spaceId,
        spaceId: context.spaceId,
        entityId: entity.id,
        network: legacyNetwork,
      });
      await sendTransactionAndWait(context, {
        label: 'E2E legacy upvote before withdraw',
        to: upvote.to,
        calldata: upvote.calldata,
      });
      await waitForEntityVote(entity.id, context.spaceId, context.spaceId, votes => votes.length > 0);

      const withdraw = Graph.withdrawEntityVote({
        authorSpaceId: context.spaceId,
        spaceId: context.spaceId,
        entityId: entity.id,
        network: legacyNetwork,
      });
      await sendTransactionAndWait(context, {
        label: 'E2E legacy withdraw entity vote',
        to: withdraw.to,
        calldata: withdraw.calldata,
      });
      await waitForEntityVote(entity.id, context.spaceId, context.spaceId, votes =>
        votes.some(vote => vote.vote === 2),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'daoSpace.createSpace creates an indexed DAO space',
    async () => {
      const dao = await getDaoContext();

      expect(dao.daoSpaceAddress.toLowerCase()).not.toBe(ZERO_ADDRESS.toLowerCase());
      expect(dao.daoSpaceIdHex.toLowerCase()).not.toBe(EMPTY_SPACE_ID.toLowerCase());
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'daoSpace.proposeEdit creates an indexed publish proposal',
    async () => {
      const dao = await getDaoContext();
      const daoEntity = Graph.createEntity({
        name: uniqueName('E2E Legacy DAO Proposed Entity'),
      });
      const proposal = await daoSpace.proposeEdit({
        name: 'E2E legacy API DAO propose edit',
        ops: daoEntity.ops,
        author: dao.spaceId,
        daoSpaceAddress: dao.daoSpaceAddress,
        callerSpaceId: dao.spaceIdHex,
        daoSpaceId: dao.daoSpaceIdHex,
        votingMode: 'FAST',
        network: legacyNetwork,
      });
      await sendTransactionAndWait(dao, {
        label: 'legacy API DAO propose edit',
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.spaceId,
        votingMode: 'FAST',
        actionType: ['PUBLISH', 'UNKNOWN'],
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'daoSpace.proposeAddMember creates an indexed add-member proposal',
    async () => {
      const dao = await getDaoContext();
      await createLegacyAddMemberProposal(dao, 'legacy API DAO propose add member');
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'daoSpace.proposeRemoveMember creates an indexed remove-member proposal',
    async () => {
      const dao = await getDaoContext();
      const proposal = daoSpace.proposeRemoveMember({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        daoSpaceAddress: dao.daoSpaceAddress,
        memberToRemoveSpaceId: dao.spaceIdHex,
        network: legacyNetwork,
      });
      await sendTransactionAndWait(dao, {
        label: 'legacy API DAO propose remove member',
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.spaceId,
        votingMode: 'SLOW',
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'daoSpace.proposeAddEditor creates an indexed add-editor proposal',
    async () => {
      const dao = await getDaoContext();
      const proposal = daoSpace.proposeAddEditor({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        daoSpaceAddress: dao.daoSpaceAddress,
        newEditorSpaceId: dao.spaceIdHex,
        network: legacyNetwork,
      });
      await sendTransactionAndWait(dao, {
        label: 'legacy API DAO propose add editor',
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.spaceId,
        votingMode: 'SLOW',
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'daoSpace.proposeRemoveEditor creates an indexed remove-editor proposal',
    async () => {
      const dao = await getDaoContext();
      const proposal = daoSpace.proposeRemoveEditor({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        daoSpaceAddress: dao.daoSpaceAddress,
        editorToRemoveSpaceId: dao.spaceIdHex,
        network: legacyNetwork,
      });
      await sendTransactionAndWait(dao, {
        label: 'legacy API DAO propose remove editor',
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.spaceId,
        votingMode: 'SLOW',
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'daoSpace.proposeRequestMembership creates an indexed membership proposal',
    async () => {
      const dao = await getDaoContext();
      const proposal = daoSpace.proposeRequestMembership({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        network: legacyNetwork,
      });
      await sendTransactionAndWait(dao, {
        label: 'legacy API DAO propose request membership',
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.daoSpaceId,
        votingMode: 'FAST',
        actionType: 'ADD_MEMBER',
        targetId: dao.spaceId,
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'daoSpace.voteProposal creates an indexed proposal vote',
    async () => {
      const dao = await getDaoContext();
      const proposal = await createLegacyAddMemberProposal(dao, 'legacy API DAO proposal for vote');
      const vote = daoSpace.voteProposal({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        proposalId: proposal.proposalId,
        vote: 'YES',
        network: legacyNetwork,
      });
      await sendTransactionAndWait(dao, {
        label: 'legacy API DAO vote proposal',
        to: vote.to,
        calldata: vote.calldata,
      });
      await waitForProposalVote(proposal.proposalId, dao.spaceId, dao.daoSpaceId, 'YES');
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'daoSpace.executeProposal builds execute calldata for an indexed proposal',
    async () => {
      const dao = await getDaoContext();
      const proposal = await createLegacyAddMemberProposal(dao, 'legacy API DAO proposal for execute calldata');
      const execute = daoSpace.executeProposal({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        proposalId: proposal.proposalId,
        network: legacyNetwork,
      });

      expect(execute.to).toBe(e2e.contracts.SPACE_REGISTRY_ADDRESS);
      expect(execute.calldata).toMatch(/^0x[0-9a-fA-F]+$/);
    },
    TEST_TIMEOUT_MS,
  );
});
