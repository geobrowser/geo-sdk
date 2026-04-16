import type { CreateEntity, CreateRelation } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import {
  ACCURACY_RATING_PROPERTY,
  BOUNTY_REVIEW_TYPE,
  COMPLETENESS_RATING_PROPERTY,
  EFFORT_RATING_PROPERTY,
  NAME_PROPERTY,
  PASS_PROPERTY,
  PROPOSALS_PROPERTY,
  SKILL_RATING_PROPERTY,
  TYPES_PROPERTY,
} from '../core/ids/system.js';
import { Id } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { createProposalReview } from './create-proposal-review.js';

const proposalId = Id('3af3e22d21694a078681516710b7ecf1');
const proposalName = 'Test Proposal';

describe('createProposalReview', () => {
  it('creates a review with pass only (low difficulty)', () => {
    const { id, ops } = createProposalReview({
      proposal: { id: proposalId, name: proposalName },
      pass: true,
    });

    expect(id).toBeDefined();
    expect(typeof id).toBe('string');

    // createEntity op
    const entityOp = ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.id).toEqual(toGrcId(id));

    // Name should match proposal name
    const nameValue = entityOp.values.find(v => v.property.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]));
    expect(nameValue).toBeDefined();
    expect(nameValue?.value.type).toBe('text');
    if (nameValue?.value.type === 'text') {
      expect(nameValue?.value.value).toBe(proposalName);
    }

    // Pass value
    const passValue = entityOp.values.find(v => v.property.every((b, i) => b === toGrcId(PASS_PROPERTY)[i]));
    expect(passValue).toBeDefined();
    expect(passValue?.value.type).toBe('boolean');
    if (passValue?.value.type === 'boolean') {
      expect(passValue?.value.value).toBe(true);
    }

    // Should NOT have rating values
    const completenessValue = entityOp.values.find(v =>
      v.property.every((b, i) => b === toGrcId(COMPLETENESS_RATING_PROPERTY)[i]),
    );
    expect(completenessValue).toBeUndefined();
    const accuracyValue = entityOp.values.find(v =>
      v.property.every((b, i) => b === toGrcId(ACCURACY_RATING_PROPERTY)[i]),
    );
    expect(accuracyValue).toBeUndefined();
    const skillValue = entityOp.values.find(v => v.property.every((b, i) => b === toGrcId(SKILL_RATING_PROPERTY)[i]));
    expect(skillValue).toBeUndefined();
    const effortValue = entityOp.values.find(v => v.property.every((b, i) => b === toGrcId(EFFORT_RATING_PROPERTY)[i]));
    expect(effortValue).toBeUndefined();

    // Type relation to BOUNTY_REVIEW_TYPE
    const typeRel = ops.find(
      op =>
        op.type === 'createRelation' &&
        (op as CreateRelation).relationType.every((b, i) => b === toGrcId(TYPES_PROPERTY)[i]),
    ) as CreateRelation;
    expect(typeRel).toBeDefined();
    expect(typeRel.from).toEqual(toGrcId(id));
    expect(typeRel.to).toEqual(toGrcId(BOUNTY_REVIEW_TYPE));

    // Proposals relation
    const proposalRel = ops.find(
      op =>
        op.type === 'createRelation' &&
        (op as CreateRelation).relationType.every((b, i) => b === toGrcId(PROPOSALS_PROPERTY)[i]),
    ) as CreateRelation;
    expect(proposalRel).toBeDefined();
    expect(proposalRel.from).toEqual(toGrcId(id));
    expect(proposalRel.to).toEqual(toGrcId(proposalId));
  });

  it('creates a review with pass false (low difficulty reject)', () => {
    const { ops } = createProposalReview({
      proposal: { id: proposalId, name: proposalName },
      pass: false,
    });

    const entityOp = ops[0] as CreateEntity;
    const passValue = entityOp.values.find(v => v.property.every((b, i) => b === toGrcId(PASS_PROPERTY)[i]));
    expect(passValue).toBeDefined();
    expect(passValue?.value.type).toBe('boolean');
    if (passValue?.value.type === 'boolean') {
      expect(passValue?.value.value).toBe(false);
    }
  });

  it('creates a review with all ratings (medium/hard difficulty)', () => {
    const { id, ops } = createProposalReview({
      proposal: { id: proposalId, name: proposalName },
      pass: false,
      completeness: 0.8,
      accuracy: 1,
      skill: 0.6,
      effort: 0.4,
    });

    expect(id).toBeDefined();

    const entityOp = ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    // Pass value
    const passValue = entityOp.values.find(v => v.property.every((b, i) => b === toGrcId(PASS_PROPERTY)[i]));
    expect(passValue).toBeDefined();
    expect(passValue?.value.type).toBe('boolean');
    if (passValue?.value.type === 'boolean') {
      expect(passValue?.value.value).toBe(false);
    }

    // Completeness
    const completenessValue = entityOp.values.find(v =>
      v.property.every((b, i) => b === toGrcId(COMPLETENESS_RATING_PROPERTY)[i]),
    );
    expect(completenessValue).toBeDefined();
    expect(completenessValue?.value.type).toBe('float');
    if (completenessValue?.value.type === 'float') {
      expect(completenessValue?.value.value).toBe(0.8);
    }

    // Accuracy
    const accuracyValue = entityOp.values.find(v =>
      v.property.every((b, i) => b === toGrcId(ACCURACY_RATING_PROPERTY)[i]),
    );
    expect(accuracyValue).toBeDefined();
    expect(accuracyValue?.value.type).toBe('float');
    if (accuracyValue?.value.type === 'float') {
      expect(accuracyValue?.value.value).toBe(1);
    }

    // Skill
    const skillValue = entityOp.values.find(v => v.property.every((b, i) => b === toGrcId(SKILL_RATING_PROPERTY)[i]));
    expect(skillValue).toBeDefined();
    expect(skillValue?.value.type).toBe('float');
    if (skillValue?.value.type === 'float') {
      expect(skillValue?.value.value).toBe(0.6);
    }

    // Effort
    const effortValue = entityOp.values.find(v => v.property.every((b, i) => b === toGrcId(EFFORT_RATING_PROPERTY)[i]));
    expect(effortValue).toBeDefined();
    expect(effortValue?.value.type).toBe('float');
    if (effortValue?.value.type === 'float') {
      expect(effortValue?.value.value).toBe(0.4);
    }

    // Verify emission order: entity, type relation, proposals relation
    expect(ops[0]?.type).toBe('createEntity');
    expect((ops[1] as CreateRelation).relationType).toEqual(toGrcId(TYPES_PROPERTY));
    expect((ops[2] as CreateRelation).relationType).toEqual(toGrcId(PROPOSALS_PROPERTY));
  });

  it('creates a review with zero ratings', () => {
    const { ops } = createProposalReview({
      proposal: { id: proposalId, name: proposalName },
      pass: true,
      completeness: 0,
      accuracy: 0,
      skill: 0,
      effort: 0,
    });

    const entityOp = ops[0] as CreateEntity;

    const completenessValue = entityOp.values.find(v =>
      v.property.every((b, i) => b === toGrcId(COMPLETENESS_RATING_PROPERTY)[i]),
    );
    expect(completenessValue).toBeDefined();
    if (completenessValue?.value.type === 'float') {
      expect(completenessValue?.value.value).toBe(0);
    }
  });

  it('throws for invalid proposal id', () => {
    expect(() =>
      createProposalReview({
        proposal: { id: 'invalid', name: proposalName },
        pass: true,
      }),
    ).toThrow('Invalid id: "invalid" for `proposal.id` in `createProposalReview`');
  });
});
