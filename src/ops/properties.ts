import { createProperty } from '../graph/create-property.js';
import type { CreatePropertyParams, CreateResult } from '../types.js';

export const create = (params: CreatePropertyParams): CreateResult => createProperty(params);
