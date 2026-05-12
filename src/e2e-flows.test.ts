import type { CreateRelation, Op } from '@geoprotocol/grc-20';
import { type Chain, createPublicClient, createWalletClient, type Hex, http } from 'viem';
import { type PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import { expect, it } from 'vitest';

import { SpaceRegistryAbi } from './abis/index.js';
import { createGeoClient } from './client.js';
import { DESCRIPTION_PROPERTY, RELATION_TYPE, REPLY_TO_PROPERTY } from './core/ids/system.js';
import { toGrcId } from './id-utils.js';
import { Networks } from './networks.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Hex;
const EMPTY_SPACE_ID = '0x00000000000000000000000000000000' as Hex;
const replyToGrcId = toGrcId(REPLY_TO_PROPERTY);

const geo = createGeoClient({ network: Networks.TESTNET });

function requireTestnetContract(name: 'SPACE_REGISTRY_ADDRESS' | 'DAO_SPACE_FACTORY_ADDRESS'): `0x${string}` {
  const address = Networks.TESTNET.contracts?.[name];
  if (!address) {
    throw new Error(`Networks.TESTNET is missing ${name}`);
  }

  return address;
}

function requireTestnetRpcUrl(): string {
  const rpcUrl = Networks.TESTNET.chain?.rpcUrl;
  if (!rpcUrl) {
    throw new Error('Networks.TESTNET is missing an RPC URL');
  }

  return rpcUrl;
}

function createTestnetChain(rpcUrl: string): Chain {
  const chainConfig = Networks.TESTNET.chain;
  if (!chainConfig) {
    throw new Error('Networks.TESTNET is missing chain config');
  }

  return {
    id: chainConfig.id,
    name: chainConfig.name,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
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
      op.type === 'createRelation' &&
      'relationType' in op &&
      (op as CreateRelation).relationType.every((b, i) => b === replyToGrcId[i]),
  );
}

/**
 * Converts a bytes16 hex space ID to a UUID string without dashes.
 */
function hexToUuid(hex: Hex): string {
  return hex.slice(2, 34).toLowerCase();
}

async function getSpaceIdHex(publicClient: ReturnType<typeof createPublicClient>, address: Hex): Promise<Hex> {
  return (await publicClient.readContract({
    address: requireTestnetContract('SPACE_REGISTRY_ADDRESS'),
    abi: SpaceRegistryAbi,
    functionName: 'addressToSpaceId',
    args: [address],
  })) as Hex;
}

async function ensurePersonalSpace({
  accountAddress,
  account,
  publicClient,
  walletClient,
}: {
  accountAddress: Hex;
  account: PrivateKeyAccount;
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
}) {
  let spaceIdHex = await getSpaceIdHex(publicClient, accountAddress);

  if (spaceIdHex.toLowerCase() === EMPTY_SPACE_ID.toLowerCase()) {
    console.log('Creating personal space...');

    const { to, calldata } = geo.personalSpaces.create();

    const createSpaceTxHash = await walletClient.sendTransaction({
      account,
      chain: walletClient.chain ?? null,
      to,
      value: 0n,
      data: calldata,
    });

    console.log('createSpaceTxHash', createSpaceTxHash);
    await publicClient.waitForTransactionReceipt({ hash: createSpaceTxHash });
    spaceIdHex = await getSpaceIdHex(publicClient, accountAddress);
  }

  if (spaceIdHex.toLowerCase() === EMPTY_SPACE_ID.toLowerCase()) {
    throw new Error(`Failed to create personal space for address ${accountAddress}`);
  }

  return {
    spaceIdHex,
    spaceId: hexToUuid(spaceIdHex),
  };
}

async function setupWallet() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required. Run `pnpm create-private-key` to generate one.');
  }
  if (!privateKey.startsWith('0x')) {
    throw new Error('PRIVATE_KEY must be a hex string starting with 0x.');
  }

  const rpcUrl = requireTestnetRpcUrl();
  const addressPrivateKey = privateKey as `0x${string}`;
  const account = privateKeyToAccount(addressPrivateKey);
  console.log('address', account.address);

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

  return {
    account,
    publicClient,
    walletClient,
  };
}

