import { createType } from '../graph/create-type.js';
import type { CreateResult, CreateTypeParams } from '../types.js';

export const create = (params: CreateTypeParams): CreateResult => createType(params);
