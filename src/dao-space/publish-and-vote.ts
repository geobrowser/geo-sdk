import { proposeEdit } from './propose-edit.js';
import type { PublishAndVoteParams, PublishAndVoteResult } from './types.js';
import { voteProposal } from './vote-proposal.js';

/**
 * Propose an edit to a DAO space, send the transaction, vote YES, and wait for confirmation.
 *
 * This is a convenience function that combines `proposeEdit()` + `voteProposal()`
 * with transaction submission into a single call.
 *
 * @example
 * ```ts
 * import { daoSpace, getSmartAccountWalletClient } from '@geoprotocol/geo-sdk';
 *
 * const wallet = await getSmartAccountWalletClient({ privateKey: '0x...' });
 * const { ops } = Graph.createEntity({ name: 'New Entity' });
 *
 * const result = await daoSpace.publishAndVote({
 *   name: 'Add new entity',
 *   ops,
 *   author: 'your-personal-space-id',
 *   wallet,
 *   daoSpaceAddress: '0xDAOSpaceContractAddress...',
 *   callerSpaceId: '0xCallerBytes16SpaceId...',
 *   daoSpaceId: '0xDAOBytes16SpaceId...',
 * });
 *
 * console.log(result.proposalId, result.proposeTxHash, result.voteTxHash);
 * ```
 */
export async function publishAndVote(params: PublishAndVoteParams): Promise<PublishAndVoteResult> {
  const { wallet, vote = 'YES', ...proposeParams } = params;

  const account = wallet.account;
  if (!account) {
    throw new Error('Wallet client must have an account');
  }

  // 1. Create the proposal (publishes to IPFS + encodes calldata)
  const proposeResult = await proposeEdit(proposeParams);

  // 2. Send the propose transaction
  const proposeTxHash = await wallet.sendTransaction({
    to: proposeResult.to,
    data: proposeResult.calldata,
    account,
  });

  // 3. Build the vote transaction
  const voteResult = voteProposal({
    authorSpaceId: proposeParams.callerSpaceId,
    spaceId: proposeParams.daoSpaceId,
    proposalId: proposeResult.proposalId,
    vote,
  });

  // 4. Send the vote transaction
  const voteTxHash = await wallet.sendTransaction({
    to: voteResult.to,
    data: voteResult.calldata,
    account,
  });

  return {
    proposalId: proposeResult.proposalId,
    editId: proposeResult.editId,
    cid: proposeResult.cid,
    proposeTxHash,
    voteTxHash,
  };
}