it.skip('should create a space and publish an edit with the new APIs', async () => {
  const { account, publicClient, walletClient } = await setupWallet();
  const { spaceId, spaceIdHex } = await ensurePersonalSpace({
    accountAddress: account.address,
    account,
    publicClient,
    walletClient,
  });

  console.log('spaceId (UUID)', spaceId);

  const spaceAddress = (await publicClient.readContract({
    address: requireTestnetContract('SPACE_REGISTRY_ADDRESS'),
    abi: SpaceRegistryAbi,
    functionName: 'spaceIdToAddress',
    args: [spaceIdHex],
  })) as Hex;

  if (spaceAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    throw new Error(`Space ${spaceId} not found in registry (spaceIdHex=${spaceIdHex})`);
  }

  console.log('spaceAddress', spaceAddress);

  const { ops, id: entityId } = geo.ops.entities.create({
    name: 'Test Entity',
    description: 'Created via new API e2e flow test',
  });
  console.log('entityId', entityId);

  const { ops: unsetDescriptionOps } = geo.ops.entities.update({
    id: entityId,
    unset: [{ property: DESCRIPTION_PROPERTY }],
  });

  const { cid, editId, to, calldata } = await geo.personalSpaces.publishEdit({
    name: 'Test Edit',
    spaceId,
    ops: [...ops, ...unsetDescriptionOps],
    author: spaceId,
  });

  console.log('cid', cid);
  console.log('editId', editId);

  const publishTxHash = await walletClient.sendTransaction({
    account,
    chain: walletClient.chain ?? null,
    to,
    data: calldata,
  });

  console.log('publishTxHash', publishTxHash);

  const publishReceipt = await publicClient.waitForTransactionReceipt({
    hash: publishTxHash,
  });
  console.log('publishReceipt status', publishReceipt.status);

  if (publishReceipt.status === 'reverted') {
    throw new Error(`Publish transaction reverted: ${publishTxHash}`);
  }

  console.log('Successfully published edit to space', spaceId);
}, 60000);

it.skip('should create a DAO space and propose an edit with the new APIs', async () => {
  const { account, publicClient, walletClient } = await setupWallet();
  const { spaceIdHex } = await ensurePersonalSpace({
    accountAddress: account.address,
    account,
    publicClient,
    walletClient,
  });

  console.log('Personal space ID (to use as editor):', spaceIdHex);

  console.log('Creating DAO space...');
  const { to, calldata, spaceEntityId, cid } = await geo.daoSpaces.create({
    name: 'Test DAO Space',
    votingSettings: {
      slowPathPercentageThreshold: 50,
      fastPathFlatThreshold: 1,
      quorum: 1,
      durationInDays: 2,
    },
    initialEditorSpaceIds: [spaceIdHex],
    author: hexToUuid(spaceIdHex),
  });

  console.log('spaceEntityId:', spaceEntityId);
  console.log('cid:', cid);
  console.log('to:', to);

  const createDaoSpaceTxHash = await walletClient.sendTransaction({
    account,
    chain: walletClient.chain ?? null,
    to,
    value: 0n,
    data: calldata,
  });

  console.log('createDaoSpaceTxHash', createDaoSpaceTxHash);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: createDaoSpaceTxHash,
  });

  console.log('receipt status', receipt.status);

  if (receipt.status === 'reverted') {
    throw new Error(`DAO space creation transaction reverted: ${createDaoSpaceTxHash}`);
  }

  console.log('Successfully created DAO space');

  const daoSpaceAddress = receipt.logs.find(log => log.address.toLowerCase() !== to.toLowerCase())?.address as Hex;

  if (!daoSpaceAddress) {
    throw new Error('Could not find DAO space address in transaction logs');
  }

  console.log('daoSpaceAddress:', daoSpaceAddress);

  const daoSpaceIdHex = await getSpaceIdHex(publicClient, daoSpaceAddress);
  console.log('daoSpaceIdHex:', daoSpaceIdHex);

  if (daoSpaceIdHex.toLowerCase() === EMPTY_SPACE_ID.toLowerCase()) {
    throw new Error('DAO space was not registered in the Space Registry');
  }

  console.log('Proposing edit to DAO space...');

  const { ops, id: entityId } = geo.ops.entities.create({
    name: 'DAO Entity',
    description: 'Created via DAO space proposal',
  });

  console.log('entityId:', entityId);

  const personalSpaceId = hexToUuid(spaceIdHex);

  const {
    editId,
    cid: proposalCid,
    to: proposalTo,
    calldata: proposalCalldata,
    proposalId,
  } = await geo.proposals.proposeEdit({
    name: 'Add new entity to DAO space',
    ops,
    author: personalSpaceId,
    daoSpaceAddress,
    callerSpaceId: spaceIdHex,
    daoSpaceId: daoSpaceIdHex,
    votingMode: 'FAST',
  });

  console.log('editId:', editId);
  console.log('proposalCid:', proposalCid);
  console.log('proposalId:', proposalId.slice(2));

  const proposeTxHash = await walletClient.sendTransaction({
    account,
    chain: walletClient.chain ?? null,
    to: proposalTo,
    data: proposalCalldata,
  });

  console.log('proposeTxHash:', proposeTxHash);

  const proposeReceipt = await publicClient.waitForTransactionReceipt({
    hash: proposeTxHash,
  });

  console.log('proposeReceipt status:', proposeReceipt.status);

  if (proposeReceipt.status === 'reverted') {
    throw new Error(`Propose edit transaction reverted: ${proposeTxHash}`);
  }

  console.log('Successfully proposed edit to DAO space');
  console.log('Proposal ID:', proposalId.slice(2));
}, 120000);

