/**
 * This module provides legacy utility functions for working with text blocks.
 *
 * @since 0.0.6
 */

import type { Op } from '@geoprotocol/grc-20';
import { create, type TextBlockParams } from '../../ops/text-blocks.js';

export type { TextBlockParams } from '../../ops/text-blocks.js';

/**
 * Returns the ops to create an entity representing a text block.
 *
 * @deprecated Use `Ops.textBlocks.create(...)` to receive both the block ID and ops.
 *
 * @example
 * ```ts
 * const ops = TextBlock.make({
 *   fromId: pageId,
 *   text: '# Heading',
 *   id: blockId,
 * });
 * ```
 */
export function make(params: TextBlockParams): Op[] {
  return create(params).ops;
}
