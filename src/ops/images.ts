import { createRelation as grcCreateRelation } from '@geoprotocol/grc-20';
import {
  IMAGE_HEIGHT_PROPERTY,
  IMAGE_TYPE,
  IMAGE_URL_PROPERTY,
  IMAGE_WIDTH_PROPERTY,
  TYPES_PROPERTY,
} from '../core/ids/system.js';
import { Id } from '../id.js';
import { assertValid, generate, toGrcId } from '../id-utils.js';
import type { CreateImageResult, PropertiesParam } from '../types.js';
import { create as createEntity } from './entities.js';

export type CreateImageOpsParams = {
  cid: string;
  dimensions?: { width: number; height: number };
  name?: string;
  description?: string;
  id?: Id | string;
};

export const create = ({
  cid,
  dimensions,
  name,
  description,
  id: providedId,
}: CreateImageOpsParams): CreateImageResult => {
  if (providedId) assertValid(providedId, '`id` in `Ops.images.create`');

  const id = providedId ?? generate();
  const values: PropertiesParam = [
    {
      property: IMAGE_URL_PROPERTY,
      type: 'text',
      value: cid,
    },
  ];

  if (dimensions?.height) {
    values.push({
      property: IMAGE_HEIGHT_PROPERTY,
      type: 'float',
      value: dimensions.height,
    });
  }
  if (dimensions?.width) {
    values.push({
      property: IMAGE_WIDTH_PROPERTY,
      type: 'float',
      value: dimensions.width,
    });
  }

  const result = createEntity({
    id,
    name,
    description,
    values,
  });

  result.ops.push(
    grcCreateRelation({
      id: toGrcId(generate()),
      entity: toGrcId(generate()),
      from: toGrcId(id),
      to: toGrcId(IMAGE_TYPE),
      relationType: toGrcId(TYPES_PROPERTY),
    }),
  );

  return {
    id: Id(id),
    cid,
    dimensions,
    ops: result.ops,
  };
};