it.skip('should create an entity and then delete it with the new APIs', async () => {
  const { account, publicClient, walletClient } = await setupWallet();
  const { spaceId } = await ensurePersonalSpace({
    accountAddress: account.address,
    account,
    publicClient,
    walletClient,
  });

  console.log('spaceId (UUID)', spaceId);

  const { ops: createOps, id: entityId } = geo.ops.entities.create({
    name: 'Entity to Delete',
    description: 'This entity will be deleted',
  });

  const { ops: relationOps, id: relationId } = geo.ops.relations.create({
    fromEntity: entityId,
    toEntity: '3dd25afe17ff40f290bd9f63799cd299',
    type: RELATION_TYPE,
  });

  console.log('entityId', entityId);
  console.log('relationId', relationId);

  const {
    cid: createCid,
    editId: createEditId,
    to: createTo,
    calldata: createCalldata,
  } = await geo.personalSpaces.publishEdit({
    name: 'Create Entity',
    spaceId,
    ops: [...createOps, ...relationOps],
    author: spaceId,
  });

  console.log('create cid', createCid);
  console.log('create editId', createEditId);

  const createTxHash = await walletClient.sendTransaction({
    account,
    chain: walletClient.chain ?? null,
    to: createTo,
    data: createCalldata,
  });

  console.log('createTxHash', createTxHash);

  const createReceipt = await publicClient.waitForTransactionReceipt({
    hash: createTxHash,
  });
  console.log('createReceipt status', createReceipt.status);

  if (createReceipt.status === 'reverted') {
    throw new Error(`Create transaction reverted: ${createTxHash}`);
  }

  console.log('Successfully created entity', entityId);

  await new Promise(resolve => setTimeout(resolve, 4000));

  const { ops: deleteOps } = await geo.entities.delete({
    id: entityId,
    spaceId,
  });

  console.log('deleteOps count', deleteOps.length);

  if (deleteOps.length === 0) {
    console.log('No ops to delete (entity may not have been indexed yet)');
    return;
  }

  const {
    cid: deleteCid,
    editId: deleteEditId,
    to: deleteTo,
    calldata: deleteCalldata,
  } = await geo.personalSpaces.publishEdit({
    name: 'Delete Entity',
    spaceId,
    ops: deleteOps,
    author: spaceId,
  });

  console.log('delete cid', deleteCid);
  console.log('delete editId', deleteEditId);

  const deleteTxHash = await walletClient.sendTransaction({
    account,
    chain: walletClient.chain ?? null,
    to: deleteTo,
    data: deleteCalldata,
  });

  console.log('deleteTxHash', deleteTxHash);

  const deleteReceipt = await publicClient.waitForTransactionReceipt({
    hash: deleteTxHash,
  });
  console.log('deleteReceipt status', deleteReceipt.status);

  if (deleteReceipt.status === 'reverted') {
    throw new Error(`Delete transaction reverted: ${deleteTxHash}`);
  }

  console.log('Successfully deleted entity', entityId);
}, 120000);

