import {
  type UnsetValue as GrcUnsetValue,
  deleteRelation as grcDeleteRelation,
  updateEntity as grcUpdateEntity,
  type Op,
} from '@geoprotocol/grc-20';
import { Micro } from 'effect';
import { Id } from '../id.js';
import { assertValid, toGrcId } from '../id-utils.js';
import type { CreateResult, DeleteEntityParams, Network } from '../types.js';
import { getApiOrigin } from './constants.js';

class DeleteEntityError extends Error {
  readonly _tag = 'DeleteEntityError';
}

type EntityGraphQLResponse = {
  data: {
    entity: {
      valuesList: Array<{ propertyId: string; spaceId: string }>;
      relationsList: Array<{ id: string; spaceId: string }>;
    } | null;
  };
};

/**
 * Deletes an entity by unsetting all its values and deleting all its relations
 * in the specified spaces.
 *
 * Queries the GraphQL API to discover the entity's values and relations,
 * then creates the appropriate operations to remove them.
 *
 * @example
 * ```ts
 * const { ops } = await deleteEntity({
 *   id: entityId,
 *   spaceIds: [spaceId],
 * });
 * ```
 *
 * @param params – {@link DeleteEntityParams}
 * @returns The operations to delete the entity's values and relations.
 */
export const deleteEntity = async ({ id, spaceIds, network }: DeleteEntityParams): Promise<CreateResult> => {
  assertValid(id, '`id` in `deleteEntity`');
  for (const spaceId of spaceIds) {
    assertValid(spaceId, '`spaceIds` in `deleteEntity`');
  }
  if (spaceIds.length === 0) {
    throw new Error('`spaceIds` in `deleteEntity` must not be empty');
  }

  const resolvedNetwork: Network = network ?? 'TESTNET';

  const query = `query entity {
    entity(id: "${id}") {
      valuesList(filter: { spaceId: { in: ${JSON.stringify(spaceIds)} } }) {
        propertyId
        spaceId
      }
      relationsList(filter: { spaceId: { in: ${JSON.stringify(spaceIds)} } }) {
        id
        spaceId
      }
    }
  }`;

  const fetchEntityData = Micro.gen(function* () {
    const result = yield* Micro.tryPromise({
      try: () =>
        fetch(`${getApiOrigin(resolvedNetwork)}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        }),
      catch: error => new DeleteEntityError(`Could not fetch entity data for ${id}: ${error}`),
    });

    const json = yield* Micro.tryPromise({
      try: () => result.json() as Promise<EntityGraphQLResponse>,
      catch: error => new DeleteEntityError(`Could not parse GraphQL response for entity ${id}: ${error}`),
    });

    return json;
  });

  const response = await Micro.runPromise(fetchEntityData);

  if (!response.data?.entity) {
    return { id: Id(id), ops: [] };
  }

  const { valuesList, relationsList } = response.data.entity;
  const ops: Op[] = [];

  const uniquePropertyIds = [...new Set(valuesList.map(v => v.propertyId))];

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

  for (const relation of relationsList) {
    ops.push(grcDeleteRelation(toGrcId(relation.id)));
  }

  return { id: Id(id), ops };
};
