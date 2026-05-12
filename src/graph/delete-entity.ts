import { deleteEntity as deleteEntityWithContext } from '../client/entities.js';
import { resolveGeoNetwork } from '../networks.js';
import type { CreateResult, DeleteEntityParams } from '../types.js';

/**
 * Deletes an entity by unsetting all its values and deleting all its relations
 * in the specified space.
 *
 * @deprecated Use `createGeoClient({ network }).entities.delete(...)`.
 */
export const deleteEntity = async ({ network = 'TESTNET', ...params }: DeleteEntityParams): Promise<CreateResult> => {
  return deleteEntityWithContext({ network: resolveGeoNetwork(network), fetch: globalThis.fetch }, params);
};
