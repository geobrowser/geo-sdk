import {
  ACCURACY_RATING_PROPERTY,
  BOUNTY_REVIEW_TYPE,
  COMPLETENESS_RATING_PROPERTY,
  EFFORT_RATING_PROPERTY,
  MARKDOWN_CONTENT,
  PASS_PROPERTY,
  PROPOSALS_PROPERTY,
  SKILL_RATING_PROPERTY,
} from '../core/ids/system.js';
import { Id } from '../id.js';
import { assertValid, generate } from '../id-utils.js';
import type {
  CreateProposalReviewParams,
  CreateResult,
  PropertiesParam,
  UpdateProposalReviewParams,
} from '../types.js';
import { create as createEntity, update as updateEntity } from './entities.js';

/**
 * Builds create-proposal-review ops.
 *
 * The review is linked to the proposal through the proposals relation and can
 * include pass/fail, optional markdown content, and optional rating values.
 *
 * @example
 * ```ts
 * import { proposalReviews } from '@geoprotocol/geo-sdk/ops';
 *
 * const { id, ops } = proposalReviews.create({
 *   proposal: { id: proposalId, name: 'Improve restaurant data' },
 *   pass: true,
 *   content: 'The edit is complete and accurate.',
 * });
 * ```
 *
 * @param params Proposal reference, pass/fail value, optional content, optional ratings, and optional review ID.
 * @returns Generated or supplied review entity ID and create ops.
 * @throws When the review ID or proposal ID is invalid.
 */
export const create = (params: CreateProposalReviewParams): CreateResult => {
  if (params.id) assertValid(params.id, '`id` in `Ops.proposalReviews.create`');
  assertValid(params.proposal.id, '`proposal.id` in `Ops.proposalReviews.create`');

  const id = params.id ?? generate();
  const values: PropertiesParam = [
    {
      property: PASS_PROPERTY,
      type: 'boolean',
      value: params.pass,
    },
  ];

  if (params.content) {
    values.push({
      property: MARKDOWN_CONTENT,
      type: 'text',
      value: params.content,
    });
  }

  if ('completeness' in params) {
    values.push(
      { property: COMPLETENESS_RATING_PROPERTY, type: 'float', value: params.completeness },
      { property: ACCURACY_RATING_PROPERTY, type: 'float', value: params.accuracy },
      { property: SKILL_RATING_PROPERTY, type: 'float', value: params.skill },
      { property: EFFORT_RATING_PROPERTY, type: 'float', value: params.effort },
    );
  }

  const { ops } = createEntity({
    id,
    name: params.proposal.name,
    types: [BOUNTY_REVIEW_TYPE],
    values,
    relations: {
      [PROPOSALS_PROPERTY]: {
        toEntity: params.proposal.id,
      },
    },
  });

  return { id: Id(id), ops };
};

/**
 * Builds update-proposal-review ops.
 *
 * @example
 * ```ts
 * import { proposalReviews } from '@geoprotocol/geo-sdk/ops';
 *
 * const { ops } = proposalReviews.update({
 *   proposalReviewId: reviewId,
 *   pass: false,
 *   content: 'Needs more sources.',
 * });
 * ```
 *
 * @param params Review ID, pass/fail value, optional content, and optional rating values.
 * @returns Review entity ID and update ops.
 * @throws When the review ID is invalid.
 */
export const update = (params: UpdateProposalReviewParams): CreateResult => {
  assertValid(params.proposalReviewId, '`proposalReviewId` in `Ops.proposalReviews.update`');

  const values: PropertiesParam = [
    {
      property: PASS_PROPERTY,
      type: 'boolean',
      value: params.pass,
    },
  ];

  if (params.content) {
    values.push({
      property: MARKDOWN_CONTENT,
      type: 'text',
      value: params.content,
    });
  }

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
    values,
  });
};
