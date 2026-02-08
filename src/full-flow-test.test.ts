import { createPublicClient, type Hex, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { it } from 'vitest';

import { TESTNET } from '../contracts.js';
import { SpaceRegistryAbi } from './abis/index.js';
import { DESCRIPTION_PROPERTY } from './core/ids/system.js';
import * as daoSpace from './dao-space/index.js';
import { createEntity } from './graph/create-entity.js';
import { updateEntity } from './graph/update-entity.js';
import * as personalSpace from './personal-space/index.js';
import { getWalletClient, TESTNET_RPC_URL } from './smart-wallet.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Hex;

/**
 * Converts a bytes16 hex space ID to a UUID string (without dashes).
 */
function hexToUuid(hex: Hex): string {
  // Remove 0x prefix and trailing zeros (bytes16 is 32 hex chars)
  return hex.slice(2, 34).toLowerCase();
}

it.skip('should create a space and publish an edit', async () => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required. Run `pnpm create-private-key` to generate one.');
  }
  const addressPrivateKey = privateKey as `0x${string}`;
  const { address } = privateKeyToAccount(addressPrivateKey);

  console.log('address', address);

  // Get wallet client for testnet
  const walletClient = await getWalletClient({
    privateKey: addressPrivateKey,
  });

  const account = walletClient.account;
  if (!account) {
    throw new Error('Wallet client account is undefined');
  }

  // Create a public client for reading contract state
  const publicClient = createPublicClient({
    transport: http(TESTNET_RPC_URL),
  });

  // Check if a personal space already exists for this address
  const hasExistingSpace = await personalSpace.hasSpace({ address: account.address });

  if (!hasExistingSpace) {
    console.log('Creating personal space...');

    const { to, calldata } = personalSpace.createSpace();

    const createSpaceTxHash = await walletClient.sendTransaction({
      // @ts-expect-error - viem type mismatch for account
      account: walletClient.account,
      to,
      value: 0n,
      data: calldata,
    });

    console.log('createSpaceTxHash', createSpaceTxHash);

    await publicClient.waitForTransactionReceipt({ hash: createSpaceTxHash });
  }

  // Verify space exists after potential creation
  const hasSpaceNow = await personalSpace.hasSpace({ address: account.address });
  if (!hasSpaceNow) {
    throw new Error(`Failed to create personal space for address ${account.address}`);
  }

  const spaceIdHex = (await publicClient.readContract({
    address: TESTNET.SPACE_REGISTRY_ADDRESS,
    abi: SpaceRegistryAbi,
    functionName: 'addressToSpaceId',
    args: [account.address],
  })) as Hex;

  const spaceId = hexToUuid(spaceIdHex);
  console.log('spaceId (UUID)', spaceId);

  // Verify the space address exists
  const spaceAddress = (await publicClient.readContract({
    address: TESTNET.SPACE_REGISTRY_ADDRESS,
    abi: SpaceRegistryAbi,
    functionName: 'spaceIdToAddress',
    args: [spaceIdHex],
  })) as Hex;

  if (spaceAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    throw new Error(`Space ${spaceId} not found in registry (spaceIdHex=${spaceIdHex})`);
  }

  console.log('spaceAddress', spaceAddress);

  // Create an entity with some data
  const { ops, id: entityId } = createEntity({
    name: 'Test Entity',
    description: 'Created via full-flow test',
  });

  console.log('entityId', entityId);

  // Unset description
  const { ops: unsetDescriptionOps } = updateEntity({
    id: entityId,
    unset: [{ property: DESCRIPTION_PROPERTY }],
  });

  const allOps = [...ops, ...unsetDescriptionOps];

  // Publish the edit to IPFS and get calldata for on-chain submission
  const { cid, editId, to, calldata } = await personalSpace.publishEdit({
    name: 'Test Edit',
    spaceId,
    ops: allOps,
    author: account.address,
    network: 'TESTNET',
  });

  console.log('cid', cid);
  console.log('editId', editId);

  const publishTxHash = await walletClient.sendTransaction({
    // @ts-expect-error - viem type mismatch for account
    account: walletClient.account,
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

it.skip('should create a DAO space and propose an edit', async () => {
  const privateKeyEnv = process.env.PRIVATE_KEY;
  if (!privateKeyEnv) {
    throw new Error('PRIVATE_KEY environment variable is required. Run `pnpm create-private-key` to generate one.');
  }
  if (!privateKeyEnv.startsWith('0x')) {
    throw new Error('PRIVATE_KEY must be a hex string starting with 0x.');
  }
  const addressPrivateKey = privateKeyEnv as `0x${string}`;
  const { address } = privateKeyToAccount(addressPrivateKey);

  console.log('address', address);

  // Get wallet client for testnet
  const walletClient = await getWalletClient({
    privateKey: addressPrivateKey,
  });

  const account = walletClient.account;
  if (!account) {
    throw new Error('Wallet client account is undefined');
  }

  // Create a public client for reading contract state
  const publicClient = createPublicClient({
    transport: http(TESTNET_RPC_URL),
  });

  // Check if a personal space already exists for this address
  const hasExistingSpace = await personalSpace.hasSpace({ address: account.address });

  if (!hasExistingSpace) {
    console.log('Creating personal space (required to be a DAO editor)...');

    const { to, calldata } = personalSpace.createSpace();

    const createSpaceTxHash = await walletClient.sendTransaction({
      // @ts-expect-error - viem type mismatch for account
      account: walletClient.account,
      to,
      value: 0n,
      data: calldata,
    });

    console.log('createSpaceTxHash', createSpaceTxHash);

    await publicClient.waitForTransactionReceipt({ hash: createSpaceTxHash });
  }

  // Verify space exists after potential creation
  const hasSpaceNow = await personalSpace.hasSpace({ address: account.address });
  if (!hasSpaceNow) {
    throw new Error(`Failed to create personal space for address ${account.address}`);
  }

  const spaceIdHex = (await publicClient.readContract({
    address: TESTNET.SPACE_REGISTRY_ADDRESS,
    abi: SpaceRegistryAbi,
    functionName: 'addressToSpaceId',
    args: [account.address],
  })) as Hex;

  console.log('Personal space ID (to use as editor):', spaceIdHex);

  // Create a DAO space with the user's personal space as the initial editor
  console.log('Creating DAO space...');
  const { to, calldata, spaceEntityId, cid } = await daoSpace.createSpace({
    name: 'Test DAO Space',
    votingSettings: {
      slowPathPercentageThreshold: 50, // 50% approval needed
      fastPathFlatThreshold: 1, // 1 editor for fast path
      quorum: 1, // minimum 1 editor must vote
      durationInDays: 2, // 2 day voting period (minimum)
    },
    initialEditorSpaceIds: [spaceIdHex],
    author: account.address,
  });

  console.log('spaceEntityId:', spaceEntityId);
  console.log('cid:', cid);
  console.log('to:', to);

  const createDaoSpaceTxHash = await walletClient.sendTransaction({
    // @ts-expect-error - viem type mismatch for account
    account: walletClient.account,
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

  // Find the DAO space address from the transaction logs
  // The Initialized event is emitted by the new DAO space proxy
  // We find it by looking for logs from addresses other than the factory
  const daoSpaceAddress = receipt.logs.find(log => log.address.toLowerCase() !== to.toLowerCase())?.address as Hex;

  if (!daoSpaceAddress) {
    throw new Error('Could not find DAO space address in transaction logs');
  }

  console.log('daoSpaceAddress:', daoSpaceAddress);

  // Get the DAO space ID from the registry
  const daoSpaceIdHex = (await publicClient.readContract({
    address: TESTNET.SPACE_REGISTRY_ADDRESS,
    abi: SpaceRegistryAbi,
    functionName: 'addressToSpaceId',
    args: [daoSpaceAddress],
  })) as Hex;

  console.log('daoSpaceIdHex:', daoSpaceIdHex);

  const hasDaoSpace = await personalSpace.hasSpace({ address: daoSpaceAddress });
  if (!hasDaoSpace) {
    throw new Error('DAO space was not registered in the Space Registry');
  }

  // Now propose an edit to the DAO space
  console.log('Proposing edit to DAO space...');

  const { ops, id: entityId } = createEntity({
    name: 'DAO Entity',
    description: 'Created via DAO space proposal',
  });

  console.log('entityId:', entityId);

  const {
    editId,
    cid: proposalCid,
    to: proposalTo,
    calldata: proposalCalldata,
    proposalId,
  } = await daoSpace.proposeEdit({
    name: 'Add new entity to DAO space',
    ops,
    author: account.address,
    daoSpaceAddress,
    callerSpaceId: spaceIdHex,
    daoSpaceId: daoSpaceIdHex,
    votingMode: 'FAST', // Fast path since we're the only editor and threshold is 1
  });

  console.log('editId:', editId);
  console.log('proposalCid:', proposalCid);
  console.log('proposalId:', proposalId.slice(2));

  const proposeTxHash = await walletClient.sendTransaction({
    // @ts-expect-error - viem type mismatch for account
    account: walletClient.account,
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
