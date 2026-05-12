import { getCreatePersonalSpaceCalldata } from '../encodings/get-create-personal-space-calldata.js';
import { requireGeoContract } from '../networks.js';
import type { GeoClientContext } from './context.js';
import type { PublishEditToSpaceParams } from './edits.js';

export function createPersonalSpacesClient(context: GeoClientContext) {
  return {
    create() {
      return {
        to: requireGeoContract(context.network, 'SPACE_REGISTRY_ADDRESS'),
        calldata: getCreatePersonalSpaceCalldata(),
      };
    },

    async publishEdit(params: PublishEditToSpaceParams) {
      const { createEditsClient } = await import('./edits.js');
      const edits = createEditsClient(context);
      return edits.publishToSpace(params);
    },
  };
}
