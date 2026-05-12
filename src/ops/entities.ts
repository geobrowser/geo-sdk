import { createEntity } from '../graph/create-entity.js';
import { updateEntity } from '../graph/update-entity.js';
import type { CreateResult, EntityParams, UpdateEntityParams } from '../types.js';

/**
 * Builds create-entity ops.
 *
 * This is the pure version of entity creation. It validates supplied IDs and
 * encodes the same operation shape as the legacy `createEntity(...)` helper.
 *
 * @example
 * ```ts
 * import { entities } from '@geoprotocol/geo-sdk/ops';
 *
 * const { id, ops } = entities.create({
 *   name: 'Restaurant',
 *   description: 'A neighborhood restaurant',
 *   types: [restaurantTypeId],
 *   values: [
 *     {
 *       property: websitePropertyId,
 *       type: 'text',
 *       value: 'https://example.com',
 *     },
 *   ],
 * });
 * ```
 *
 * @param params Entity fields, values, relations, and types to encode.
 * @returns Generated or supplied entity ID and create ops.
 * @throws When any supplied ID is invalid.
 */
export const create = (params: EntityParams): CreateResult => createEntity(params);

/**
 * Builds update-entity ops.
 *
 * @example
 * ```ts
 * import { entities } from '@geoprotocol/geo-sdk/ops';
 *
 * const { ops } = entities.update({
 *   id: entityId,
 *   name: 'Updated restaurant name',
 *   unset: [{ property: oldDescriptionPropertyId }],
 * });
 * ```
 *
 * @param params Entity ID and values/properties to update or unset.
 * @returns Entity ID and update ops.
 * @throws When any supplied ID is invalid.
 */
export const update = (params: UpdateEntityParams): CreateResult => updateEntity(params);
