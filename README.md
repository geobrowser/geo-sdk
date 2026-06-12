# Geo SDK

A collection of tools for interacting with The Graph.

## Installing

```sh
npm install @geoprotocol/geo-sdk
```

## AI Harnesses

If you're using an AI coding assistant (e.g. Claude Code, Codex, Cursor) to work with this SDK, check out [geobrowser/geo-skills](https://github.com/geobrowser/geo-skills) for skills and prompts that help agents use the Geo SDK effectively.

## Overview

### Data Flow

Data in The Graph lives both offchain and onchain. This data is written to IPFS, and the resulting content identifier is then posted onchain before being read by the indexing stack. After the indexer finishes processing the data it's exposed by the API.

![CleanShot 2025-01-22 at 10 51 23@2x](https://github.com/user-attachments/assets/f0cee8e0-43f9-4663-a2e7-54de6d962115)

### Spaces

On The Graph, knowledge is organized into spaces. Anyone can create a space for a community, project or individual. Spaces are organized onchain into a set of smart contracts. These contracts represent the space itself, its data and its governance process.

### Entities

An entity is a unique identifier representing a person, a place, an idea, a concept, or anything else. Entities are composed from triples and relations that describe what the entity is. An entity's data can be composed from multiple spaces at once. This property is what enables pluralism within The Graph.

[More about entities and knowledge graphs](https://www.geobrowser.io/space/720eb279c64d56735dccd17a2a416ba2/a72654b014fa405bbf1250ba901bc082)

### Relations

Relations describe the edges within the graph. Relations are themselves entities that include details about the relationship. For example, a Company can have Team Members. Each Team Member relation can have an attribute describing when the person joined the team. This is a property graph model.

### Ops And Edits

Data in The Graph is stored as an Op (operation). Ops represent a set of changes applied to entities. A change could be setting or deleting a triple or a relation. Both triples and relations are represented as Ops.

When writing data, these ops are grouped into a logical set called an edit. An edit has a name, authors, and metadata to represent the set of changes. This edit is encoded into a binary representation before being uploaded to IPFS.

[Ops and edits in GRC-20](https://github.com/yanivtal/graph-improvement-proposals/blob/new-ops/grcs/0020-knowledge-graph.md#101-operations-op)

## Using

The preferred API has two parts:

- `Ops` builds GRC-20 operations.
- `createGeoClient(...)` handles configured workflows such as API calls, uploads, RPC reads, and transaction calldata.

```ts
import { GeoTestnetConfig, Ops, createGeoClient } from "@geoprotocol/geo-sdk";

const geo = createGeoClient({ network: GeoTestnetConfig });

const { id: entityId, ops } = Ops.entities.create({
  name: "Test Entity",
  description: "Created with the new API",
});

const tx = await geo.personalSpaces.publishEdit({
  name: "Create Test Entity",
  spaceId,
  author: spaceId,
  ops,
});

await walletClient.sendTransaction({ to: tx.to, data: tx.calldata });
```

### Imports

Use the root package when convenience matters:

```ts
import { GeoTestnetConfig, Ops, createGeoClient } from "@geoprotocol/geo-sdk";
```

Subpath exports are available for bundle-sensitive code

```ts
import { entities, relations } from "@geoprotocol/geo-sdk/ops";
import { createGeoClient } from "@geoprotocol/geo-sdk/client";
import {
  GeoTestnetConfig,
  defineGeoNetworkConfig,
} from "@geoprotocol/geo-sdk/networks";
```

Use `Ops` from `@geoprotocol/geo-sdk` for op builders. Configured workflows live behind `createGeoClient`.

### Network Configuration

Use the built-in testnet config:

```ts
import { GeoTestnetConfig, createGeoClient } from "@geoprotocol/geo-sdk";

const geo = createGeoClient({ network: GeoTestnetConfig });

console.log(geo.network.id); // "TESTNET"
```

`network` is required, and the client expects the full config object. Pass `GeoTestnetConfig`, not the string `"TESTNET"`.

Define a custom deployment:

```ts
import { createGeoClient, defineGeoNetworkConfig } from "@geoprotocol/geo-sdk";

const local = defineGeoNetworkConfig({
  id: "LOCAL",
  name: "Local Geo",
  apiOrigin: "http://localhost:3000",
  chain: {
    id: 31337,
    name: "Anvil",
    rpcUrl: "http://localhost:8545",
  },
  contracts: {
    SPACE_REGISTRY_ADDRESS: "0x0000000000000000000000000000000000000001",
    DAO_SPACE_FACTORY_ADDRESS: "0x0000000000000000000000000000000000000002",
  },
});

const geo = createGeoClient({ network: local });
```

Pass a fetch implementation when your runtime does not provide `globalThis.fetch`, or when you want test isolation:

```ts
const geo = createGeoClient({
  network: GeoTestnetConfig,
  fetch: customFetch,
});
```

## Ops API

Ops functions build operation arrays that can be combined before publishing.

```ts
import type { Op } from "@geoprotocol/geo-sdk";

const ops: Op[] = [];
ops.push(...entityOps);
ops.push(...relationOps);
```

### Properties, Types, And Entities

Create a property, a type, and an entity:

```ts
import { Ops } from "@geoprotocol/geo-sdk";

const { id: websitePropertyId, ops: propertyOps } = Ops.properties.create({
  name: "Website",
  dataType: "TEXT",
});

const { id: restaurantTypeId, ops: typeOps } = Ops.types.create({
  name: "Restaurant",
  properties: [websitePropertyId],
});

const { id: restaurantId, ops: entityOps } = Ops.entities.create({
  name: "Yum Yum",
  description: "A restaurant serving fusion cuisine",
  types: [restaurantTypeId],
  values: [
    {
      property: websitePropertyId,
      type: "text",
      value: "https://example.com",
    },
  ],
});

const ops = [...propertyOps, ...typeOps, ...entityOps];
```

Update an entity:

```ts
const { ops } = Ops.entities.update({
  id: restaurantId,
  name: "Yum Yum Kitchen",
  values: [
    {
      property: websitePropertyId,
      type: "text",
      value: "https://yum.example",
    },
  ],
});
```

Unset property values:

```ts
const { ops } = Ops.entities.update({
  id: restaurantId,
  unset: [
    { property: websitePropertyId },
    { property: descriptionPropertyId, language: "all" },
  ],
});
```

Create relation properties:

```ts
const { id: likesPropertyId, ops } = Ops.properties.create({
  name: "Likes",
  dataType: "RELATION",
  relationValueTypes: [restaurantTypeId],
});
```

### Typed Values

Entity values are typed objects. The `type` field determines the value shape:

```ts
import { Ops } from "@geoprotocol/geo-sdk";

const { ops } = Ops.entities.create({
  name: "Cafe visit",
  values: [
    { property: namePropertyId, type: "text", value: "Morning Coffee" },
    { property: openPropertyId, type: "boolean", value: true },
    { property: visitsPropertyId, type: "integer", value: 42 },
    { property: ratingPropertyId, type: "float", value: 4.8 },
    { property: openedDatePropertyId, type: "date", value: "2024-01-15" },
    { property: opensAtPropertyId, type: "time", value: "08:30:00Z" },
    {
      property: reviewedAtPropertyId,
      type: "datetime",
      value: "2024-01-15T14:30:00Z",
    },
    {
      property: schedulePropertyId,
      type: "schedule",
      value: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    },
    {
      property: locationPropertyId,
      type: "point",
      lon: -122.4194,
      lat: 37.7749,
    },
    {
      property: bytesPropertyId,
      type: "bytes",
      value: new Uint8Array([1, 2, 3]),
    },
  ],
});
```

### Relations

Create, update, and delete relation entities:

```ts
import { Ops, Position } from "@geoprotocol/geo-sdk";

const { id: relationId, ops: createRelationOps } = Ops.relations.create({
  fromEntity: personId,
  toEntity: restaurantId,
  type: likesPropertyId,
  position: Position.generate(),
});

const { ops: updateRelationOps } = Ops.relations.update({
  id: relationId,
  position: Position.generateBetween(previousPosition, nextPosition),
});

const { ops: deleteRelationOps } = Ops.relations.delete({
  id: relationId,
});
```

Relations can also carry their own entity values:

```ts
const { ops } = Ops.relations.create({
  fromEntity: personId,
  toEntity: companyId,
  type: teamMemberPropertyId,
  entityName: "Team member",
  entityValues: [
    {
      property: joinedDatePropertyId,
      type: "date",
      value: "2024-05-01",
    },
  ],
});
```

### Images

Image creation goes through `geo.images.create(...)`. The configured client uploads the image, detects dimensions when possible, and returns the image entity ops.

### Comments

Create a comment on an entity:

```ts
import { Ops } from "@geoprotocol/geo-sdk";

const { id: commentId, ops } = Ops.comments.create({
  content: "Looks good to me.",
  replyTo: {
    entityId,
    spaceId,
  },
});
```

Create a nested comment when you already have reply-chain context:

```ts
const { ops } = Ops.comments.create({
  content: "Replying to the parent comment.",
  replyTo: {
    entityId: parentCommentId,
    spaceId,
  },
  replyToRelations: [
    {
      entityId: rootEntityId,
      spaceId,
      position: "a0",
    },
  ],
});
```

Update a comment:

```ts
const { ops } = Ops.comments.update({
  id: commentId,
  content: "Updated comment text.",
  resolved: true,
});
```

Use `geo.comments.create(...)` when reply-chain context should be fetched from the configured API.

### Proposal Reviews

Create and update proposal review ops:

```ts
import { Ops } from "@geoprotocol/geo-sdk";

const { id: reviewId, ops: createReviewOps } = Ops.proposalReviews.create({
  proposal: {
    id: proposalId,
    name: "Improve restaurant data",
  },
  pass: true,
  content: "The proposal is complete and accurate.",
  completeness: 1,
  accuracy: 0.8,
  skill: 0.8,
  effort: 0.6,
});

const { ops: updateReviewOps } = Ops.proposalReviews.update({
  proposalReviewId: reviewId,
  pass: false,
  content: "Needs more sources.",
});
```

## Client API

Create a configured client once and use it for workflows that need API origins, uploads, RPC URLs, or contract addresses.

```ts
import { GeoTestnetConfig, Ops, createGeoClient } from "@geoprotocol/geo-sdk";

const geo = createGeoClient({ network: GeoTestnetConfig });
```

### `geo.api`

Use `geo.api.graphql(...)` for low-level GraphQL requests:

```ts
const response = await geo.api.graphql<{
  entity: { id: string; name: string | null } | null;
}>(`
  query {
    entity(id: "3af3e22d21694a078681516710b7ecf1") {
      id
      name
    }
  }
`);

if (response.errors) {
  console.error(response.errors);
}
```

Use `geo.api.getEditCalldata(...)` when calldata must come from the API:

```ts
const { to, data } = await geo.api.getEditCalldata({
  spaceId,
  cid: "ipfs://bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
});

await walletClient.sendTransaction({ to, data });
```

For personal-space edits, prefer `geo.personalSpaces.publishEdit(...)`.

### `geo.images`

Upload an image and build image entity ops in one call:

```ts
const imageFromUrl = await geo.images.create({
  url: "https://example.com/cover.png",
  name: "Cover image",
  description: "Image used as the space cover.",
});

console.log(imageFromUrl.id);
console.log(imageFromUrl.cid);
console.log(imageFromUrl.ops);
```

You can also pass a `Blob` directly:

```ts
const file = new Blob([imageBytes], { type: "image/png" });

const imageFromBlob = await geo.images.create({
  blob: file,
  name: "Cover image",
});

console.log(imageFromBlob.cid);
```

### `geo.storage`

Use `geo.images.create(...)` when you want to upload an image and create image entity ops in one call. Use `geo.storage.uploadImage(...)` only when you need the raw uploaded CID and detected dimensions without graph ops:

```ts
const uploaded = await geo.storage.uploadImage({
  url: "https://example.com/photo.png",
});

console.log(uploaded.cid);
console.log(uploaded.dimensions);
```

Upload CSV content:

```ts
const cid = await geo.storage.uploadCSV(`name,score
Alice,10
Bob,8`);
```

### `geo.entities`

Delete an entity from a space:

```ts
const { ops } = await geo.entities.delete({
  id: entityId,
  spaceId,
});
```

Entity deletion queries the configured API for current values and relations in the target space, then builds ops to unset those values and delete those relations. The entity transitions to an empty state in that space; it is not globally destroyed.

### `geo.comments`

Create a comment while preserving reply-to chains:

```ts
const comment = await geo.comments.create({
  content: "This should be easier to find.",
  replyTo: {
    entityId,
    spaceId,
  },
});
```

Reply to another comment:

```ts
const reply = await geo.comments.create({
  content: "Following up here.",
  replyTo: {
    entityId: comment.id,
    spaceId,
  },
});
```

Update a comment:

```ts
const { ops } = geo.comments.update({
  id: comment.id,
  content: "Updated comment text.",
  resolved: true,
});
```

### `geo.personalSpaces`

Check whether an address already has a personal space:

```ts
const hasExistingSpace = await geo.personalSpaces.hasSpace({
  address: account.address,
});
```

Create a personal space:

```ts
const createSpace = geo.personalSpaces.create({
  name: "Alice",
  accountAddress: account.address,
});

await walletClient.sendTransaction({
  to: createSpace.to,
  data: createSpace.calldata,
});
```

`geo.personalSpaces.create(...)` also returns initial profile ops. After the create-space transaction is mined and you know the new `spaceId`, publish those ops into the space and immediately set the generated space entity as the space topic:

```ts
const profileTx = await geo.personalSpaces.publishEdit({
  name: "Create personal space profile",
  spaceId,
  author: spaceId,
  ops: createSpace.ops,
});

await walletClient.sendTransaction({
  to: profileTx.to,
  data: profileTx.calldata,
});

const topicTx = geo.personalSpaces.setTopic({
  spaceId,
  topicId: createSpace.spaceEntityId,
});

await walletClient.sendTransaction({
  to: topicTx.to,
  data: topicTx.calldata,
});
```

Publish any edit to a personal space:

```ts
const { ops } = Ops.entities.create({
  name: "Test Entity",
});

const tx = await geo.personalSpaces.publishEdit({
  name: "Create Test Entity",
  spaceId,
  author: spaceId,
  ops,
});

await walletClient.sendTransaction({
  to: tx.to,
  data: tx.calldata,
});
```

The `author` field is the author's personal space ID, not a wallet address.

### `geo.daoSpaces`

Create a DAO space:

```ts
const tx = await geo.daoSpaces.create({
  name: "Research DAO",
  author: authorSpaceId,
  initialEditorSpaceIds: [authorSpaceId],
  initialMemberSpaceIds: [authorSpaceId],
  votingSettings: {
    slowPathPercentageThreshold: 50,
    fastPathFlatThreshold: 1,
    quorum: 1,
    durationInSeconds: 3 * 24 * 60 * 60,
  },
});

await walletClient.sendTransaction({
  to: tx.to,
  data: tx.calldata,
});
```

Include extra initial ops in the DAO creation edit:

```ts
const { ops } = Ops.entities.create({
  name: "DAO Welcome Page",
});

const tx = await geo.daoSpaces.create({
  name: "Research DAO",
  author: authorSpaceId,
  initialEditorSpaceIds: [authorSpaceId],
  votingSettings,
  ops,
});
```

Resolve a DAO space contract address from a DAO space ID:

```ts
import { zeroAddress } from "viem";
import { SpaceRegistryAbi } from "@geoprotocol/geo-sdk/abis";

const daoSpaceAddress = await publicClient.readContract({
  address: GeoTestnetConfig.contracts.SPACE_REGISTRY_ADDRESS,
  abi: SpaceRegistryAbi,
  functionName: "spaceIdToAddress",
  args: [daoSpaceId],
});

if (daoSpaceAddress === zeroAddress) {
  throw new Error("No DAO space contract found for daoSpaceId.");
}
```

Propose an edit to a DAO space:

```ts
const { ops } = Ops.entities.update({
  id: entityId,
  name: "Updated entity name",
});

const proposal = await geo.daoSpaces.proposeEdit({
  name: "Update entity name",
  ops,
  author: authorSpaceId,
  daoSpaceAddress,
  callerSpaceId: authorSpaceId,
  daoSpaceId,
  votingMode: "FAST",
});

await walletClient.sendTransaction({
  to: proposal.to,
  data: proposal.calldata,
});
```

Manage DAO members and editors:

```ts
const addMember = geo.daoSpaces.proposeAddMember({
  authorSpaceId,
  spaceId: daoSpaceId,
  daoSpaceAddress,
  newMemberSpaceId: memberSpaceId,
  votingMode: "FAST",
});

const removeMember = geo.daoSpaces.proposeRemoveMember({
  authorSpaceId,
  spaceId: daoSpaceId,
  daoSpaceAddress,
  memberToRemoveSpaceId: memberSpaceId,
});

const addEditor = geo.daoSpaces.proposeAddEditor({
  authorSpaceId,
  spaceId: daoSpaceId,
  daoSpaceAddress,
  newEditorSpaceId: editorSpaceId,
});

const removeEditor = geo.daoSpaces.proposeRemoveEditor({
  authorSpaceId,
  spaceId: daoSpaceId,
  daoSpaceAddress,
  editorToRemoveSpaceId: editorSpaceId,
});
```

Editor changes only support `SLOW` voting. Member changes can use the default or an explicit `votingMode`.

Request membership in a DAO space:

```ts
const request = geo.daoSpaces.proposeRequestMembership({
  authorSpaceId: requesterSpaceId,
  spaceId: daoSpaceId,
});

await walletClient.sendTransaction({
  to: request.to,
  data: request.calldata,
});
```

DAO proposal IDs and DAO space IDs are bytes16 hex strings, usually `0x` plus 32 hex characters.

### `geo.daoSpaces.proposals`

Use low-level proposal helpers when you want to assemble proposal actions yourself.

```ts
const actions = [
  geo.daoSpaces.proposals.actions.addMember(daoSpaceAddress, memberSpaceId),
  geo.daoSpaces.proposals.actions.updateVotingSettings(daoSpaceAddress, {
    slowPathPercentageThreshold: 60,
    fastPathFlatThreshold: 2,
    quorum: 3,
    durationInSeconds: 5 * 24 * 60 * 60,
  }),
];

const proposal = geo.daoSpaces.proposals.create({
  fromSpaceId: authorSpaceId,
  daoSpaceId,
  votingMode: "SLOW",
  actions,
});
```

Available proposal actions:

```ts
geo.daoSpaces.proposals.actions.publishEdit(daoSpaceAddress, cid);
geo.daoSpaces.proposals.actions.addMember(daoSpaceAddress, memberSpaceId);
geo.daoSpaces.proposals.actions.removeMember(daoSpaceAddress, memberSpaceId);
geo.daoSpaces.proposals.actions.addEditor(daoSpaceAddress, editorSpaceId);
geo.daoSpaces.proposals.actions.removeEditor(daoSpaceAddress, editorSpaceId);
geo.daoSpaces.proposals.actions.updateVotingSettings(
  daoSpaceAddress,
  votingSettings,
);
```

Vote on a proposal:

```ts
const vote = geo.daoSpaces.proposals.vote({
  authorSpaceId,
  spaceId: daoSpaceId,
  proposalId,
  vote: "YES",
});

await walletClient.sendTransaction({
  to: vote.to,
  data: vote.calldata,
});
```

Execute a passed proposal:

```ts
const execute = geo.daoSpaces.proposals.execute({
  authorSpaceId,
  spaceId: daoSpaceId,
  proposalId,
});

await walletClient.sendTransaction({
  to: execute.to,
  data: execute.calldata,
});
```

### `geo.entityVotes`

Upvote, downvote, or withdraw a vote on an entity:

```ts
const upvote = geo.entityVotes.upvote({
  authorSpaceId,
  spaceId,
  entityId,
});

const downvote = geo.entityVotes.downvote({
  authorSpaceId,
  spaceId,
  entityId,
});

const withdraw = geo.entityVotes.withdraw({
  authorSpaceId,
  spaceId,
  entityId,
});
```

Submit any returned transaction with your wallet client:

```ts
await walletClient.sendTransaction({
  to: upvote.to,
  data: upvote.calldata,
});
```

## Full Publishing Flow With A Smart Account

This example publishes an edit to an existing personal space using a Geo smart account.

```ts
import { createPublicClient, http, type Hex } from "viem";
import {
  GeoTestnetConfig,
  Ops,
  createGeoClient,
  getSmartAccountWalletClient,
} from "@geoprotocol/geo-sdk";
import { SpaceRegistryAbi } from "@geoprotocol/geo-sdk/abis";

const privateKey = `0x${privateKeyFromGeoWallet}` as `0x${string}`;
const geo = createGeoClient({ network: GeoTestnetConfig });
const smartAccount = await getSmartAccountWalletClient({ privateKey });
const accountAddress = smartAccount.account.address;

const hasSpace = await geo.personalSpaces.hasSpace({
  address: accountAddress,
});

if (!hasSpace) {
  throw new Error("No personal space found for this account.");
}

const spaceRegistryAddress = GeoTestnetConfig.contracts?.SPACE_REGISTRY_ADDRESS;
const rpcUrl = GeoTestnetConfig.chain?.rpcUrl;
if (!spaceRegistryAddress || !rpcUrl) {
  throw new Error("GeoTestnetConfig is missing registry or RPC configuration.");
}

const publicClient = createPublicClient({
  transport: http(rpcUrl),
});

const spaceIdHex = (await publicClient.readContract({
  address: spaceRegistryAddress,
  abi: SpaceRegistryAbi,
  functionName: "addressToSpaceId",
  args: [accountAddress],
})) as Hex;

const spaceId = spaceIdHex.slice(2, 34).toLowerCase();

const { id: entityId, ops } = Ops.entities.create({
  name: "Test Entity",
  description: "Created via Geo SDK",
});

const tx = await geo.personalSpaces.publishEdit({
  name: "Create Test Entity",
  spaceId,
  author: spaceId,
  ops,
});

const txHash = await smartAccount.sendTransaction({
  to: tx.to,
  data: tx.calldata,
});

await publicClient.waitForTransactionReceipt({ hash: txHash });
console.log("Published entity", entityId, "to space", spaceId);
```

## Full Personal Space Creation Flow

This example creates a personal space with an EOA wallet and then publishes the initial profile ops returned by `geo.personalSpaces.create(...)`.

```ts
import { createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  GeoTestnetConfig,
  createGeoClient,
  getWalletClient,
} from "@geoprotocol/geo-sdk";
import { SpaceRegistryAbi } from "@geoprotocol/geo-sdk/abis";

const privateKey = "0xTODO" as `0x${string}`;
const account = privateKeyToAccount(privateKey);
const geo = createGeoClient({ network: GeoTestnetConfig });

const walletClient = await getWalletClient({
  privateKey,
});

const rpcUrl = GeoTestnetConfig.chain?.rpcUrl;
const spaceRegistryAddress = GeoTestnetConfig.contracts?.SPACE_REGISTRY_ADDRESS;
if (!rpcUrl || !spaceRegistryAddress) {
  throw new Error("GeoTestnetConfig is missing registry or RPC configuration.");
}

const publicClient = createPublicClient({
  transport: http(rpcUrl),
});

const hasSpace = await geo.personalSpaces.hasSpace({
  address: account.address,
});

let spaceIdHex = (await publicClient.readContract({
  address: spaceRegistryAddress,
  abi: SpaceRegistryAbi,
  functionName: "addressToSpaceId",
  args: [account.address],
})) as Hex;

if (!hasSpace) {
  const createSpace = geo.personalSpaces.create({
    name: "Alice",
    accountAddress: account.address,
  });

  const createSpaceHash = await walletClient.sendTransaction({
    account: walletClient.account,
    to: createSpace.to,
    data: createSpace.calldata,
  });

  await publicClient.waitForTransactionReceipt({ hash: createSpaceHash });

  spaceIdHex = (await publicClient.readContract({
    address: spaceRegistryAddress,
    abi: SpaceRegistryAbi,
    functionName: "addressToSpaceId",
    args: [account.address],
  })) as Hex;

  const spaceId = spaceIdHex.slice(2, 34).toLowerCase();
  const profileTx = await geo.personalSpaces.publishEdit({
    name: "Create personal space profile",
    spaceId,
    author: spaceId,
    ops: createSpace.ops,
  });

  const profileHash = await walletClient.sendTransaction({
    account: walletClient.account,
    to: profileTx.to,
    data: profileTx.calldata,
  });

  await publicClient.waitForTransactionReceipt({ hash: profileHash });

  const topicTx = geo.personalSpaces.setTopic({
    spaceId,
    topicId: createSpace.spaceEntityId,
  });

  const topicHash = await walletClient.sendTransaction({
    account: walletClient.account,
    to: topicTx.to,
    data: topicTx.calldata,
  });

  await publicClient.waitForTransactionReceipt({ hash: topicHash });
}

const spaceId = spaceIdHex.slice(2, 34).toLowerCase();
console.log("Personal space ID", spaceId);
```

## Utilities

### IDs

Entities, properties, relations, spaces, and proposals use globally unique IDs. The canonical SDK ID is a UUID v4 without dashes.

```ts
import { Id, IdUtils } from "@geoprotocol/geo-sdk";

const generatedId = IdUtils.generate();
const checkedId = Id(generatedId);
const bytes = IdUtils.toBytes(checkedId);
```

### Positions

`Position` provides fractional indexing helpers for ordered relations and other ordered items.

```ts
import { Position } from "@geoprotocol/geo-sdk";

const first = Position.generate();
const between = Position.generateBetween(first, null);
const sorted = Position.sort([between, null, first]);
```

### Wallet Helpers

The Geo Genesis browser uses a smart account associated with your account. You can use the same account from code by exporting your private key from https://www.geobrowser.io/export-wallet.

```ts
import {
  getSmartAccountWalletClient,
  getWalletClient,
} from "@geoprotocol/geo-sdk";

const smartAccountWalletClient = await getSmartAccountWalletClient({
  privateKey,
});

const eoaWalletClient = await getWalletClient({
  privateKey,
});
```

Be careful with private keys. Do not commit them to version control.

## Legacy API

The legacy namespaces remain exported for compatibility, but new code should prefer `Ops` and `createGeoClient`.

| Legacy API                 | Preferred API                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `Graph.createEntity(...)`  | `Ops.entities.create(...)`                                                           |
| `Graph.updateEntity(...)`  | `Ops.entities.update(...)`                                                           |
| `Graph.deleteEntity(...)`  | `geo.entities.delete(...)`                                                           |
| `Graph.createImage(...)`   | `geo.images.create(...)`                                                             |
| `Graph.createComment(...)` | `geo.comments.create(...)` or `Ops.comments.create(...)` with supplied reply context |
| `Ipfs.publishEdit(...)`    | `geo.personalSpaces.publishEdit(...)` or `geo.daoSpaces.proposeEdit(...)`            |
| `Ipfs.uploadImage(...)`    | `geo.storage.uploadImage(...)`                                                       |
| `Ipfs.uploadCSV(...)`      | `geo.storage.uploadCSV(...)`                                                         |
| `personalSpace.*`          | `geo.personalSpaces.*`                                                               |
| `daoSpace.*`               | `geo.daoSpaces.*`                                                                    |
| root encoding helpers      | configured client transaction helpers where available                                |

### Legacy `Graph`

```ts
import { Graph } from "@geoprotocol/geo-sdk";

const { id: propertyId, ops: propertyOps } = Graph.createProperty({
  name: "Website",
  dataType: "TEXT",
});

const { id: typeId, ops: typeOps } = Graph.createType({
  name: "Restaurant",
  properties: [propertyId],
});

const { id: entityId, ops: entityOps } = Graph.createEntity({
  name: "Yum Yum",
  types: [typeId],
  values: [
    {
      property: propertyId,
      type: "text",
      value: "https://example.com",
    },
  ],
});

const { ops: updateOps } = Graph.updateEntity({
  id: entityId,
  name: "Updated name",
});

const { ops: deleteOps } = await Graph.deleteEntity({
  id: entityId,
  spaceId,
  network: "TESTNET",
});
```

Legacy relation helpers:

```ts
const { id: relationId, ops: createRelationOps } = Graph.createRelation({
  fromEntity: personId,
  toEntity: restaurantId,
  type: likesPropertyId,
});

const { ops: updateRelationOps } = Graph.updateRelation({
  id: relationId,
  position,
});

const { ops: deleteRelationOps } = Graph.deleteRelation({
  id: relationId,
});
```

Legacy image and comment helpers:

```ts
const image = await Graph.createImage({
  url: "https://example.com/image.png",
  network: "TESTNET",
});

const comment = await Graph.createComment({
  content: "Looks good.",
  replyTo: { entityId, spaceId },
  network: "TESTNET",
});
```

### Legacy `Ipfs`

```ts
import { Ipfs } from "@geoprotocol/geo-sdk";

const edit = await Ipfs.publishEdit({
  name: "Create entity",
  author: spaceId,
  ops,
  network: "TESTNET",
});

const image = await Ipfs.uploadImage(
  { url: "https://example.com/image.png" },
  "TESTNET",
);

const csvCid = await Ipfs.uploadCSV("name,score\nAlice,10", "TESTNET");
```

### Legacy `personalSpace`

```ts
import { personalSpace } from "@geoprotocol/geo-sdk";

const hasSpace = await personalSpace.hasSpace({
  address: account.address,
});

const createSpace = personalSpace.createSpace();

const publish = await personalSpace.publishEdit({
  name: "My Edit",
  spaceId,
  author: spaceId,
  ops,
  network: "TESTNET",
});
```

### Legacy `daoSpace`

```ts
import { daoSpace } from "@geoprotocol/geo-sdk";

const createDao = await daoSpace.createSpace({
  name: "Research DAO",
  author: authorSpaceId,
  initialEditorSpaceIds: [authorSpaceId],
  votingSettings,
  network: "TESTNET",
});

const proposal = await daoSpace.proposeEdit({
  name: "Update entity",
  ops,
  author: authorSpaceId,
  daoSpaceAddress,
  callerSpaceId: authorSpaceId,
  daoSpaceId,
  network: "TESTNET",
});

const vote = daoSpace.voteProposal({
  authorSpaceId,
  spaceId: daoSpaceId,
  proposalId,
  vote: "YES",
  network: "TESTNET",
});

const execute = daoSpace.executeProposal({
  authorSpaceId,
  spaceId: daoSpaceId,
  proposalId,
  network: "TESTNET",
});
```

Legacy DAO membership helpers:

```ts
daoSpace.proposeAddMember({
  authorSpaceId,
  spaceId: daoSpaceId,
  newMemberSpaceId,
  network: "TESTNET",
});

daoSpace.proposeRemoveMember({
  authorSpaceId,
  spaceId: daoSpaceId,
  memberToRemoveSpaceId,
  network: "TESTNET",
});

daoSpace.proposeAddEditor({
  authorSpaceId,
  spaceId: daoSpaceId,
  newEditorSpaceId,
  network: "TESTNET",
});

daoSpace.proposeRemoveEditor({
  authorSpaceId,
  spaceId: daoSpaceId,
  editorToRemoveSpaceId,
  network: "TESTNET",
});

daoSpace.proposeRequestMembership({
  authorSpaceId: requesterSpaceId,
  spaceId: daoSpaceId,
  network: "TESTNET",
});
```

### Legacy Encoding Helpers

Low-level encoding helpers are still available for compatibility when you need exact calldata primitives:

```ts
import {
  getCreateDaoSpaceCalldata,
  getCreatePersonalSpaceCalldata,
  getProcessGeoProposalArguments,
} from "@geoprotocol/geo-sdk";

const personalSpaceCalldata = getCreatePersonalSpaceCalldata();

const daoSpaceCalldata = getCreateDaoSpaceCalldata({
  votingSettings,
  initialEditorSpaceIds: [authorSpaceId],
  initialMemberSpaceIds: [],
  initialEditsContentUri:
    "ipfs://bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
});

const proposalArgs = getProcessGeoProposalArguments(
  spacePluginAddress,
  "ipfs://bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
);
```
