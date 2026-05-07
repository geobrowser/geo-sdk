import type { UpdateEntity } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import {
  ACCURACY_RATING_PROPERTY,
  COMPLETENESS_RATING_PROPERTY,
  EFFORT_RATING_PROPERTY,
  MARKDOWN_CONTENT,
  NAME_PROPERTY,
  PASS_PROPERTY,
  SKILL_RATING_PROPERTY,
} from '../core/ids/system.js';
import { Id } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { updateProposalReview } from './update-proposal-review.js';

const reviewId = Id('3af3e22d21694a078681516710b7ecf1');

describe('updateProposalReview', () => {
  it('updates pass only (low difficulty)', () => {
    const { id, ops } = updateProposalReview({
      proposalReviewId: reviewId,
      pass: false,
    });

    expect(id).toBe(reviewId);
    expect(ops).toHaveLength(1);

    const op = ops[0] as UpdateEntity;
    expect(op.type).toBe('updateEntity');
    expect(op.id).toEqual(toGrcId(reviewId));

    // Pass value
    const passValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(PASS_PROPERTY)[i]));
    expect(passValue).toBeDefined();
    expect(passValue?.value.type).toBe('boolean');
    if (passValue?.value.type === 'boolean') {
      expect(passValue?.value.value).toBe(false);
    }

    // Should not have rating values
    const completenessValue = op.set.find(v =>
      v.property.every((b, i) => b === toGrcId(COMPLETENESS_RATING_PROPERTY)[i]),
    );
    expect(completenessValue).toBeUndefined();
    const accuracyValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(ACCURACY_RATING_PROPERTY)[i]));
    expect(accuracyValue).toBeUndefined();
    const skillValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(SKILL_RATING_PROPERTY)[i]));
    expect(skillValue).toBeUndefined();
    const effortValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(EFFORT_RATING_PROPERTY)[i]));
    expect(effortValue).toBeUndefined();

    // Should not have name
    const nameValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]));
    expect(nameValue).toBeUndefined();
  });

  it('updates pass with all ratings (medium/hard difficulty)', () => {
    const { id, ops } = updateProposalReview({
      proposalReviewId: reviewId,
      pass: true,
      completeness: 0.8,
      accuracy: 1,
      skill: 0.6,
      effort: 0.4,
    });

    expect(id).toBe(reviewId);
    expect(ops).toHaveLength(1);

    const op = ops[0] as UpdateEntity;
    expect(op.type).toBe('updateEntity');
    expect(op.id).toEqual(toGrcId(reviewId));

    // Pass
    const passValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(PASS_PROPERTY)[i]));
    expect(passValue).toBeDefined();
    expect(passValue?.value.type).toBe('boolean');
    if (passValue?.value.type === 'boolean') {
      expect(passValue?.value.value).toBe(true);
    }

    // Completeness
    const completenessValue = op.set.find(v =>
      v.property.every((b, i) => b === toGrcId(COMPLETENESS_RATING_PROPERTY)[i]),
    );
    expect(completenessValue).toBeDefined();
    expect(completenessValue?.value.type).toBe('float');
    if (completenessValue?.value.type === 'float') {
      expect(completenessValue?.value.value).toBe(0.8);
    }

    // Accuracy
    const accuracyValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(ACCURACY_RATING_PROPERTY)[i]));
    expect(accuracyValue).toBeDefined();
    expect(accuracyValue?.value.type).toBe('float');
    if (accuracyValue?.value.type === 'float') {
      expect(accuracyValue?.value.value).toBe(1);
    }

    // Skill
    const skillValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(SKILL_RATING_PROPERTY)[i]));
    expect(skillValue).toBeDefined();
    expect(skillValue?.value.type).toBe('float');
    if (skillValue?.value.type === 'float') {
      expect(skillValue?.value.value).toBe(0.6);
    }

    // Effort
    const effortValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(EFFORT_RATING_PROPERTY)[i]));
    expect(effortValue).toBeDefined();
    expect(effortValue?.value.type).toBe('float');
    if (effortValue?.value.type === 'float') {
      expect(effortValue?.value.value).toBe(0.4);
    }
  });

  it('includes content value when content is provided', () => {
    const { ops } = updateProposalReview({
      proposalReviewId: reviewId,
      pass: true,
      content: 'Updated notes',
    });

    const op = ops[0] as UpdateEntity;
    const contentValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]));
    expect(contentValue).toBeDefined();
    expect(contentValue?.value.type).toBe('text');
    if (contentValue?.value.type === 'text') {
      expect(contentValue?.value.value).toBe('Updated notes');
    }
  });

  it('does not include content value when content is omitted', () => {
    const { ops } = updateProposalReview({
      proposalReviewId: reviewId,
      pass: true,
    });

    const op = ops[0] as UpdateEntity;
    const contentValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]));
    expect(contentValue).toBeUndefined();
  });

  it('does not include content value when content is an empty string', () => {
    const { ops } = updateProposalReview({
      proposalReviewId: reviewId,
      pass: true,
      content: '',
    });

    const op = ops[0] as UpdateEntity;
    const contentValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]));
    expect(contentValue).toBeUndefined();
  });

  it('includes content value alongside ratings', () => {
    const { ops } = updateProposalReview({
      proposalReviewId: reviewId,
      pass: false,
      content: 'Notes with ratings',
      completeness: 0.8,
      accuracy: 1,
      skill: 0.6,
      effort: 0.4,
    });

    const op = ops[0] as UpdateEntity;
    const contentValue = op.set.find(v => v.property.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]));
    expect(contentValue).toBeDefined();
    if (contentValue?.value.type === 'text') {
      expect(contentValue?.value.value).toBe('Notes with ratings');
    }
  });

  it('throws for invalid proposalReviewId', () => {
    expect(() =>
      updateProposalReview({
        proposalReviewId: 'invalid',
        pass: true,
      }),
    ).toThrow('Invalid id: "invalid" for `proposalReviewId` in `updateProposalReview`');
  });
});
