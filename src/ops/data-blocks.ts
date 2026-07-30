import type { Op } from '@geoprotocol/grc-20';
import {
  BLOCKS,
  DATA_BLOCK,
  DATA_SOURCE_TYPE_RELATION_TYPE,
  NAME_PROPERTY,
  TYPES_PROPERTY,
} from '../core/ids/system.js';
import { createRelation } from '../graph/create-relation.js';
import { updateEntity } from '../graph/update-entity.js';
import { Id, type Id as IdType } from '../id.js';
import { assertValid, generate } from '../id-utils.js';
import { SystemIds } from '../system-ids.js';
import type { CreateResult } from '../types.js';

export type DataBlockSourceType = 'QUERY' | 'COLLECTION' | 'GEO';

export type DataBlockParams = {
  fromId: IdType | string;
  sourceType: DataBlockSourceType;
  position?: string;
  name?: string;
  id?: IdType | string;
};

function getSourceTypeId(sourceType: DataBlockSourceType) {
  switch (sourceType) {
    case 'COLLECTION':
      return SystemIds.COLLECTION_DATA_SOURCE;
    case 'GEO':
      return SystemIds.ALL_OF_GEO_DATA_SOURCE;
    case 'QUERY':
      return SystemIds.QUERY_DATA_SOURCE;
  }
}

/**
 * Builds ops to create a data block.
 *
 * @example
 * ```ts
 * const { id, ops } = Ops.dataBlocks.create({
 *   fromId: pageId,
 *   sourceType: 'QUERY',
 *   id: blockId,
 * });
 * ```
 *
 * @param params Parent entity, source type, display fields, and optional stable block ID.
 * @returns Generated or supplied block ID and create ops.
 * @throws When a supplied ID is invalid.
 */
export function create({ fromId, sourceType, position, name, id: providedId }: DataBlockParams): CreateResult {
  if (providedId) assertValid(providedId, '`id` in `Ops.dataBlocks.create`');
  const id = providedId ? Id(providedId) : generate();
  const ops: Op[] = [];

  const { ops: dataBlockTypeOps } = createRelation({
    fromEntity: id,
    type: TYPES_PROPERTY,
    toEntity: DATA_BLOCK,
  });
  ops.push(...dataBlockTypeOps);

  const { ops: dataBlockSourceTypeOps } = createRelation({
    fromEntity: id,
    type: DATA_SOURCE_TYPE_RELATION_TYPE,
    toEntity: getSourceTypeId(sourceType),
  });
  ops.push(...dataBlockSourceTypeOps);

  const { ops: dataBlockRelationOps } = createRelation({
    fromEntity: Id(fromId),
    type: BLOCKS,
    toEntity: id,
    position,
  });
  ops.push(...dataBlockRelationOps);

  if (name) {
    const { ops: nameOps } = updateEntity({
      id,
      values: [
        {
          property: NAME_PROPERTY,
          type: 'text',
          value: name,
        },
      ],
    });
    ops.push(...nameOps);
  }

  return { id, ops };
}
