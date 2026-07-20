/**
 * This module provides utility functions for working with text blocks
 * in TypeScript.
 *
 * @since 0.0.6
 */

import type { Op } from '@geoprotocol/grc-20';
import { createRelation } from '../../graph/create-relation.js';
import { updateEntity } from '../../graph/update-entity.js';
import { Id } from '../../id.js';
import { assertValid, generate } from '../../id-utils.js';
import type { CreateResult } from '../../types.js';
import { BLOCKS, MARKDOWN_CONTENT, TEXT_BLOCK, TYPES_PROPERTY } from '../ids/system.js';

type TextBlockParams = { fromId: string; text: string; position?: string; id?: Id | string };

/**
 * Returns the id and ops to create an entity representing a Text Block.
 *
 * Pass a stable `id` to make re-runs deterministic: a script that derives the
 * block id from its content can check for the block's existence and skip
 * re-publishing instead of minting a duplicate.
 *
 * @example
 * ```ts
 * const { id, ops } = TextBlock.make({
 *   fromId: 'from-id',
 *   text: 'text',
 *   // optional
 *   position: 'position-string',
 *   id: blockId, // optional and will be generated if not provided
 * });
 * ```
 *
 * @param param args {@link TextBlockParams}
 * @returns – {@link CreateResult}
 */
export function make({ fromId, text, position, id: providedId }: TextBlockParams): CreateResult {
  if (providedId) assertValid(providedId, '`id` in `TextBlock.make`');
  const newBlockId = providedId ? Id(providedId) : generate();

  const ops: Op[] = [];

  const { ops: textBlockTypeOps } = createRelation({
    fromEntity: newBlockId,
    type: TYPES_PROPERTY,
    toEntity: TEXT_BLOCK,
  });
  ops.push(...textBlockTypeOps);

  const { ops: textBlockMarkdownTextOps } = updateEntity({
    id: newBlockId,
    values: [
      {
        property: MARKDOWN_CONTENT,
        type: 'text',
        value: text,
      },
    ],
  });
  ops.push(...textBlockMarkdownTextOps);

  const { ops: textBlockRelationOps } = createRelation({
    fromEntity: Id(fromId),
    type: BLOCKS,
    toEntity: newBlockId,
    position,
  });
  ops.push(...textBlockRelationOps);

  return { id: newBlockId, ops };
}
