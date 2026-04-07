import { MARKDOWN_CONTENT, RESOLVED_PROPERTY } from '../core/ids/system.js';
import { assertValid } from '../id-utils.js';
import type { CreateResult, PropertiesParam, UpdateCommentParams } from '../types.js';
import { deriveCommentName } from './comment-utils.js';
import { updateEntity } from './update-entity.js';

/**
 * Updates a comment entity. Only the provided fields are updated.
 *
 * @example
 * ```ts
 * import { Graph } from '@geoprotocol/geo-sdk';
 *
 * const { id, ops } = Graph.updateComment({
 *   id: commentId,
 *   content: 'Updated content', // optional, only updated if provided
 *   resolved: true, // optional, only updated if provided
 * });
 * ```
 *
 * @param params – {@link UpdateCommentParams}
 * @returns – {@link CreateResult}
 */
export const updateComment = ({ id, content, resolved }: UpdateCommentParams): CreateResult => {
  assertValid(id, '`id` in `updateComment`');

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
