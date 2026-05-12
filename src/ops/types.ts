import { createType } from '../graph/create-type.js';
import type { CreateResult, CreateTypeParams } from '../types.js';

/**
 * Builds create-type ops without network access.
 *
 * @example
 * ```ts
 * import { types } from '@geoprotocol/geo-sdk/ops';
 *
 * const { id, ops } = types.create({
 *   name: 'Restaurant',
 *   properties: [namePropertyId, websitePropertyId],
 * });
 * ```
 *
 * @param params Type ID, name, description, cover, and property IDs.
 * @returns Generated or supplied type entity ID and create ops.
 * @throws When any supplied ID is invalid.
 */
export const create = (params: CreateTypeParams): CreateResult => createType(params);
