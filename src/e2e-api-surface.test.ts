import type { CreateRelation, Op } from "@geoprotocol/grc-20";
import {
  type Chain,
  createPublicClient,
  createWalletClient,
  type Hex,
  http,
} from "viem";
import { type PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";

import {
  createGeoClient,
  defineGeoNetworkConfig,
  GeoTestnetConfig,
  Ops,
} from "../index.js";
import { SpaceRegistryAbi } from "./abis/index.js";
import {
  DESCRIPTION_PROPERTY,
  RELATION_TYPE,
  REPLY_TO_PROPERTY,
} from "./core/ids/system.js";
import { deriveCommentName } from "./graph/comment-utils.js";
import { generate, toGrcId } from "./id-utils.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Hex;
const EMPTY_SPACE_ID = "0x00000000000000000000000000000000" as Hex;
const INDEXER_TIMEOUT_MS = 120_000;
const TEST_TIMEOUT_MS = 600_000;
const replyToGrcId = toGrcId(REPLY_TO_PROPERTY);

const geo = createGeoClient({
  network: defineGeoNetworkConfig(GeoTestnetConfig),
});

type WalletSetup = {
  account: PrivateKeyAccount;
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
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
  | "ADD_MEMBER"
  | "REMOVE_MEMBER"
  | "ADD_EDITOR"
  | "REMOVE_EDITOR"
  | "PUBLISH"
  | "UPDATE_VOTING_SETTINGS"
  | "UNKNOWN";

type ProposalQueryResponse = {
  proposals: Array<{
    id: string;
    spaceId: string;
    proposedBy: string;
    votingMode: "FAST" | "SLOW";
    name: string | null;
    yesCount: string;
    noCount: string;
    abstainCount: string;
  }>;
  proposalActions: Array<{
    proposalId: string;
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
    vote: "YES" | "NO" | "ABSTAIN";
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

type SpaceTopicQueryResponse = {
  spaces: Array<{
    topicId: string | null;
  }>;
};

type TestContext = WalletSetup & {
  spaceId: string;
  spaceIdHex: Hex;
  authorSpaceId: string;
};

type DaoContext = TestContext & {
  daoSpaceAddress: Hex;
  daoSpaceId: string;
  daoSpaceIdHex: Hex;
  daoSpaceEntityId: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireTestnetContract(
  name: "SPACE_REGISTRY_ADDRESS" | "DAO_SPACE_FACTORY_ADDRESS",
): `0x${string}` {
  const address = GeoTestnetConfig.contracts?.[name];
  if (!address) {
    throw new Error(`GeoTestnetConfig is missing ${name}`);
  }

  return address;
}

function requireTestnetRpcUrl(): string {
  const rpcUrl = GeoTestnetConfig.chain?.rpcUrl;
  if (!rpcUrl) {
    throw new Error("GeoTestnetConfig is missing an RPC URL");
  }

  return rpcUrl;
}

function createTestnetChain(rpcUrl: string): Chain {
  const chainConfig = GeoTestnetConfig.chain;
  if (!chainConfig) {
    throw new Error("GeoTestnetConfig is missing chain config");
  }

  return {
    id: chainConfig.id,
    name: chainConfig.name,
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
      public: {
        http: [rpcUrl],
      },
    },
  };
}

function filterReplyToRelations(ops: Op[]): CreateRelation[] {
  return ops.filter(
    (op): op is CreateRelation =>
      op.type === "createRelation" &&
      "relationType" in op &&
      (op as CreateRelation).relationType.every(
        (b, i) => b === replyToGrcId[i],
      ),
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
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
        1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65,
        84, 120, 156, 99, 248, 255, 255, 63, 0, 5, 254, 2, 254, 167, 53, 129,
        132, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
      ]),
    ],
    { type: "image/png" },
  );
}

function entityQuery(id: string, spaceId: string) {
  const normalizedSpaceId = spaceId.replaceAll("-", "");

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
  return proposalId.replace(/^0x/, "").toLowerCase();
}

function proposalQuery(proposalId: string) {
  const id = proposalUuid(proposalId);

  return `query proposal {
    proposals(condition: { id: ${JSON.stringify(id)} }) {
      id
      spaceId
      proposedBy
      votingMode
      name
      yesCount
      noCount
      abstainCount
    }
    proposalActions(condition: { proposalId: ${JSON.stringify(id)} }) {
      proposalId
      actionType
      targetId
      contentUri
    }
  }`;
}

function proposalVoteQuery(
  proposalId: string,
  voterId: string,
  spaceId: string,
) {
  return `query proposalVote {
    proposalVotes(condition: {
      proposalId: ${JSON.stringify(proposalUuid(proposalId))}
      voterId: ${JSON.stringify(voterId.replaceAll("-", ""))}
      spaceId: ${JSON.stringify(spaceId.replaceAll("-", ""))}
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
      voterId: ${JSON.stringify(voterId.replaceAll("-", ""))}
      objectId: ${JSON.stringify(entityId.replaceAll("-", ""))}
      objectType: 0
      spaceId: ${JSON.stringify(spaceId.replaceAll("-", ""))}
    }) {
      voterId
      objectId
      objectType
      spaceId
      vote
    }
  }`;
}

function spaceTopicQuery(spaceId: string) {
  const normalizedSpaceId = spaceId.replaceAll("-", "").toLowerCase();

  return `query spaces {
    spaces(filter: { id: { is: ${JSON.stringify(normalizedSpaceId)} } }) {
      topicId
    }
  }`;
}

async function queryGraph<T>(query: string): Promise<T> {
  const response = await geo.api.graphql<T>(query);
  if (response.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(response.errors)}`);
  }
  if (response.data === undefined) {
    throw new Error("GraphQL response did not include data");
  }

  return response.data;
}

async function waitFor<T>(
  label: string,
  read: () => Promise<T>,
  predicate: (value: T) => boolean,
): Promise<T> {
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
      lastError = error;
    }
    await sleep(3_000);
  }

  throw new Error(
    `Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue)}. Last error: ${String(lastError)}`,
  );
}

async function waitForEntityName(
  entityId: string,
  spaceId: string,
  expectedName: string,
) {
  const data = await waitFor(
    `entity ${entityId} name "${expectedName}"`,
    () => queryGraph<EntityQueryResponse>(entityQuery(entityId, spaceId)),
    (value) => value.entity?.name === expectedName,
  );

  expect(data.entity?.name).toBe(expectedName);
  return data.entity;
}

async function waitForEntityDeleted(entityId: string, spaceId: string) {
  await waitFor(
    `entity ${entityId} deletion in space ${spaceId}`,
    () => queryGraph<EntityQueryResponse>(entityQuery(entityId, spaceId)),
    (value) =>
      !value.entity ||
      (value.entity.valuesList.length === 0 &&
        value.entity.relationsList.length === 0),
  );
}

async function waitForReplyToRelations(
  entityId: string,
  expectedTargets: string[],
) {
  const data = await waitFor(
    `reply-to relations for ${entityId}`,
    () => queryGraph<ReplyToRelationsResponse>(replyToRelationsQuery(entityId)),
    (value) => {
      const targets =
        value.entity?.relationsList.map((relation) => relation.toEntity.id) ??
        [];
      return expectedTargets.every((target) => targets.includes(target));
    },
  );

  const targets =
    data.entity?.relationsList.map((relation) => relation.toEntity.id) ?? [];
  expect(targets).toEqual(expect.arrayContaining(expectedTargets));
  return data.entity?.relationsList ?? [];
}

async function waitForProposal(
  proposalId: string,
  expected: {
    daoSpaceId: string;
    proposedBy: string;
    votingMode?: "FAST" | "SLOW";
    actionType?: ProposalActionType;
    targetId?: string;
    contentUri?: string;
  },
) {
  const data = await waitFor(
    `proposal ${proposalUuid(proposalId)}`,
    () => queryGraph<ProposalQueryResponse>(proposalQuery(proposalId)),
    (value) => {
      const proposal = value.proposals[0];
      if (!proposal) return false;
      if (proposal.spaceId !== expected.daoSpaceId.replaceAll("-", "")) {
        return false;
      }
      if (proposal.proposedBy !== expected.proposedBy.replaceAll("-", "")) {
        return false;
      }
      if (expected.votingMode && proposal.votingMode !== expected.votingMode) {
        return false;
      }
      if (!expected.actionType) return true;

      return value.proposalActions.some(
        (action) =>
          action.actionType === expected.actionType &&
          (expected.targetId === undefined ||
            action.targetId ===
              expected.targetId.replace(/^0x/, "").replaceAll("-", "")) &&
          (expected.contentUri === undefined ||
            action.contentUri === expected.contentUri),
      );
    },
  );

  expect(data.proposals[0]?.id).toBe(proposalUuid(proposalId));
  if (expected.actionType) {
    expect(data.proposalActions.map((action) => action.actionType)).toContain(
      expected.actionType,
    );
  }

  return data;
}

async function waitForProposalVote(
  proposalId: string,
  voterId: string,
  daoSpaceId: string,
  vote: "YES" | "NO" | "ABSTAIN",
) {
  const data = await waitFor(
    `proposal ${proposalUuid(proposalId)} vote ${vote}`,
    () =>
      queryGraph<ProposalVoteQueryResponse>(
        proposalVoteQuery(proposalId, voterId, daoSpaceId),
      ),
    (value) =>
      value.proposalVotes.some((proposalVote) => proposalVote.vote === vote),
  );

  expect(data.proposalVotes.map((proposalVote) => proposalVote.vote)).toContain(
    vote,
  );
}

async function waitForEntityVote(
  entityId: string,
  voterId: string,
  spaceId: string,
  predicate: (votes: VoteQueryResponse["votes"]) => boolean,
) {
  const data = await waitFor(
    `entity vote for ${entityId}`,
    () =>
      queryGraph<VoteQueryResponse>(
        entityVoteQuery(entityId, voterId, spaceId),
      ),
    (value) => predicate(value.votes),
  );

  expect(predicate(data.votes)).toBe(true);
  return data.votes;
}

async function waitForSpaceTopicId(spaceId: string, topicId: string) {
  const normalizedTopicId = topicId.replaceAll("-", "").toLowerCase();
  const data = await waitFor(
    `space ${spaceId} topic ${normalizedTopicId}`,
    () => queryGraph<SpaceTopicQueryResponse>(spaceTopicQuery(spaceId)),
    (value) => value.spaces[0]?.topicId === normalizedTopicId,
  );

  expect(data.spaces[0]?.topicId).toBe(normalizedTopicId);
  return data.spaces[0];
}

async function readSpaceTopicId(spaceId: string) {
  const data = await queryGraph<SpaceTopicQueryResponse>(
    spaceTopicQuery(spaceId),
  );

  return data.spaces[0]?.topicId ?? null;
}

async function getSpaceIdHex(
  publicClient: ReturnType<typeof createPublicClient>,
  address: Hex,
): Promise<Hex> {
  return (await publicClient.readContract({
    address: requireTestnetContract("SPACE_REGISTRY_ADDRESS"),
    abi: SpaceRegistryAbi,
    functionName: "addressToSpaceId",
    args: [address],
  })) as Hex;
}

async function ensurePersonalSpace({
  accountAddress,
  account,
  publicClient,
  walletClient,
}: WalletSetup & { accountAddress: Hex }) {
  let spaceIdHex = await getSpaceIdHex(publicClient, accountAddress);
  const hasExistingSpace = await geo.personalSpaces.hasSpace({
    address: accountAddress,
  });
  expect(hasExistingSpace).toBe(
    spaceIdHex.toLowerCase() !== EMPTY_SPACE_ID.toLowerCase(),
  );

  if (spaceIdHex.toLowerCase() === EMPTY_SPACE_ID.toLowerCase()) {
    const createSpace = geo.personalSpaces.create({
      name: "E2E API Surface Personal Space",
      accountAddress,
    });

    await sendTransactionAndWait(
      { account, publicClient, walletClient },
      {
        label: "create personal space",
        to: createSpace.to,
        calldata: createSpace.calldata,
      },
    );

    spaceIdHex = await getSpaceIdHex(publicClient, accountAddress);

    if (spaceIdHex.toLowerCase() !== EMPTY_SPACE_ID.toLowerCase()) {
      const spaceId = hexToUuid(spaceIdHex);
      const publishProfile = await geo.personalSpaces.publishEdit({
        name: "Create personal space profile",
        spaceId,
        author: spaceId,
        ops: createSpace.ops,
      });

      await sendTransactionAndWait(
        { account, publicClient, walletClient },
        {
          label: "publish personal space profile",
          to: publishProfile.to,
          calldata: publishProfile.calldata,
        },
      );

      await waitForEntityName(
        createSpace.spaceEntityId,
        spaceId,
        "E2E API Surface Personal Space",
      );

      const setTopic = geo.personalSpaces.setTopic({
        spaceId,
        topicId: createSpace.spaceEntityId,
      });
      await sendTransactionAndWait(
        { account, publicClient, walletClient },
        {
          label: "set personal space topic",
          to: setTopic.to,
          calldata: setTopic.calldata,
        },
      );

      await waitForSpaceTopicId(spaceId, createSpace.spaceEntityId);
    }
  }

  if (spaceIdHex.toLowerCase() === EMPTY_SPACE_ID.toLowerCase()) {
    throw new Error(
      `Failed to create personal space for address ${accountAddress}`,
    );
  }

  return {
    spaceIdHex,
    spaceId: hexToUuid(spaceIdHex),
  };
}

async function setupWallet(): Promise<WalletSetup> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required.");
  }
  if (!privateKey.startsWith("0x")) {
    throw new Error("PRIVATE_KEY must be a hex string starting with 0x.");
  }

  const rpcUrl = requireTestnetRpcUrl();
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const chain = createTestnetChain(rpcUrl);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
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
  const [latestNonce, pendingNonce] = await Promise.all([
    publicClient.getTransactionCount({
      address: account.address,
      blockTag: "latest",
    }),
    publicClient.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    }),
  ]);
  let nonce = Math.max(
    latestNonce,
    pendingNonce,
    nextNonceByAddress.get(account.address) ?? 0,
  );
  let hash: Hex | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      hash = await walletClient.sendTransaction({
        account,
        chain: walletClient.chain ?? null,
        to,
        value,
        data: calldata,
        nonce,
      });
      nextNonceByAddress.set(account.address, nonce + 1);
      break;
    } catch (error) {
      if (
        !String(error).toLowerCase().includes("nonce too low") ||
        attempt === 2
      ) {
        throw error;
      }
      nonce += 1;
      nextNonceByAddress.set(account.address, nonce);
    }
  }

  if (!hash) {
    throw new Error(`Failed to send ${label} transaction`);
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  expect(receipt.status, `${label} transaction ${hash}`).toBe("success");

  return { hash, receipt };
}

let contextPromise: Promise<TestContext> | undefined;
let daoContextPromise: Promise<DaoContext> | undefined;
const nextNonceByAddress = new Map<Hex, number>();

async function getTestContext(): Promise<TestContext> {
  contextPromise ??= (async () => {
    const wallet = await setupWallet();
    const { spaceId, spaceIdHex } = await ensurePersonalSpace({
      ...wallet,
      accountAddress: wallet.account.address,
    });

    return {
      ...wallet,
      spaceId,
      spaceIdHex,
      authorSpaceId: spaceId,
    };
  })();

  return contextPromise;
}

async function publishOps(
  context: TestContext,
  name: string,
  ops: Op[],
  spaceId = context.spaceId,
) {
  const publish = await geo.personalSpaces.publishEdit({
    name,
    spaceId,
    author: context.authorSpaceId,
    ops,
  });

  await sendTransactionAndWait(context, {
    label: name,
    to: publish.to,
    calldata: publish.calldata,
  });

  return publish;
}

async function createIndexedEntity(
  context: TestContext,
  name = uniqueName("E2E New Entity"),
) {
  const entity = Ops.entities.create({ name });
  await publishOps(context, `Publish ${name}`, entity.ops);
  await waitForEntityName(entity.id, context.spaceId, name);

  return entity;
}

async function getDaoContext(): Promise<DaoContext> {
  daoContextPromise ??= (async () => {
    const context = await getTestContext();
    const daoName = uniqueName("E2E New DAO Space");
    const daoSpace = await geo.daoSpaces.create({
      name: daoName,
      votingSettings: {
        slowPathPercentageThreshold: 50,
        fastPathFlatThreshold: 1,
        quorum: 1,
        durationInDays: 2,
      },
      initialEditorSpaceIds: [context.spaceIdHex],
      author: context.authorSpaceId,
    });
    const daoCreateTx = await sendTransactionAndWait(context, {
      label: "create new API DAO space",
      to: daoSpace.to,
      calldata: daoSpace.calldata,
    });

    const daoSpaceAddress = daoCreateTx.receipt.logs.find(
      (log) => log.address.toLowerCase() !== daoSpace.to.toLowerCase(),
    )?.address as Hex | undefined;
    if (!daoSpaceAddress) {
      throw new Error("Could not find DAO space address in creation logs");
    }

    const daoSpaceIdHex = await getSpaceIdHex(
      context.publicClient,
      daoSpaceAddress,
    );
    expect(daoSpaceIdHex.toLowerCase()).not.toBe(EMPTY_SPACE_ID.toLowerCase());
    const daoSpaceId = hexToUuid(daoSpaceIdHex);
    await waitForEntityName(daoSpace.spaceEntityId, daoSpaceId, daoName);
    await waitForSpaceTopicId(daoSpaceId, daoSpace.spaceEntityId);

    return {
      ...context,
      daoSpaceAddress,
      daoSpaceId,
      daoSpaceIdHex,
      daoSpaceEntityId: daoSpace.spaceEntityId,
    };
  })();

  return daoContextPromise;
}

async function createAddMemberProposal(context: DaoContext, label: string) {
  const proposal = geo.daoSpaces.proposeAddMember({
    authorSpaceId: context.spaceIdHex,
    spaceId: context.daoSpaceIdHex,
    daoSpaceAddress: context.daoSpaceAddress,
    newMemberSpaceId: context.spaceIdHex,
  });
  await sendTransactionAndWait(context, {
    label,
    to: proposal.to,
    calldata: proposal.calldata,
  });
  await waitForProposal(proposal.proposalId, {
    daoSpaceId: context.daoSpaceId,
    proposedBy: context.authorSpaceId,
    votingMode: "SLOW",
    actionType: "ADD_MEMBER",
    targetId: context.spaceId,
  });

  return proposal;
}

describe.skip("new API e2e surface", () => {
  // describe.sequential("new API e2e surface", () => {
  it(
    "geo.personalSpaces.hasSpace validates the account space onchain",
    async () => {
      const context = await getTestContext();
      const hasSpace = await geo.personalSpaces.hasSpace({
        address: context.account.address,
      });

      expect(hasSpace).toBe(true);

      const spaceAddress = (await context.publicClient.readContract({
        address: requireTestnetContract("SPACE_REGISTRY_ADDRESS"),
        abi: SpaceRegistryAbi,
        functionName: "spaceIdToAddress",
        args: [context.spaceIdHex],
      })) as Hex;
      expect(spaceAddress.toLowerCase()).not.toBe(ZERO_ADDRESS.toLowerCase());
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.personalSpaces.setTopic updates the indexed space topic and restores the previous topic",
    async () => {
      const context = await getTestContext();
      const previousTopicId = await readSpaceTopicId(context.spaceId);
      let randomTopicId = generate();
      if (previousTopicId && randomTopicId === previousTopicId) {
        randomTopicId = generate();
      }

      const setRandomTopic = geo.personalSpaces.setTopic({
        spaceId: context.spaceId,
        topicId: randomTopicId,
      });

      try {
        await sendTransactionAndWait(context, {
          label: "set random personal space topic",
          to: setRandomTopic.to,
          calldata: setRandomTopic.calldata,
        });
        await waitForSpaceTopicId(context.spaceId, randomTopicId);
      } finally {
        if (previousTopicId) {
          const restoreTopic = geo.personalSpaces.setTopic({
            spaceId: context.spaceId,
            topicId: previousTopicId,
          });
          await sendTransactionAndWait(context, {
            label: "restore personal space topic",
            to: restoreTopic.to,
            calldata: restoreTopic.calldata,
          });
          await waitForSpaceTopicId(context.spaceId, previousTopicId);
        }
      }
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.api.graphql reads indexed entity state",
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(
        context,
        uniqueName("E2E New API GraphQL Entity"),
      );
      const data = await queryGraph<EntityQueryResponse>(
        entityQuery(entity.id, context.spaceId),
      );

      expect(data.entity?.id).toBe(entity.id);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.storage.uploadCSV uploads CSV data",
    async () => {
      const csvCid = await geo.storage.uploadCSV(
        `name,run\nNew API surface,${Date.now().toString(36)}`,
      );

      expect(csvCid).toMatch(/^ipfs:\/\//);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.storage.uploadImage uploads an image and returns dimensions",
    async () => {
      const uploadedImage = await geo.storage.uploadImage({
        blob: tinyPngBlob(),
      });

      expect(uploadedImage.cid).toMatch(/^ipfs:\/\//);
      expect(uploadedImage.dimensions).toEqual({ width: 1, height: 1 });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.images.create builds publishable image ops",
    async () => {
      const context = await getTestContext();
      const imageName = uniqueName("E2E New Image");
      const image = await geo.images.create({
        blob: tinyPngBlob(),
        name: imageName,
        description: "Created by the new API e2e surface test",
      });

      expect(image.cid).toMatch(/^ipfs:\/\//);
      await publishOps(context, "E2E new API image", image.ops);
      await waitForEntityName(image.id, context.spaceId, imageName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.personalSpaces.publishEdit publishes ops into an indexed personal space",
    async () => {
      const context = await getTestContext();
      const entityName = uniqueName("E2E New Publish Edit Entity");
      const entity = Ops.entities.create({ name: entityName });

      await publishOps(context, "E2E new API personal publish", entity.ops);
      await waitForEntityName(entity.id, context.spaceId, entityName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "Ops.properties.create creates an indexed property entity",
    async () => {
      const context = await getTestContext();
      const propertyName = uniqueName("E2E New Property");
      const property = Ops.properties.create({
        name: propertyName,
        dataType: "TEXT",
      });

      await publishOps(context, "E2E new API property", property.ops);
      await waitForEntityName(property.id, context.spaceId, propertyName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "Ops.types.create creates an indexed type entity",
    async () => {
      const context = await getTestContext();
      const property = Ops.properties.create({
        name: uniqueName("E2E New Type Property"),
        dataType: "TEXT",
      });
      const typeName = uniqueName("E2E New Type");
      const type = Ops.types.create({
        name: typeName,
        properties: [property.id],
      });

      await publishOps(context, "E2E new API type", [
        ...property.ops,
        ...type.ops,
      ]);
      await waitForEntityName(type.id, context.spaceId, typeName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "Ops.entities.create creates an indexed entity",
    async () => {
      const context = await getTestContext();
      const entityName = uniqueName("E2E New Entity");
      const entity = Ops.entities.create({
        name: entityName,
        description: "Created through the new API e2e surface test",
      });

      await publishOps(context, "E2E new API entity", entity.ops);
      await waitForEntityName(entity.id, context.spaceId, entityName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "Ops.entities.update updates an indexed entity",
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(
        context,
        uniqueName("E2E New Entity To Update"),
      );
      const updatedName = `${entity.id} updated`;
      const update = Ops.entities.update({
        id: entity.id,
        name: updatedName,
        unset: [{ property: DESCRIPTION_PROPERTY }],
      });

      await publishOps(context, "E2E new API entity update", update.ops);
      await waitForEntityName(entity.id, context.spaceId, updatedName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "Ops.relations.create creates an indexed relation",
    async () => {
      const context = await getTestContext();
      const fromName = uniqueName("E2E New Relation From");
      const toName = uniqueName("E2E New Relation To");
      const from = Ops.entities.create({ name: fromName });
      const to = Ops.entities.create({ name: toName });
      const relation = Ops.relations.create({
        fromEntity: from.id,
        toEntity: to.id,
        type: RELATION_TYPE,
        position: "a0",
      });

      await publishOps(context, "E2E new API relation", [
        ...from.ops,
        ...to.ops,
        ...relation.ops,
      ]);
      const entity = await waitForEntityName(
        from.id,
        context.spaceId,
        fromName,
      );
      expect(entity?.relationsList.map((item) => item.id)).toContain(
        relation.id,
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "Ops.relations.update keeps an updated relation indexed",
    async () => {
      const context = await getTestContext();
      const fromName = uniqueName("E2E New Relation Update From");
      const from = Ops.entities.create({ name: fromName });
      const to = Ops.entities.create({
        name: uniqueName("E2E New Relation Update To"),
      });
      const relation = Ops.relations.create({
        fromEntity: from.id,
        toEntity: to.id,
        type: RELATION_TYPE,
        position: "a0",
      });
      const update = Ops.relations.update({
        id: relation.id,
        position: "a1",
      });

      await publishOps(context, "E2E new API relation update", [
        ...from.ops,
        ...to.ops,
        ...relation.ops,
        ...update.ops,
      ]);
      const entity = await waitForEntityName(
        from.id,
        context.spaceId,
        fromName,
      );
      expect(entity?.relationsList.map((item) => item.id)).toContain(
        relation.id,
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "Ops.relations.delete removes an indexed relation",
    async () => {
      const context = await getTestContext();
      const fromName = uniqueName("E2E New Relation Delete From");
      const from = Ops.entities.create({ name: fromName });
      const to = Ops.entities.create({
        name: uniqueName("E2E New Relation Delete To"),
      });
      const relation = Ops.relations.create({
        fromEntity: from.id,
        toEntity: to.id,
        type: RELATION_TYPE,
      });
      await publishOps(context, "E2E new API relation delete setup", [
        ...from.ops,
        ...to.ops,
        ...relation.ops,
      ]);
      await waitForEntityName(from.id, context.spaceId, fromName);

      const deleteRelation = Ops.relations.delete({ id: relation.id });
      await publishOps(
        context,
        "E2E new API relation delete",
        deleteRelation.ops,
      );
      await waitFor(
        `relation ${relation.id} deletion`,
        () =>
          queryGraph<EntityQueryResponse>(
            entityQuery(from.id, context.spaceId),
          ),
        (value) =>
          !(value.entity?.relationsList ?? []).some(
            (item) => item.id === relation.id,
          ),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "Ops.proposalReviews.create creates an indexed proposal review",
    async () => {
      const context = await getTestContext();
      const proposal = await createIndexedEntity(
        context,
        uniqueName("E2E New Reviewed Proposal"),
      );
      const reviewName = uniqueName("E2E New Proposal Review");
      const review = Ops.proposalReviews.create({
        proposal: { id: proposal.id, name: reviewName },
        pass: true,
        content: "The proposal looks good.",
        completeness: 1,
        accuracy: 0.8,
        skill: 0.8,
        effort: 0.6,
      });

      await publishOps(context, "E2E new API proposal review", review.ops);
      await waitForEntityName(review.id, context.spaceId, reviewName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "Ops.proposalReviews.update updates an indexed proposal review",
    async () => {
      const context = await getTestContext();
      const proposal = await createIndexedEntity(
        context,
        uniqueName("E2E New Reviewed Proposal Update"),
      );
      const reviewName = uniqueName("E2E New Proposal Review Update");
      const review = Ops.proposalReviews.create({
        proposal: { id: proposal.id, name: reviewName },
        pass: true,
        content: "The proposal looks good.",
      });
      await publishOps(
        context,
        "E2E new API proposal review setup",
        review.ops,
      );
      await waitForEntityName(review.id, context.spaceId, reviewName);

      const reviewUpdate = Ops.proposalReviews.update({
        proposalReviewId: review.id,
        pass: false,
        content: "Updated review content.",
      });
      await publishOps(
        context,
        "E2E new API proposal review update",
        reviewUpdate.ops,
      );
      await waitForEntityName(review.id, context.spaceId, reviewName);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.comments.create creates indexed comments with reply-to chains",
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(
        context,
        uniqueName("E2E New Commented Entity"),
      );
      const commentAContent = "New API comment A on the entity";
      const commentA = await geo.comments.create({
        content: commentAContent,
        replyTo: { entityId: entity.id, spaceId: context.spaceId },
      });
      expect(filterReplyToRelations(commentA.ops)).toHaveLength(1);
      await publishOps(context, "E2E new API comment A", commentA.ops);
      await waitForEntityName(
        commentA.id,
        context.spaceId,
        deriveCommentName(commentAContent),
      );
      await waitForReplyToRelations(commentA.id, [entity.id]);

      const commentBContent = "New API comment B on comment A";
      const commentB = await geo.comments.create({
        content: commentBContent,
        replyTo: { entityId: commentA.id, spaceId: context.spaceId },
      });
      expect(filterReplyToRelations(commentB.ops)).toHaveLength(2);
      await publishOps(context, "E2E new API comment B", commentB.ops);
      await waitForEntityName(
        commentB.id,
        context.spaceId,
        deriveCommentName(commentBContent),
      );
      await waitForReplyToRelations(commentB.id, [commentA.id, entity.id]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.comments.update updates an indexed comment",
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(
        context,
        uniqueName("E2E New Comment Update Entity"),
      );
      const comment = await geo.comments.create({
        content: "New API comment before update",
        replyTo: { entityId: entity.id, spaceId: context.spaceId },
      });
      await publishOps(
        context,
        "E2E new API comment update setup",
        comment.ops,
      );
      await waitForEntityName(
        comment.id,
        context.spaceId,
        deriveCommentName("New API comment before update"),
      );

      const updatedContent = "New API comment after update";
      const update = geo.comments.update({
        id: comment.id,
        content: updatedContent,
        resolved: true,
      });
      await publishOps(context, "E2E new API comment update", update.ops);
      await waitForEntityName(
        comment.id,
        context.spaceId,
        deriveCommentName(updatedContent),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.entities.delete removes indexed entity values and relations",
    async () => {
      const context = await getTestContext();
      const related = await createIndexedEntity(
        context,
        uniqueName("E2E New Delete Related Entity"),
      );
      const deleteContextName = uniqueName("E2E New Entity To Delete");
      const deleteContextEntity = Ops.entities.create({
        name: deleteContextName,
      });
      const deleteContextRelation = Ops.relations.create({
        fromEntity: deleteContextEntity.id,
        toEntity: related.id,
        type: RELATION_TYPE,
      });
      await publishOps(context, "E2E new API create entity for deletion", [
        ...deleteContextEntity.ops,
        ...deleteContextRelation.ops,
      ]);
      await waitForEntityName(
        deleteContextEntity.id,
        context.spaceId,
        deleteContextName,
      );

      const deleteResult = await geo.entities.delete({
        id: deleteContextEntity.id,
        spaceId: context.spaceId,
      });
      expect(deleteResult.ops.length).toBeGreaterThan(0);
      await publishOps(context, "E2E new API delete entity", deleteResult.ops);
      await waitForEntityDeleted(deleteContextEntity.id, context.spaceId);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.entityVotes.upvote submits and indexes an upvote",
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(
        context,
        uniqueName("E2E New Upvoted Entity"),
      );
      const upvote = geo.entityVotes.upvote({
        authorSpaceId: context.authorSpaceId,
        spaceId: context.spaceId,
        entityId: entity.id,
      });
      await sendTransactionAndWait(context, {
        label: "E2E new API upvote entity",
        to: upvote.to,
        calldata: upvote.calldata,
      });
      await waitForEntityVote(
        entity.id,
        context.authorSpaceId,
        context.spaceId,
        (votes) => votes.some((vote) => vote.vote === 0),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.entityVotes.downvote submits and indexes a downvote",
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(
        context,
        uniqueName("E2E New Downvoted Entity"),
      );
      const downvote = geo.entityVotes.downvote({
        authorSpaceId: context.authorSpaceId,
        spaceId: context.spaceId,
        entityId: entity.id,
      });
      await sendTransactionAndWait(context, {
        label: "E2E new API downvote entity",
        to: downvote.to,
        calldata: downvote.calldata,
      });
      await waitForEntityVote(
        entity.id,
        context.authorSpaceId,
        context.spaceId,
        (votes) => votes.some((vote) => vote.vote === 1),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.entityVotes.withdraw removes an indexed entity vote",
    async () => {
      const context = await getTestContext();
      const entity = await createIndexedEntity(
        context,
        uniqueName("E2E New Vote Withdraw Entity"),
      );
      const upvote = geo.entityVotes.upvote({
        authorSpaceId: context.authorSpaceId,
        spaceId: context.spaceId,
        entityId: entity.id,
      });
      await sendTransactionAndWait(context, {
        label: "E2E new API upvote before withdraw",
        to: upvote.to,
        calldata: upvote.calldata,
      });
      await waitForEntityVote(
        entity.id,
        context.authorSpaceId,
        context.spaceId,
        (votes) => votes.length > 0,
      );

      const withdraw = geo.entityVotes.withdraw({
        authorSpaceId: context.authorSpaceId,
        spaceId: context.spaceId,
        entityId: entity.id,
      });
      await sendTransactionAndWait(context, {
        label: "E2E new API withdraw entity vote",
        to: withdraw.to,
        calldata: withdraw.calldata,
      });
      await waitForEntityVote(
        entity.id,
        context.authorSpaceId,
        context.spaceId,
        (votes) => votes.some((vote) => vote.vote === 2),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.create creates an indexed DAO space",
    async () => {
      const dao = await getDaoContext();

      expect(dao.daoSpaceAddress.toLowerCase()).not.toBe(
        ZERO_ADDRESS.toLowerCase(),
      );
      expect(dao.daoSpaceIdHex.toLowerCase()).not.toBe(
        EMPTY_SPACE_ID.toLowerCase(),
      );
      expect(await readSpaceTopicId(dao.daoSpaceId)).toBe(dao.daoSpaceEntityId);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposeEdit creates an indexed publish proposal",
    async () => {
      const dao = await getDaoContext();
      const daoEntity = Ops.entities.create({
        name: uniqueName("E2E New DAO Proposed Entity"),
      });
      const proposal = await geo.daoSpaces.proposeEdit({
        name: "E2E new API DAO propose edit",
        ops: daoEntity.ops,
        author: dao.authorSpaceId,
        daoSpaceAddress: dao.daoSpaceAddress,
        callerSpaceId: dao.spaceIdHex,
        daoSpaceId: dao.daoSpaceIdHex,
        votingMode: "FAST",
      });
      await sendTransactionAndWait(dao, {
        label: "new API DAO propose edit",
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.authorSpaceId,
        votingMode: "FAST",
        actionType: "PUBLISH",
        contentUri: proposal.cid,
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposeAddMember creates an indexed add-member proposal",
    async () => {
      const dao = await getDaoContext();
      await createAddMemberProposal(dao, "new API DAO propose add member");
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposeRemoveMember creates an indexed remove-member proposal",
    async () => {
      const dao = await getDaoContext();
      const proposal = geo.daoSpaces.proposeRemoveMember({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        daoSpaceAddress: dao.daoSpaceAddress,
        memberToRemoveSpaceId: dao.spaceIdHex,
      });
      await sendTransactionAndWait(dao, {
        label: "new API DAO propose remove member",
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.authorSpaceId,
        votingMode: "SLOW",
        actionType: "REMOVE_MEMBER",
        targetId: dao.spaceId,
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposeAddEditor creates an indexed add-editor proposal",
    async () => {
      const dao = await getDaoContext();
      const proposal = geo.daoSpaces.proposeAddEditor({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        daoSpaceAddress: dao.daoSpaceAddress,
        newEditorSpaceId: dao.spaceIdHex,
      });
      await sendTransactionAndWait(dao, {
        label: "new API DAO propose add editor",
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.authorSpaceId,
        votingMode: "SLOW",
        actionType: "ADD_EDITOR",
        targetId: dao.spaceId,
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposeAddEditor rejects FAST voting mode",
    async () => {
      const dao = await getDaoContext();

      expect(() =>
        geo.daoSpaces.proposeAddEditor({
          authorSpaceId: dao.spaceIdHex,
          spaceId: dao.daoSpaceIdHex,
          daoSpaceAddress: dao.daoSpaceAddress,
          newEditorSpaceId: dao.spaceIdHex,
          votingMode: "FAST" as "SLOW",
        }),
      ).toThrow("proposeAddEditor only supports SLOW voting mode");
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposeRemoveEditor creates an indexed remove-editor proposal",
    async () => {
      const dao = await getDaoContext();
      const proposal = geo.daoSpaces.proposeRemoveEditor({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        daoSpaceAddress: dao.daoSpaceAddress,
        editorToRemoveSpaceId: dao.spaceIdHex,
      });
      await sendTransactionAndWait(dao, {
        label: "new API DAO propose remove editor",
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.authorSpaceId,
        votingMode: "SLOW",
        actionType: "REMOVE_EDITOR",
        targetId: dao.spaceId,
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposeRequestMembership creates an indexed membership proposal",
    async () => {
      const dao = await getDaoContext();
      const proposal = geo.daoSpaces.proposeRequestMembership({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
      });
      await sendTransactionAndWait(dao, {
        label: "new API DAO propose request membership",
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.daoSpaceId,
        votingMode: "FAST",
        actionType: "ADD_MEMBER",
        targetId: dao.authorSpaceId,
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposals.create creates an indexed custom proposal",
    async () => {
      const dao = await getDaoContext();
      const proposal = geo.daoSpaces.proposals.create({
        fromSpaceId: dao.spaceIdHex,
        daoSpaceId: dao.daoSpaceIdHex,
        actions: [
          geo.daoSpaces.proposals.actions.addMember(
            dao.daoSpaceAddress,
            dao.spaceIdHex,
          ),
        ],
      });
      await sendTransactionAndWait(dao, {
        label: "new API DAO custom proposal",
        to: proposal.to,
        calldata: proposal.calldata,
      });
      await waitForProposal(proposal.proposalId, {
        daoSpaceId: dao.daoSpaceId,
        proposedBy: dao.authorSpaceId,
        votingMode: "FAST",
        actionType: "ADD_MEMBER",
        targetId: dao.spaceId,
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposals.vote creates an indexed proposal vote",
    async () => {
      const dao = await getDaoContext();
      const proposal = await createAddMemberProposal(
        dao,
        "new API DAO proposal for vote",
      );
      const vote = geo.daoSpaces.proposals.vote({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        proposalId: proposal.proposalId,
        vote: "YES",
      });
      await sendTransactionAndWait(dao, {
        label: "new API DAO vote proposal",
        to: vote.to,
        calldata: vote.calldata,
      });
      await waitForProposalVote(
        proposal.proposalId,
        dao.authorSpaceId,
        dao.daoSpaceId,
        "YES",
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposals.execute builds execute calldata for an indexed proposal",
    async () => {
      const dao = await getDaoContext();
      const proposal = await createAddMemberProposal(
        dao,
        "new API DAO proposal for execute calldata",
      );
      const execute = geo.daoSpaces.proposals.execute({
        authorSpaceId: dao.spaceIdHex,
        spaceId: dao.daoSpaceIdHex,
        proposalId: proposal.proposalId,
      });

      expect(execute.to).toBe(requireTestnetContract("SPACE_REGISTRY_ADDRESS"));
      expect(execute.calldata).toMatch(/^0x[0-9a-fA-F]+$/);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "geo.daoSpaces.proposals.actions build proposal actions for custom proposals",
    async () => {
      const dao = await getDaoContext();
      const publishAction = geo.daoSpaces.proposals.actions.publishEdit(
        dao.daoSpaceAddress,
        "ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5",
      );
      const updateVotingAction =
        geo.daoSpaces.proposals.actions.updateVotingSettings(
          dao.daoSpaceAddress,
          {
            slowPathPercentageThreshold: 50,
            fastPathFlatThreshold: 1,
            quorum: 1,
            durationInDays: 2,
          },
        );

      expect(publishAction.to).toBe(dao.daoSpaceAddress);
      expect(updateVotingAction.to).toBe(dao.daoSpaceAddress);
      expect(
        geo.daoSpaces.proposals.actions.addMember(
          dao.daoSpaceAddress,
          dao.spaceIdHex,
        ).data,
      ).toMatch(/^0x/);
      expect(
        geo.daoSpaces.proposals.actions.removeMember(
          dao.daoSpaceAddress,
          dao.spaceIdHex,
        ).data,
      ).toMatch(/^0x/);
      expect(
        geo.daoSpaces.proposals.actions.addEditor(
          dao.daoSpaceAddress,
          dao.spaceIdHex,
        ).data,
      ).toMatch(/^0x/);
      expect(
        geo.daoSpaces.proposals.actions.removeEditor(
          dao.daoSpaceAddress,
          dao.spaceIdHex,
        ).data,
      ).toMatch(/^0x/);
    },
    TEST_TIMEOUT_MS,
  );
});
