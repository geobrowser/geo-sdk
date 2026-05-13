import { assertValid } from '../id-utils.js';
import * as Ops from '../ops/index.js';
import type { CreateResult, UpdateProposalReviewParams } from '../types.js';

/**
 * Updates a proposal review entity.
 *
 * @deprecated Use `Ops.proposalReviews.update(...)`.
 */
export const updateProposalReview = (params: UpdateProposalReviewParams): CreateResult => {
  assertValid(params.proposalReviewId, '`proposalReviewId` in `updateProposalReview`');

  return Ops.proposalReviews.update(params);
};
