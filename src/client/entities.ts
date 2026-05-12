import { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import * as Ops from '../ops/index.js';
import type { DeleteEntityParams } from '../types.js';
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

export const create = Ops.entities.create;
export const update = Ops.entities.update;

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

  return Ops.entities.delete({
    id,
    spaceId,
    values: response.entity.valuesList,
    relations: response.entity.relationsList,
  });
}
