import {
  type UnsetValue as GrcUnsetValue,
  deleteRelation as grcDeleteRelation,
  updateEntity as grcUpdateEntity,
  type Op,
} from '@geoprotocol/grc-20';
import { Id } from '../id.js';
import { assertValid, toGrcId } from '../id-utils.js';
import type { CreateResult, DeleteEntityParams } from '../types.js';
import { graphqlData } from './api.js';
import type { GeoClientContext } from './context.js';

class DeleteEntityError extends Error {
  readonly _tag = 'DeleteEntityError';
}

type EntityGraphQLResponse = {
  entity: {
    valuesList: Array<{ propertyId: string; spaceId: string }>;
    relationsList: Array<{ id: string; spaceId: string }>;
  } | null;
};

type DeleteEntityOpsParams = Omit<DeleteEntityParams, 'network'> & {
  values: Array<{ propertyId: string; spaceId: string }>;
  relations: Array<{ id: string; spaceId: string }>;
};

function createDeleteEntityOps({ id, spaceId, values, relations }: DeleteEntityOpsParams): CreateResult {
  assertValid(id, '`id` in `deleteEntity`');
  assertValid(spaceId, '`spaceId` in `deleteEntity`');

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
}

/**
 * Fetches the current entity values and relations for a space, then builds delete ops.
 *
 * Entity deletion requires current graph context so the SDK can unset existing
 * values and delete existing relations in the target space.
 *
 * @example
 * ```ts
 * const { ops } = await geo.entities.delete({
 *   id: entityId,
 *   spaceId,
 * });
 * ```
 *
 * @param context Client context containing API origin and fetch configuration.
 * @param params Entity ID and space ID to delete within.
 * @returns Entity ID and deletion ops, or no ops when the entity is not found.
 * @throws When IDs are invalid, fetch is unavailable, GraphQL fails, or the response is malformed.
 */
export async function deleteEntity(context: GeoClientContext, { id, spaceId }: Omit<DeleteEntityParams, 'network'>) {
  assertValid(id, '`id` in `deleteEntity`');
  assertValid(spaceId, '`spaceId` in `deleteEntity`');

  const normalizedSpaceId = String(spaceId).replaceAll('-', '');
  const query = `query entity {
    entity(id: "${id}") {
      valuesList(filter: { spaceId: { in: [${JSON.stringify(normalizedSpaceId)}] } }) {
        propertyId
        spaceId
      }
      relationsList(filter: { spaceId: { in: [${JSON.stringify(normalizedSpaceId)}] } }) {
        id
        spaceId
      }
    }
  }`;

  let response: EntityGraphQLResponse;
  try {
    response = await graphqlData<EntityGraphQLResponse>(context, query);
  } catch (error) {
    const message = String(error);
    if (message.includes('Could not parse GraphQL response')) {
      throw new DeleteEntityError(`Could not parse GraphQL response for entity ${id}: ${error}`);
    }
    throw new DeleteEntityError(`Could not fetch entity data for ${id}: ${error}`);
  }

  if (!response.entity) {
    return { id: Id(id), ops: [] };
  }

  return createDeleteEntityOps({
    id,
    spaceId,
    values: response.entity.valuesList,
    relations: response.entity.relationsList,
  });
}
