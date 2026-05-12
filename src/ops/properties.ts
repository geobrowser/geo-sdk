import { createProperty } from '../graph/create-property.js';
import type { CreatePropertyParams, CreateResult } from '../types.js';

/**
 * Builds create-property ops without network access.
 *
 * @example
 * ```ts
 * import { properties } from '@geoprotocol/geo-sdk/ops';
 *
 * const { id, ops } = properties.create({
 *   name: 'Website',
 *   dataType: 'TEXT',
 * });
 * ```
 *
 * @param params Property ID, name, data type, and optional relation-property metadata.
 * @returns Generated or supplied property entity ID and create ops.
 * @throws When any supplied ID is invalid.
 */
export const create = (params: CreatePropertyParams): CreateResult => createProperty(params);
