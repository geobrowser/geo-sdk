import type { Op } from '@geoprotocol/grc-20';
import { type Address, createPublicClient, type Hex, http } from 'viem';
import { EMPTY_SPACE_ID } from '../../contracts.js';
import { SpaceRegistryAbi } from '../abis/index.js';
import * as Account from '../core/account.js';
import { PERSON_TYPE, SPACE_TYPE, TYPES_PROPERTY } from '../core/ids/system.js';
import { getCreatePersonalSpaceCalldata } from '../encodings/get-create-personal-space-calldata.js';
import { createEntity } from '../graph/create-entity.js';
import { createRelation } from '../graph/create-relation.js';
import type { Id } from '../id.js';
import * as IdUtils from '../id-utils.js';
import type { PublishEditParams } from '../ipfs-core.js';
import { requireGeoContract } from '../networks.js';
import type { GeoClientContext } from './context.js';

export type CreatePersonalSpaceParams = {
  name: string;
  accountAddress: Address;
};

export type CreatePersonalSpaceResult = {
  to: `0x${string}`;
  calldata: `0x${string}`;
  spaceEntityId: Id;
  accountId: string;
  ops: Op[];
};

export type HasSpaceParams = {
  address: Hex;
  rpcUrl?: string;
};

export type PublishPersonalSpaceEditParams = PublishEditParams & {
  spaceId: Id | string;
};

/**
 * Builds the personal-space creation transaction and initial space content ops.
 *
 * The returned calldata registers the caller's address as a personal space.
 * The returned ops create the space entity, the account entity, and the
 * personal-space type relations that should be published after the space ID is
 * available onchain.
 *
 * @example
 * ```ts
 * const tx = geo.personalSpaces.create({
 *   name: 'Alice',
 *   accountAddress: account.address,
 * });
 *
 * await walletClient.sendTransaction({
 *   to: tx.to,
 *   data: tx.calldata,
 * });
 *
 * // Once the transaction is mined and the space ID is known:
 * await geo.personalSpaces.publishEdit({
 *   name: 'Create personal space profile',
 *   spaceId,
 *   author: spaceId,
 *   ops: tx.ops,
 * });
 * ```
 *
 * @param context Client context containing the target network configuration.
 * @param params Space display name and account address to describe in initial ops.
 * @returns Target registry address, calldata, generated entity IDs, and initial content ops.
 * @throws When the configured network is missing `SPACE_REGISTRY_ADDRESS`.
 */
export function create(
  context: GeoClientContext,
  { name, accountAddress }: CreatePersonalSpaceParams,
): CreatePersonalSpaceResult {
  const spaceEntityId = IdUtils.generate();
  const ops: Op[] = [];

  const { accountId, ops: accountOps } = Account.make(accountAddress);
  ops.push(...accountOps);

  const { ops: createSpaceEntityOps } = createEntity({
    id: spaceEntityId,
    name,
    types: [SPACE_TYPE],
  });
  ops.push(...createSpaceEntityOps);

  const { ops: personRelationOps } = createRelation({
    fromEntity: spaceEntityId,
    type: TYPES_PROPERTY,
    toEntity: PERSON_TYPE,
  });
  ops.push(...personRelationOps);

  return {
    to: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
    calldata: getCreatePersonalSpaceCalldata(),
    spaceEntityId,
    accountId,
    ops,
  };
}

/**
 * Checks whether an address already has a personal space on the configured network.
 *
 * The helper reads `addressToSpaceId(address)` from the configured
 * `SPACE_REGISTRY_ADDRESS`. Pass `rpcUrl` to override the network's configured
 * RPC URL for this lookup.
 *
 * @example
 * ```ts
 * const hasExistingSpace = await geo.personalSpaces.hasSpace({
 *   address: account.address,
 * });
 *
 * if (!hasExistingSpace) {
 *   const tx = geo.personalSpaces.create({
 *     name: 'Alice',
 *     accountAddress: account.address,
 *   });
 *   await walletClient.sendTransaction({ to: tx.to, data: tx.calldata });
 * }
 * ```
 *
 * @param context Client context containing network and contract configuration.
 * @param params Wallet or smart-account address plus optional RPC URL override.
 * @returns `true` when the registry maps the address to a non-empty space ID.
 * @throws When the configured network is missing `SPACE_REGISTRY_ADDRESS` or no RPC URL is available.
 */
export async function hasSpace(context: GeoClientContext, { address, rpcUrl }: HasSpaceParams): Promise<boolean> {
  const resolvedRpcUrl = rpcUrl ?? context.network.chain?.rpcUrl;
  if (!resolvedRpcUrl) {
    throw new Error(`Geo network "${context.network.name}" is missing an RPC URL`);
  }

  const publicClient = createPublicClient({ transport: http(resolvedRpcUrl) });
  const spaceIdHex = (await publicClient.readContract({
    address: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
    abi: SpaceRegistryAbi,
    functionName: 'addressToSpaceId',
    args: [address],
  })) as Hex;

  return spaceIdHex.toLowerCase() !== EMPTY_SPACE_ID.toLowerCase();
}

/**
 * Publishes an edit and returns calldata for submitting it to a personal space.
 *
 * This is the context-explicit implementation behind
 * `geo.personalSpaces.publishEdit(...)`.
 *
 * @example
 * ```ts
 * import * as Ops from '@geoprotocol/geo-sdk/ops';
 *
 * const { ops } = Ops.entities.create({ name: 'Geo entity' });
 * const tx = await geo.personalSpaces.publishEdit({
 *   name: 'Create Geo entity',
 *   spaceId,
 *   author: spaceId,
 *   ops,
 * });
 *
 * await walletClient.sendTransaction({
 *   to: tx.to,
 *   data: tx.calldata,
 * });
 * ```
 *
 * @param context Client context containing network, contract, API, and fetch configuration.
 * @param params Edit publication params plus the target personal space ID.
 * @returns Edit ID, CID, target registry address, and calldata.
 * @throws When the configured network is missing required contracts or edit publishing fails.
 */
export async function publishEdit(context: GeoClientContext, params: PublishPersonalSpaceEditParams) {
  const { publishToSpace } = await import('./edits.js');
  return publishToSpace(context, params);
}
