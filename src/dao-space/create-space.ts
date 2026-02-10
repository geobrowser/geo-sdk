import type { Op } from '@geoprotocol/grc-20';

import { TESTNET } from '../../contracts.js';
import { SPACE_TYPE } from '../core/ids/system.js';
import { getCreateDaoSpaceCalldata } from '../encodings/index.js';
import { createEntity } from '../graph/create-entity.js';
import * as IdUtils from '../id-utils.js';
import { publishEdit } from '../ipfs.js';
import type { CreateSpaceParams, CreateSpaceResult } from './types.js';

/**
 * Get the target address and calldata for creating a DAO space.
 *
 * This function creates the space entity, uploads the initial edit to IPFS,
 * and returns everything needed to submit a transaction that creates
 * a DAO space on the DAO Space Factory contract.
 *
 * @param params - The parameters for creating the DAO space
 * @returns Object containing `to` (contract address), `calldata` for the transaction,
 *          `spaceEntityId` for the generated space entity, and `cid` for the IPFS content
 *
 * @example
 * ```ts
 * import { daoSpace } from '@geoprotocol/geo-sdk';
 * import { createWalletClient, http } from 'viem';
 *
 * const { to, calldata, spaceEntityId, cid } = await daoSpace.createSpace({
 *   name: 'My DAO Space',
 *   votingSettings: {
 *     slowPathPercentageThreshold: 50,  // 50% approval needed
 *     fastPathFlatThreshold: 3,         // 3 editors for fast path
 *     quorum: 2,                        // minimum 2 editors must vote
 *     durationInDays: 7,                // 7 day voting period
 *   },
 *   initialEditorSpaceIds: ['0x01234567890abcdef01234567890abcd'],
 *   author: 'your-person-entity-id',
 * });
 *
 * // Using viem
 * const hash = await walletClient.sendTransaction({
 *   to,
 *   data: calldata,
 * });
 * ```
 */
export async function createSpace(params: CreateSpaceParams): Promise<CreateSpaceResult> {
  const { name, author, ops: additionalOps = [], network = 'TESTNET' } = params;

  // Generate a space entity ID
  const spaceEntityId = IdUtils.generate();

  // Create ops for the space entity with name and type
  const ops: Op[] = [];

  const { ops: createSpaceEntityOps } = createEntity({
    id: spaceEntityId,
    name,
    types: [SPACE_TYPE],
  });
  ops.push(...createSpaceEntityOps);

  // Add any additional ops
  ops.push(...additionalOps);

  // Upload ops to IPFS
  const { cid } = await publishEdit({
    name: `Create DAO Space: ${name}`,
    ops,
    author,
    network,
  });

  const calldata = getCreateDaoSpaceCalldata({
    votingSettings: params.votingSettings,
    initialEditorSpaceIds: params.initialEditorSpaceIds,
    initialMemberSpaceIds: params.initialMemberSpaceIds ?? [],
    initialEditsContentUri: cid,
    initialTopicId: params.initialTopicId,
  });

  return {
    to: TESTNET.DAO_SPACE_FACTORY_ADDRESS,
    calldata,
    spaceEntityId,
    cid,
  };
}
