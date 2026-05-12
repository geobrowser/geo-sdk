import { create as createCommentWithContext } from '../client/comments.js';
import { resolveGeoNetwork } from '../networks.js';
import type { CreateCommentParams, CreateResult } from '../types.js';

/**
 * Creates a comment entity. Content can be plain text or markdown.
 *
 * @deprecated Use `createGeoClient({ network }).comments.create(...)` for fetched reply context, or
 * `Ops.comments.create(...)` when reply context is already available.
 */
export const createComment = async ({ network = 'TESTNET', ...params }: CreateCommentParams): Promise<CreateResult> => {
  return createCommentWithContext({ network: resolveGeoNetwork(network), fetch: globalThis.fetch }, params);
};
