import { REPLY_TO_PROPERTY } from '../core/ids/system.js';
import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import * as Ops from '../ops/index.js';
import type { CreateCommentParams } from '../types.js';
import { graphqlData } from './api.js';
import type { GeoClientContext } from './context.js';

type EntityRelationsResponse = {
  entity: {
    relationsList: Array<{
      toEntity: { id: string };
      toSpace: { id: string } | null;
      position: string | null;
    }>;
  } | null;
};

async function fetchReplyToRelations(context: GeoClientContext, entityId: Id | string) {
  const query = `query entity {
    entity(id: "${entityId}") {
      relationsList(filter: { typeId: { in: ["${REPLY_TO_PROPERTY}"] } }) {
        toEntity { id }
        toSpace { id }
        position
      }
    }
  }`;

  const response = await graphqlData<EntityRelationsResponse>(context, query);

  if (!response.entity) {
    return [];
  }

  return response.entity.relationsList
    .filter((r): r is typeof r & { toSpace: { id: string } } => r.toSpace !== null)
    .map(r => ({
      entityId: r.toEntity.id,
      spaceId: r.toSpace.id,
      position: r.position,
    }));
}

export async function create(
  context: GeoClientContext,
  { id, content, replyTo, resolved = false }: Omit<CreateCommentParams, 'network'>,
) {
  if (id) assertValid(id, '`id` in `createComment`');
  assertValid(replyTo.entityId, '`replyTo.entityId` in `createComment`');
  assertValid(replyTo.spaceId, '`replyTo.spaceId` in `createComment`');

  const replyToRelations = await fetchReplyToRelations(context, replyTo.entityId);
  return Ops.comments.create({
    id,
    content,
    replyTo,
    resolved,
    replyToRelations,
  });
}

export const update = Ops.comments.update;
