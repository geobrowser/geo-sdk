import { createRelation } from '../graph/create-relation.js';
import { deleteRelation } from '../graph/delete-relation.js';
import { updateRelation } from '../graph/update-relation.js';
import type { CreateResult, DeleteRelationParams, RelationParams, UpdateRelationParams } from '../types.js';

export const create = (params: RelationParams): CreateResult => createRelation(params);

export const update = (params: UpdateRelationParams): CreateResult => updateRelation(params);

export const deleteRelationOps = (params: DeleteRelationParams): CreateResult => deleteRelation(params);

export { deleteRelationOps as delete };
