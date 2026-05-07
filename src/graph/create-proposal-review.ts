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
import type { CreateProposalReviewParams, CreateResult, PropertiesParam } from '../types.js';
import { createEntity } from './create-entity.js';

/**
 * Creates a proposal review entity with a pass/fail status and optional star ratings.
 * For low-difficulty bounties, only `pass` is required. For medium/hard bounties,
 * `completeness`, `accuracy`, `skill`, and `effort` ratings must also be provided.
 *
 * @example
 * ```ts
 * import { Graph } from '@geoprotocol/geo-sdk';
 *
 * // Low-difficulty bounty review (pass + optional content)
 * const { id, ops } = Graph.createProposalReview({
 *   proposal: { id: proposalId, name: 'Proposal name' },
 *   pass: true,
 *   content: 'Review notes', // optional, plain text or markdown
 * });
 *
 * // Medium/hard bounty review (with ratings + optional content)
 * const { id, ops } = Graph.createProposalReview({
 *   proposal: { id: proposalId, name: 'Proposal name' },
 *   pass: true,
 *   content: 'Review notes', // optional, plain text or markdown
 *   completeness: 0.8,
 *   accuracy: 1,
 *   skill: 0.6,
 *   effort: 0.8,
 * });
 * ```
 *
 * @param params – {@link CreateProposalReviewParams}
 * @returns – {@link CreateResult}
 */
export const createProposalReview = (params: CreateProposalReviewParams): CreateResult => {
  if (params.id) assertValid(params.id, '`id` in `createProposalReview`');
  assertValid(params.proposal.id, '`proposal.id` in `createProposalReview`');

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
