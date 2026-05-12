import { getCreatePersonalSpaceCalldata } from '../encodings/get-create-personal-space-calldata.js';
import { requireGeoContract } from '../networks.js';
import type { GeoClientContext } from './context.js';
import type { PublishEditToSpaceParams } from './edits.js';

export function create(context: GeoClientContext) {
  return {
    to: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
    calldata: getCreatePersonalSpaceCalldata(),
  };
}

export async function publishEdit(context: GeoClientContext, params: PublishEditToSpaceParams) {
  const { publishToSpace } = await import('./edits.js');
  return publishToSpace(context, params);
}
