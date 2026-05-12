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

/**
 * Creates comment ops using reply-chain context fetched from the configured Geo API.
 *
 * The direct `replyTo` target is always included first. If the target is itself
 * a comment, existing reply-to relations are fetched and appended so reply
 * chains preserve parent-to-root ordering.
 *
 * Use `Ops.comments.create(...)` when reply-chain context is already available
 * locally and no fetch should happen.
 *
 * @example
 * ```ts
 * const comment = await geo.comments.create({
 *   content: 'This should be easier to find.',
 *   replyTo: {
 *     entityId,
 *     spaceId,
 *   },
 * });
 * ```
 *
 * @example
 * Replying to another comment preserves the full reply-to chain automatically.
 *
 * ```ts
 * const reply = await geo.comments.create({
 *   content: 'Following up here.',
 *   replyTo: {
 *     entityId: comment.id,
 *     spaceId,
 *   },
 * });
 * ```
 *
 * @param context Client context containing API origin and fetch configuration.
 * @param params Comment content, reply target, optional ID, and resolved state.
 * @returns Comment entity ID and ops.
 * @throws When IDs are invalid, fetch is unavailable, GraphQL fails, or the response is malformed.
 */
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

/**
 * Builds update-comment ops without reading network config or fetching graph data.
 *
 * @example
 * ```ts
 * const { ops } = geo.comments.update({
 *   id: commentId,
 *   content: 'Updated comment text.',
 *   resolved: true,
 * });
 * ```
 *
 * @param params Comment ID plus content and/or resolved state to update.
 * @returns Comment entity ID and update ops.
 * @throws When the comment ID is invalid.
 */
export const update = Ops.comments.update;
