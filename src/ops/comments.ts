import { COMMENT_TYPE } from '../core/ids/content.js';
import { MARKDOWN_CONTENT, REPLY_TO_PROPERTY, RESOLVED_PROPERTY } from '../core/ids/system.js';
import { generateBetween } from '../core/position.js';
import { deriveCommentName } from '../graph/comment-utils.js';
import type { Id as IdType } from '../id.js';
import { Id } from '../id.js';
import { assertValid, generate } from '../id-utils.js';
import type { CreateResult, PropertiesParam, UpdateCommentParams } from '../types.js';
import { create as createEntity, update as updateEntity } from './entities.js';

export type ReplyToContext = {
  /** Ancestor entity ID from an existing reply-to relation. */
  entityId: string;
  /** Space ID associated with the ancestor reply target. */
  spaceId: string;
  /** Existing reply-to relation position used for parent-to-root ordering. */
  position: string | null;
};

export type CreateCommentOpsParams = {
  id?: IdType | string;
  content: string;
  replyTo: {
    entityId: IdType | string;
    spaceId: IdType | string;
  };
  resolved?: boolean;
  replyToRelations?: ReplyToContext[];
};

/**
 * Builds create-comment ops.
 *
 * The direct `replyTo` target is always included. If `replyToRelations` are
 * provided, they are sorted by position and appended after the direct parent so
 * nested comments preserve a parent-to-root reply chain.
 *
 * @example
 * Create a comment on an entity.
 *
 * ```ts
 * import { comments } from '@geoprotocol/geo-sdk/ops';
 *
 * const { id, ops } = comments.create({
 *   content: 'Looks good to me',
 *   replyTo: { entityId, spaceId },
 * });
 * ```
 *
 * @example
 * Create a nested comment when reply context is already available.
 *
 * ```ts
 * const { ops } = comments.create({
 *   content: 'Replying to the parent comment',
 *   replyTo: { entityId: parentCommentId, spaceId },
 *   replyToRelations: [
 *     { entityId: rootEntityId, spaceId, position: 'a0' },
 *   ],
 * });
 * ```
 *
 * @param params Comment content, reply target, optional ID, resolved state, and optional ancestor reply context.
 * @returns Comment entity ID and create ops.
 * @throws When the comment ID or reply target IDs are invalid.
 */
export const create = ({
  id: providedId,
  content,
  replyTo,
  resolved = false,
  replyToRelations = [],
}: CreateCommentOpsParams): CreateResult => {
  if (providedId) assertValid(providedId, '`id` in `Ops.comments.create`');
  assertValid(replyTo.entityId, '`replyTo.entityId` in `Ops.comments.create`');
  assertValid(replyTo.spaceId, '`replyTo.spaceId` in `Ops.comments.create`');

  const id = providedId ?? generate();
  const orderedTargets: Array<{ toEntity: IdType | string; toSpace: IdType | string }> = [];

  if (replyToRelations.length > 0) {
    orderedTargets.push({ toEntity: replyTo.entityId, toSpace: replyTo.spaceId });
    const sorted = [...replyToRelations].sort((a, b) => {
      if (a.position === null && b.position === null) return 0;
      if (a.position === null) return 1;
      if (b.position === null) return -1;
      return a.position.localeCompare(b.position);
    });
    for (const relation of sorted) {
      orderedTargets.push({ toEntity: relation.entityId, toSpace: relation.spaceId });
    }
  } else {
    orderedTargets.push({ toEntity: replyTo.entityId, toSpace: replyTo.spaceId });
  }

  let lastPosition: string | null = null;
  const replyToRelationEntries: Array<{ toEntity: IdType | string; toSpace: IdType | string; position: string }> = [];
  for (const target of orderedTargets) {
    const position = generateBetween(lastPosition, null);
    replyToRelationEntries.push({ ...target, position });
    lastPosition = position;
  }

  const result = createEntity({
    id,
    name: deriveCommentName(content),
    types: [COMMENT_TYPE],
    values: [
      {
        property: MARKDOWN_CONTENT,
        type: 'text',
        value: content,
      },
      {
        property: RESOLVED_PROPERTY,
        type: 'boolean',
        value: resolved,
      },
    ],
    relations: {
      [REPLY_TO_PROPERTY]: replyToRelationEntries,
    },
  });

  return { id: Id(id), ops: result.ops };
};

/**
 * Builds update-comment ops.
 *
 * If `content` is supplied, both markdown content and the derived comment name
 * are updated. If `resolved` is supplied, the resolved property is updated.
 *
 * @example
 * ```ts
 * import { comments } from '@geoprotocol/geo-sdk/ops';
 *
 * const { ops } = comments.update({
 *   id: commentId,
 *   content: 'Updated comment text',
 *   resolved: true,
 * });
 * ```
 *
 * @param params Comment ID plus content and/or resolved state to update.
 * @returns Comment entity ID and update ops.
 * @throws When the comment ID is invalid.
 */
export const update = ({ id, content, resolved }: UpdateCommentParams): CreateResult => {
  assertValid(id, '`id` in `Ops.comments.update`');

  const values: PropertiesParam = [];

  if (content !== undefined) {
    values.push({
      property: MARKDOWN_CONTENT,
      type: 'text',
      value: content,
    });
  }

  if (resolved !== undefined) {
    values.push({
      property: RESOLVED_PROPERTY,
      type: 'boolean',
      value: resolved,
    });
  }

  return updateEntity({
    id,
    name: content !== undefined ? deriveCommentName(content) : undefined,
    values,
  });
};
