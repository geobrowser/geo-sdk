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
  entityId: string;
  spaceId: string;
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
