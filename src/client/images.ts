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
import { type PublishImageParams, uploadImageCore } from '../ipfs-core.js';
import { create as createEntity } from '../ops/entities.js';
import type { CreateImageResult, PropertiesParam } from '../types.js';
import type { GeoClientContext } from './context.js';
import { requireFetch } from './context.js';

export type CreateImageParams = PublishImageParams & {
  name?: string;
  description?: string;
  id?: Id | string;
  alternativeGateway?: boolean;
};

/**
 * Uploads an image and builds the corresponding image entity ops.
 *
 * This is the context-aware image workflow used by `geo.images.create(...)`.
 * It uploads the image through the configured API origin, attempts to read
 * image dimensions, then creates image entity ops.
 *
 * @example
 * ```ts
 * const { id, cid, dimensions, ops } = await geo.images.create({
 *   url: 'https://example.com/cover.png',
 *   name: 'Cover image',
 *   description: 'Image used as the space cover.',
 * });
 *
 * console.log(id, cid, dimensions);
 * ```
 *
 * @param context Client context containing network and fetch configuration.
 * @param params Image source plus optional entity metadata.
 * @returns Created image entity ID, uploaded CID, dimensions when detected, and ops.
 * @throws When the optional ID is invalid, fetch is unavailable, upload fails, or the CID response is invalid.
 */
export async function create(context: GeoClientContext, params: CreateImageParams) {
  if (params.id) assertValid(params.id, '`id` in `createImage`');

  const { cid, dimensions } = await uploadImageCore({
    ...params,
    apiOrigin: context.network.apiOrigin,
    fetch: requireFetch(context, 'Image creation'),
  });

  return createImageOps({
    id: params.id,
    name: params.name,
    description: params.description,
    cid,
    dimensions,
  });
}

type CreateImageOpsParams = {
  cid: string;
  dimensions?: { width: number; height: number };
  name?: string;
  description?: string;
  id?: Id | string;
};

function createImageOps({
  cid,
  dimensions,
  name,
  description,
  id: providedId,
}: CreateImageOpsParams): CreateImageResult {
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
}
