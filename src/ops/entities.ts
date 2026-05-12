import {
  type UnsetValue as GrcUnsetValue,
  deleteRelation as grcDeleteRelation,
  updateEntity as grcUpdateEntity,
  type Op,
} from '@geoprotocol/grc-20';
import { createEntity } from '../graph/create-entity.js';
import { updateEntity } from '../graph/update-entity.js';
import { Id } from '../id.js';
import { assertValid, toGrcId } from '../id-utils.js';
import type { CreateResult, DeleteEntityParams, EntityParams, UpdateEntityParams } from '../types.js';

export type DeleteEntityOpsParams = Omit<DeleteEntityParams, 'network'> & {
  /** Current property values for the entity, usually fetched from the graph API. */
  values: Array<{ propertyId: string; spaceId: string }>;
  /** Current relations for the entity, usually fetched from the graph API. */
  relations: Array<{ id: string; spaceId: string }>;
};

/**
 * Builds create-entity ops without network access.
 *
 * This is the pure version of entity creation. It validates supplied IDs and
 * encodes the same operation shape as the legacy `createEntity(...)` helper,
 * but does not require client config, fetch, or contract addresses.
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
 * Builds update-entity ops without network access.
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

/**
 * Builds deletion ops for an entity from already-fetched graph context.
 *
 * This pure helper does not fetch current values or relations. Callers must
 * provide the entity's existing values and relations so the SDK can unset
 * values and delete relations for the requested space. Use
 * `geo.entities.delete(...)` when that context should be fetched for you.
 *
 * @example
 * ```ts
 * import { entities } from '@geoprotocol/geo-sdk/ops';
 *
 * const { ops } = entities.delete({
 *   id: entityId,
 *   spaceId,
 *   values: [
 *     { propertyId: namePropertyId, spaceId },
 *     { propertyId: descriptionPropertyId, spaceId },
 *   ],
 *   relations: [{ id: relationId, spaceId }],
 * });
 * ```
 *
 * @param params Entity ID, space ID, values, and relations to delete within the target space.
 * @returns Entity ID and delete/update ops. Returns no ops when no supplied context matches the space.
 * @throws When the entity ID or space ID is invalid.
 */
export const deleteEntityOps = ({ id, spaceId, values, relations }: DeleteEntityOpsParams): CreateResult => {
  assertValid(id, '`id` in `Ops.entities.delete`');
  assertValid(spaceId, '`spaceId` in `Ops.entities.delete`');

  const normalizedSpaceId = String(spaceId).replaceAll('-', '');
  const ops: Op[] = [];
  const matchingValues = values.filter(v => v.spaceId === normalizedSpaceId);
  const matchingRelations = relations.filter(r => r.spaceId === normalizedSpaceId);
  const uniquePropertyIds = [...new Set(matchingValues.map(v => v.propertyId))];

  if (uniquePropertyIds.length > 0) {
    const unsetValues: GrcUnsetValue[] = uniquePropertyIds.map(propertyId => ({
      property: toGrcId(propertyId),
      language: { type: 'all' as const },
    }));

    ops.push(
      grcUpdateEntity({
        id: toGrcId(id),
        set: [],
        unset: unsetValues,
      }),
    );
  }

  for (const relation of matchingRelations) {
    ops.push(grcDeleteRelation(toGrcId(relation.id)));
  }

  return { id: Id(id), ops };
};

/** Alias for {@link deleteEntityOps}. */
export { deleteEntityOps as delete };
