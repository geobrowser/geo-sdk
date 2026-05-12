import type { CreateRelation, Op } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import { DESCRIPTION_PROPERTY, MARKDOWN_CONTENT, NAME_PROPERTY, REPLY_TO_PROPERTY } from '../core/ids/system.js';
import { createEntity } from '../graph/create-entity.js';
import { createProperty } from '../graph/create-property.js';
import { createProposalReview } from '../graph/create-proposal-review.js';
import { createRelation } from '../graph/create-relation.js';
import { createType } from '../graph/create-type.js';
import { deleteRelation } from '../graph/delete-relation.js';
import { updateComment } from '../graph/update-comment.js';
import { updateEntity } from '../graph/update-entity.js';
import { updateProposalReview } from '../graph/update-proposal-review.js';
import { updateRelation } from '../graph/update-relation.js';
import { generate, toGrcId } from '../id-utils.js';
import * as Ops from './index.js';

describe('Ops', () => {
  const normalizeGeneratedRelationIds = (ops: Op[]) =>
    ops.map(op => (op.type === 'createRelation' ? { ...op, entity: 'generated', id: 'generated' } : op));

  it('matches Graph entity builders', () => {
    const id = generate();
    const property = generate();
    const params = {
      id,
      name: 'Test entity',
      values: [{ property, type: 'text' as const, value: 'hello' }],
    };

    expect(Ops.entities.create(params)).toEqual(createEntity(params));
    expect(Ops.entities.update({ id, name: 'Updated' })).toEqual(updateEntity({ id, name: 'Updated' }));
    expect('delete' in Ops.entities).toBe(false);
  });

  it('matches Graph schema and relation builders', () => {
    const entityA = generate();
    const entityB = generate();
    const relationId = generate();

    const typeId = generate();
    expect(Ops.types.create({ id: typeId, name: 'Type', properties: [NAME_PROPERTY] }).id).toEqual(
      createType({ id: typeId, name: 'Type', properties: [NAME_PROPERTY] }).id,
    );

    const propertyParams = { id: generate(), name: 'Website', dataType: 'TEXT' as const };
    expect(Ops.properties.create(propertyParams).id).toEqual(createProperty(propertyParams).id);

    const createRelationParams = {
      id: relationId,
      fromEntity: entityA,
      toEntity: entityB,
      type: DESCRIPTION_PROPERTY,
    };
    expect(Ops.relations.create(createRelationParams).id).toEqual(createRelation(createRelationParams).id);
    expect(Ops.relations.create(createRelationParams).ops.length).toBe(createRelation(createRelationParams).ops.length);
    expect(Ops.relations.update({ id: relationId, position: 'abc' })).toEqual(
      updateRelation({ id: relationId, position: 'abc' }),
    );
    expect(Ops.relations.delete({ id: relationId })).toEqual(deleteRelation({ id: relationId }));
  });

  it('creates and updates comment ops', () => {
    const id = generate();
    const root = generate();
    const space = generate();

    const result = Ops.comments.create({
      id,
      content: 'Hello',
      replyTo: { entityId: root, spaceId: space },
    });

    expect(result.id).toBe(id);
    expect(result.ops.length).toBeGreaterThan(0);
    expect(Ops.comments.update({ id, content: 'Updated' })).toEqual(updateComment({ id, content: 'Updated' }));
    expect(Ops.comments.update({ id, content: 'Updated' }).ops[0]).toMatchObject({ type: 'updateEntity' });
    expect(MARKDOWN_CONTENT).toBeTruthy();
  });

  it('creates comment reply chains from supplied context', () => {
    const id = generate();
    const parent = generate();
    const commentA = generate();
    const root = generate();
    const space = generate();
    const rootSpace = generate();

    const result = Ops.comments.create({
      id,
      content: 'Deep reply',
      replyTo: { entityId: parent, spaceId: space },
      replyToRelations: [
        { entityId: root, spaceId: rootSpace, position: 'a1' },
        { entityId: commentA, spaceId: space, position: 'a0' },
      ],
    });
    const replyRels = result.ops.filter(
      (op): op is CreateRelation =>
        op.type === 'createRelation' &&
        (op as CreateRelation).relationType.every((byte, index) => byte === toGrcId(REPLY_TO_PROPERTY)[index]),
    );

    expect(replyRels).toHaveLength(3);
    expect(replyRels[0]?.to).toEqual(toGrcId(parent));
    expect(replyRels[1]?.to).toEqual(toGrcId(commentA));
    expect(replyRels[2]?.to).toEqual(toGrcId(root));
    expect(replyRels[0]?.position?.localeCompare(replyRels[1]?.position ?? '')).toBeLessThan(0);
    expect(replyRels[1]?.position?.localeCompare(replyRels[2]?.position ?? '')).toBeLessThan(0);
  });

  it('matches Graph proposal review builders', () => {
    const createParams = {
      id: generate(),
      proposal: { id: generate(), name: 'Test proposal' },
      pass: false,
      content: 'Detailed notes',
      completeness: 0.8 as const,
      accuracy: 1 as const,
      skill: 0.6 as const,
      effort: 0.4 as const,
    };
    const updateParams = {
      proposalReviewId: createParams.id,
      pass: true,
      content: 'Updated notes',
      completeness: 1 as const,
      accuracy: 0.8 as const,
      skill: 0.6 as const,
      effort: 0.4 as const,
    };

    const createdWithOps = Ops.proposalReviews.create(createParams);
    const createdWithGraph = createProposalReview(createParams);

    expect(createdWithOps.id).toBe(createdWithGraph.id);
    expect(normalizeGeneratedRelationIds(createdWithOps.ops)).toEqual(
      normalizeGeneratedRelationIds(createdWithGraph.ops),
    );
    expect(Ops.proposalReviews.update(updateParams)).toEqual(updateProposalReview(updateParams));
  });
});
