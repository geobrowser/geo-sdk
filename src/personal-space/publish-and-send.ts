import { publishEdit } from './publish-edit.js';
import type { PublishAndSendParams, PublishAndSendResult } from './types.js';

/**
 * Publish an edit to a personal space and send the transaction.
 *
 * This is a convenience function that combines `publishEdit()` with
 * transaction submission into a single call.
 *
 * @example
 * ```ts
 * import { personalSpace, getSmartAccountWalletClient, Graph } from '@geoprotocol/geo-sdk';
 *
 * const wallet = await getSmartAccountWalletClient({ privateKey: '0x...' });
 * const { ops } = Graph.createEntity({ name: 'New Entity' });
 *
 * const result = await personalSpace.publishAndSend({
 *   name: 'Add new entity',
 *   spaceId: 'your-space-id',
 *   ops,
 *   author: 'your-personal-space-id',
 *   wallet,
 * });
 *
 * console.log(result.editId, result.cid, result.txHash);
 * ```
 */
export async function publishAndSend(params: PublishAndSendParams): Promise<PublishAndSendResult> {
  const { wallet, ...publishParams } = params;

  const account = wallet.account;
  if (!account) {
    throw new Error('Wallet client must have an account');
  }

  // 1. Publish to IPFS and encode calldata
  const publishResult = await publishEdit(publishParams);

  // 2. Send the transaction
  const txHash = await wallet.sendTransaction({
    to: publishResult.to,
    data: publishResult.calldata,
    account,
  });

  return {
    editId: publishResult.editId,
    cid: publishResult.cid,
    txHash,
  };
}
