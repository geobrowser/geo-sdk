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
  values: Array<{ propertyId: string; spaceId: string }>;
  relations: Array<{ id: string; spaceId: string }>;
};

export const create = (params: EntityParams): CreateResult => createEntity(params);

export const update = (params: UpdateEntityParams): CreateResult => updateEntity(params);

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

export { deleteEntityOps as delete };
