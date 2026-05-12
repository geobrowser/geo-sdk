import type { Op } from '@geoprotocol/grc-20';
import { SPACE_TYPE } from '../core/ids/system.js';
import {
  type CreateDaoSpaceCalldataParams,
  getCreateDaoSpaceCalldata,
} from '../encodings/get-create-dao-space-calldata.js';
import type { Id } from '../id.js';
import * as IdUtils from '../id-utils.js';
import { requireGeoContract } from '../networks.js';
import * as Ops from '../ops/index.js';
import type { GeoClientContext } from './context.js';

export type CreateDaoSpaceParams = Omit<
  CreateDaoSpaceCalldataParams,
  'initialEditsContentUri' | 'initialMemberSpaceIds'
> & {
  name: string;
  author: Id | string;
  initialMemberSpaceIds?: `0x${string}`[];
  ops?: Op[];
};

export function createDaoSpacesClient(context: GeoClientContext) {
  return {
    async create(params: CreateDaoSpaceParams) {
      const daoSpaceFactoryAddress = requireGeoContract(context.network, 'DAO_SPACE_FACTORY_ADDRESS');
      getCreateDaoSpaceCalldata({
        votingSettings: params.votingSettings,
        initialEditorSpaceIds: params.initialEditorSpaceIds,
        initialMemberSpaceIds: params.initialMemberSpaceIds ?? [],
        initialEditsContentUri: 'ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5',
        initialTopicId: params.initialTopicId,
      });

      const { createEditsClient } = await import('./edits.js');
      const edits = createEditsClient(context);

      const spaceEntityId = IdUtils.generate();
      const ops: Op[] = [];
      const { ops: createSpaceEntityOps } = Ops.entities.create({
        id: spaceEntityId,
        name: params.name,
        types: [SPACE_TYPE],
      });
      ops.push(...createSpaceEntityOps);
      ops.push(...(params.ops ?? []));

      const { cid } = await edits.publish({
        name: `Create DAO Space: ${params.name}`,
        ops,
        author: params.author,
      });

      const calldata = getCreateDaoSpaceCalldata({
        votingSettings: params.votingSettings,
        initialEditorSpaceIds: params.initialEditorSpaceIds,
        initialMemberSpaceIds: params.initialMemberSpaceIds ?? [],
        initialEditsContentUri: cid,
        initialTopicId: params.initialTopicId,
      });

      return {
        to: daoSpaceFactoryAddress,
        calldata,
        spaceEntityId,
        cid,
      };
    },
  };
}
