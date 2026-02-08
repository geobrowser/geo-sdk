import { createPublicClient, type Hex, http } from 'viem';
import { it } from 'vitest';

import { TESTNET } from '../contracts.js';
import { SpaceRegistryAbi } from './abis/index.js';
import { createEntity } from './graph/create-entity.js';
import * as personalSpace from './personal-space/index.js';
import { getSmartAccountWalletClient, TESTNET_RPC_URL } from './smart-wallet.js';

/**
 * Converts a bytes16 hex space ID to a UUID string (without dashes).
 */
function hexToUuid(hex: Hex): string {
  return hex.slice(2, 34).toLowerCase();
}

it.skip('should publish an edit to personal space via smart account', async () => {
  const privateKeyEnv = process.env.PRIVY_PRIVATE_KEY;
  if (!privateKeyEnv) {
    throw new Error('PRIVY_PRIVATE_KEY environment variable is required.');
  }

  const privateKey = (privateKeyEnv.startsWith('0x') ? privateKeyEnv : `0x${privateKeyEnv}`) as `0x${string}`;

  // Get smart account wallet client (Safe + Pimlico paymaster)
  const smartAccount = await getSmartAccountWalletClient({ privateKey });
  const smartAccountAddress = smartAccount.account.address;
  console.log('Smart account address:', smartAccountAddress);

  // Create a public client for reading contract state
  const publicClient = createPublicClient({
    transport: http(TESTNET_RPC_URL),
  });

  // Check if a personal space exists for this smart account address
  const hasExistingSpace = await personalSpace.hasSpace({ address: smartAccountAddress });
  if (!hasExistingSpace) {
    throw new Error(`No personal space found for smart account address ${smartAccountAddress}. Create one first.`);
  }

  const spaceIdHex = (await publicClient.readContract({
    address: TESTNET.SPACE_REGISTRY_ADDRESS,
    abi: SpaceRegistryAbi,
    functionName: 'addressToSpaceId',
    args: [smartAccountAddress],
  })) as Hex;

  const spaceId = hexToUuid(spaceIdHex);
  console.log('spaceId (UUID)', spaceId);

  // Create an entity
  const { ops, id: entityId } = createEntity({
    name: 'Smart Account Test Entity',
  });

  console.log('entityId', entityId);

  // Publish the edit to IPFS and get calldata
  const { cid, editId, to, calldata } = await personalSpace.publishEdit({
    name: 'Smart Account Test Edit',
    spaceId,
    ops,
    author: smartAccountAddress,
    network: 'TESTNET',
  });

  console.log('cid', cid);
  console.log('editId', editId);

  // Send transaction via smart account (account and chain are baked in)
  const txHash = await smartAccount.sendTransaction({
    to,
    data: calldata,
  });

  console.log('txHash', txHash);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  console.log('receipt status', receipt.status);

  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  console.log('Successfully published edit to space', spaceId, 'via smart account');
}, 60000);
