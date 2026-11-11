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
import { type ConnectionPage, collectPages, PAGE_INFO_FIELDS, pageArgs } from './paginate.js';

class DeleteEntityError extends Error {
  readonly _tag = 'DeleteEntityError';
}

type ValueNode = { propertyId: string; spaceId: string };
type RelationNode = { id: string; spaceId: string };

type EntityGraphQLResponse = {
  entity?: { id: string } | null;
  values?: ConnectionPage<ValueNode> | null;
  relations?: ConnectionPage<RelationNode> | null;
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
  const valuesField = (after: string | null) => `values: valuesConnection(
      ${pageArgs(after)}
      filter: { entityId: { is: "${id}" }, spaceId: { is: ${JSON.stringify(normalizedSpaceId)} } }
    ) {
      nodes {
        propertyId
        spaceId
      }
      ${PAGE_INFO_FIELDS}
    }`;
  const relationsField = (after: string | null) => `relations: relationsConnection(
      ${pageArgs(after)}
      filter: { fromEntityId: { is: "${id}" }, spaceId: { is: ${JSON.stringify(normalizedSpaceId)} } }
    ) {
      nodes {
        id
        spaceId
      }
      ${PAGE_INFO_FIELDS}
    }`;

  const fetchPage = async (fields: string): Promise<EntityGraphQLResponse> => {
    try {
      return await graphqlData<EntityGraphQLResponse>(context, `query entity {\n    ${fields}\n  }`);
    } catch (error) {
      const message = String(error);
      if (message.includes('Could not parse GraphQL response')) {
        throw new DeleteEntityError(`Could not parse GraphQL response for entity ${id}: ${error}`);
      }
      throw new DeleteEntityError(`Could not fetch entity data for ${id}: ${error}`);
    }
  };
  const pageOf = <T>(page: ConnectionPage<T> | null | undefined, name: string): ConnectionPage<T> => {
    if (!page) {
      throw new DeleteEntityError(`Could not fetch entity data for ${id}: missing ${name}`);
    }
    return page;
  };
  const fail = (reason: string) => new DeleteEntityError(`Could not fetch entity data for ${id}: ${reason}`);

  // One request for the existence check and the first page of each list; more only when a list
  // has over 1000 rows in this space.
  const first = await fetchPage(`entity(id: "${id}") { id }\n    ${valuesField(null)}\n    ${relationsField(null)}`);

  if (!first.entity) {
    return { id: Id(id), ops: [] };
  }

  const values = await collectPages(
    pageOf(first.values, 'values'),
    async after => pageOf((await fetchPage(valuesField(after))).values, 'values'),
    fail,
  );
  const relations = await collectPages(
    pageOf(first.relations, 'relations'),
    async after => pageOf((await fetchPage(relationsField(after))).relations, 'relations'),
    fail,
  );

  return createDeleteEntityOps({
    id,
    spaceId,
    values,
    relations,
  });
}
