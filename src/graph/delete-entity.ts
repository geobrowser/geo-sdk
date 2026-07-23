import { deleteEntity as deleteEntityWithContext } from '../client/entities.js';
import { resolveGeoNetwork } from '../networks.js';
import type { CreateResult, DeleteEntityParams } from '../types.js';

/**
 * Deletes an entity by unsetting all its values and deleting all its relations
 * in the specified space.
 *
 * Unlike the other op builders, this is async and requires a `spaceId`. That is
 * intentional: GRC-20 does define a "delete entity" op, but it is not yet
 * supported by the Indexer, so the SDK must first fetch the entity's current
 * values and relations from the graph (hence async) and deletion is scoped to
 * one space's data (hence `spaceId`) — the ops unset those values and delete
 * those relations in that space only.
 *
 * @example
 * ```ts
 * const { id, ops } = await deleteEntity({
 *   id: entityId,
 *   spaceId,
 * });
 * ```
 *
 * @deprecated Use `createGeoClient({ network }).entities.delete(...)`.
 */
export const deleteEntity = async ({ network = 'TESTNET', ...params }: DeleteEntityParams): Promise<CreateResult> => {
  return deleteEntityWithContext({ network: resolveGeoNetwork(network), fetch: globalThis.fetch }, params);
};
