import type { Op } from '@geoprotocol/grc-20';
import { BLOCKS, MARKDOWN_CONTENT, TEXT_BLOCK, TYPES_PROPERTY } from '../core/ids/system.js';
import { createRelation } from '../graph/create-relation.js';
import { updateEntity } from '../graph/update-entity.js';
import { Id, type Id as IdType } from '../id.js';
import { assertValid, generate } from '../id-utils.js';
import type { CreateResult } from '../types.js';

export type TextBlockParams = {
  fromId: IdType | string;
  text: string;
  position?: string;
  id?: IdType | string;
};

/**
 * Builds ops to create a text block.
 *
 * @example
 * ```ts
 * const { id, ops } = Ops.textBlocks.create({
 *   fromId: pageId,
 *   text: '# Heading',
 *   id: blockId,
 * });
 * ```
 *
 * @param params Parent entity, markdown content, position, and optional stable block ID.
 * @returns Generated or supplied block ID and create ops.
 * @throws When a supplied ID is invalid.
 */
export function create({ fromId, text, position, id: providedId }: TextBlockParams): CreateResult {
  if (providedId) assertValid(providedId, '`id` in `Ops.textBlocks.create`');
  const id = providedId ? Id(providedId) : generate();
  const ops: Op[] = [];

  const { ops: textBlockTypeOps } = createRelation({
    fromEntity: id,
    type: TYPES_PROPERTY,
    toEntity: TEXT_BLOCK,
  });
  ops.push(...textBlockTypeOps);

  const { ops: textBlockMarkdownTextOps } = updateEntity({
    id,
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
    toEntity: id,
    position,
  });
  ops.push(...textBlockRelationOps);

  return { id, ops };
}
