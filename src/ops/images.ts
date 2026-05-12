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
  /** Uploaded IPFS URI for the image file. */
  cid: string;
  /** Optional dimensions detected during upload. */
  dimensions?: { width: number; height: number };
  /** Optional name value for the image entity. */
  name?: string;
  /** Optional description value for the image entity. */
  description?: string;
  /** Optional image entity ID. Generated when omitted. */
  id?: Id | string;
};

/**
 * Builds image entity ops from an already-uploaded image CID.
 *
 * This pure helper does not upload files or fetch image dimensions. Use
 * `geo.images.create(...)` when the SDK should upload the image first.
 *
 * @example
 * ```ts
 * import { images } from '@geoprotocol/geo-sdk/ops';
 *
 * const { id, ops } = images.create({
 *   cid: 'ipfs://baf...',
 *   name: 'Cover image',
 *   dimensions: { width: 1200, height: 630 },
 * });
 * ```
 *
 * @param params Uploaded CID, optional dimensions, optional metadata, and optional entity ID.
 * @returns Image entity ID, CID, dimensions, and create ops.
 * @throws When the optional image entity ID is invalid.
 */
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
