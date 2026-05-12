import { createRelation } from '../graph/create-relation.js';
import { deleteRelation } from '../graph/delete-relation.js';
import { updateRelation } from '../graph/update-relation.js';
import type { CreateResult, DeleteRelationParams, RelationParams, UpdateRelationParams } from '../types.js';

/**
 * Builds create-relation ops.
 *
 * @example
 * ```ts
 * import { relations } from '@geoprotocol/geo-sdk/ops';
 *
 * const { id, ops } = relations.create({
 *   fromEntity: restaurantId,
 *   toEntity: personId,
 *   type: likesPropertyId,
 *   position: 'a0',
 * });
 * ```
 *
 * @param params Relation endpoints, relation type, optional relation ID, and optional relation entity fields.
 * @returns Generated or supplied relation entity ID and create ops.
 * @throws When any supplied ID is invalid.
 */
export const create = (params: RelationParams): CreateResult => createRelation(params);

/**
 * Builds update-relation ops.
 *
 * @example
 * ```ts
 * import { relations } from '@geoprotocol/geo-sdk/ops';
 *
 * const { ops } = relations.update({
 *   id: relationId,
 *   position: 'a1',
 * });
 * ```
 *
 * @param params Relation ID plus fields to update.
 * @returns Relation ID and update ops.
 * @throws When any supplied ID is invalid.
 */
export const update = (params: UpdateRelationParams): CreateResult => updateRelation(params);

/**
 * Builds delete-relation ops.
 *
 * @example
 * ```ts
 * import { relations } from '@geoprotocol/geo-sdk/ops';
 *
 * const { ops } = relations.delete({ id: relationId });
 * ```
 *
 * @param params Relation ID to delete.
 * @returns Relation ID and delete ops.
 * @throws When the relation ID is invalid.
 */
export const deleteRelationOps = (params: DeleteRelationParams): CreateResult => deleteRelation(params);

/** Alias for {@link deleteRelationOps}. */
export { deleteRelationOps as delete };
