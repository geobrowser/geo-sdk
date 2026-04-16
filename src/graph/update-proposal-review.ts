import {
  ACCURACY_RATING_PROPERTY,
  COMPLETENESS_RATING_PROPERTY,
  EFFORT_RATING_PROPERTY,
  PASS_PROPERTY,
  SKILL_RATING_PROPERTY,
} from '../core/ids/system.js';
import { assertValid } from '../id-utils.js';
import type { CreateResult, PropertiesParam, UpdateProposalReviewParams } from '../types.js';
import { updateEntity } from './update-entity.js';

/**
 * Updates a proposal review entity. Pass is always required.
 * For medium/hard bounties, all ratings must also be provided.
 *
 * @example
 * ```ts
 * import { Graph } from '@geoprotocol/geo-sdk';
 *
 * // Update pass only (low difficulty)
 * const { id, ops } = Graph.updateProposalReview({
 *   proposalReviewId: reviewId,
 *   pass: false,
 * });
 *
 * // Update with ratings (medium/hard difficulty)
 * const { id, ops } = Graph.updateProposalReview({
 *   proposalReviewId: reviewId,
 *   pass: true,
 *   completeness: 0.8,
 *   accuracy: 1,
 *   skill: 0.6,
 *   effort: 0.4,
 * });
 * ```
 *
 * @param params – {@link UpdateProposalReviewParams}
 * @returns – {@link CreateResult}
 */
export const updateProposalReview = (params: UpdateProposalReviewParams): CreateResult => {
  assertValid(params.proposalReviewId, '`proposalReviewId` in `updateProposalReview`');

  const values: PropertiesParam = [
    {
      property: PASS_PROPERTY,
      type: 'boolean',
      value: params.pass,
    },
  ];

  if ('completeness' in params) {
    values.push(
      { property: COMPLETENESS_RATING_PROPERTY, type: 'float', value: params.completeness },
      { property: ACCURACY_RATING_PROPERTY, type: 'float', value: params.accuracy },
      { property: SKILL_RATING_PROPERTY, type: 'float', value: params.skill },
      { property: EFFORT_RATING_PROPERTY, type: 'float', value: params.effort },
    );
  }

  return updateEntity({
    id: params.proposalReviewId,
    name: params.proposal?.name,
    values,
  });
};
