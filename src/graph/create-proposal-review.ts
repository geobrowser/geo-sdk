import { assertValid } from '../id-utils.js';
import * as Ops from '../ops/index.js';
import type { CreateProposalReviewParams, CreateResult } from '../types.js';

/**
 * Creates a proposal review entity with a pass/fail status and optional star ratings.
 *
 * @deprecated Use `Ops.proposalReviews.create(...)`.
 */
export const createProposalReview = (params: CreateProposalReviewParams): CreateResult => {
  if (params.id) assertValid(params.id, '`id` in `createProposalReview`');
  assertValid(params.proposal.id, '`proposal.id` in `createProposalReview`');

  return Ops.proposalReviews.create(params);
};