it.skip('should create an entity, comment on it, and comment on the comment with correct reply-to chains with the new APIs', async () => {
  const { account, publicClient, walletClient } = await setupWallet();
  const { spaceId } = await ensurePersonalSpace({
    accountAddress: account.address,
    account,
    publicClient,
    walletClient,
  });

  console.log('spaceId (UUID)', spaceId);

  const { ops: entityOps, id: entityId } = geo.ops.entities.create({
    name: 'Entity with Comments',
    description: 'This entity will have comments',
  });

  console.log('entityId', entityId);

  const { ops: commentAOps, id: commentAId } = await geo.comments.create({
    content: 'This is Comment A on the entity',
    replyTo: { entityId, spaceId },
  });

  console.log('commentAId', commentAId);

  const commentAReplyTos = filterReplyToRelations(commentAOps);
  console.log('Comment A reply-to count:', commentAReplyTos.length);
  expect(commentAReplyTos).toHaveLength(1);

  const {
    cid: cid1,
    to: to1,
    calldata: calldata1,
  } = await geo.personalSpaces.publishEdit({
    name: 'Create Entity and Comment A',
    spaceId,
    ops: [...entityOps, ...commentAOps],
    author: spaceId,
  });

  console.log('cid1', cid1);

  const tx1Hash = await walletClient.sendTransaction({
    account,
    chain: walletClient.chain ?? null,
    to: to1,
    data: calldata1,
  });

  console.log('tx1Hash', tx1Hash);

  const receipt1 = await publicClient.waitForTransactionReceipt({
    hash: tx1Hash,
  });
  console.log('receipt1 status', receipt1.status);

  if (receipt1.status === 'reverted') {
    throw new Error(`First publish transaction reverted: ${tx1Hash}`);
  }

  await new Promise(resolve => setTimeout(resolve, 4000));

  const { ops: commentBOps, id: commentBId } = await geo.comments.create({
    content: 'This is Comment B on Comment A',
    replyTo: { entityId: commentAId, spaceId },
  });

  console.log('commentBId', commentBId);

  const commentBReplyTos = filterReplyToRelations(commentBOps);
  console.log('Comment B reply-to count:', commentBReplyTos.length);
  expect(commentBReplyTos).toHaveLength(2);

  const {
    cid: cid2,
    to: to2,
    calldata: calldata2,
  } = await geo.personalSpaces.publishEdit({
    name: 'Create Comment B',
    spaceId,
    ops: commentBOps,
    author: spaceId,
  });

  console.log('cid2', cid2);

  const tx2Hash = await walletClient.sendTransaction({
    account,
    chain: walletClient.chain ?? null,
    to: to2,
    data: calldata2,
  });

  console.log('tx2Hash', tx2Hash);

  const receipt2 = await publicClient.waitForTransactionReceipt({
    hash: tx2Hash,
  });
  console.log('receipt2 status', receipt2.status);

  if (receipt2.status === 'reverted') {
    throw new Error(`Second publish transaction reverted: ${tx2Hash}`);
  }

  await new Promise(resolve => setTimeout(resolve, 4000));

  const { ops: commentCOps, id: commentCId } = await geo.comments.create({
    content: 'This is Comment C on Comment B',
    replyTo: { entityId: commentBId, spaceId },
  });

  console.log('commentCId', commentCId);

  const commentCReplyTos = filterReplyToRelations(commentCOps);
  console.log('Comment C reply-to count:', commentCReplyTos.length);
  expect(commentCReplyTos).toHaveLength(3);

  console.log('Successfully verified comment reply-to chain accumulation');
}, 180000);
