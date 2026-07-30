/**
 * This module provides legacy utility functions for working with data blocks.
 *
 * @since 0.0.6
 */

import type { Op } from '@geoprotocol/grc-20';
import { create, type DataBlockParams } from '../../ops/data-blocks.js';

export type { DataBlockParams, DataBlockSourceType } from '../../ops/data-blocks.js';

/**
 * Returns the ops to create an entity representing a data block.
 *
 * @deprecated Use `Ops.dataBlocks.create(...)` to receive both the block ID and ops.
 *
 * @example
 * ```ts
 * const ops = DataBlock.make({
 *   fromId: pageId,
 *   sourceType: 'QUERY',
 *   id: blockId,
 * });
 * ```
 */
export function make(params: DataBlockParams): Op[] {
  return create(params).ops;
}
