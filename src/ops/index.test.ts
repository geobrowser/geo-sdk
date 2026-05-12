import { describe, expect, it } from 'vitest';
import { DESCRIPTION_PROPERTY, MARKDOWN_CONTENT, NAME_PROPERTY } from '../core/ids/system.js';
import { createEntity } from '../graph/create-entity.js';
import { createProperty } from '../graph/create-property.js';
import { createRelation } from '../graph/create-relation.js';
import { createType } from '../graph/create-type.js';
import { deleteRelation } from '../graph/delete-relation.js';
import { updateComment } from '../graph/update-comment.js';
import { updateEntity } from '../graph/update-entity.js';
import { updateRelation } from '../graph/update-relation.js';
import { generate } from '../id-utils.js';
import * as Ops from './index.js';

describe('Ops', () => {
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

  it('creates image ops without uploading', () => {
    const result = Ops.images.create({
      id: generate(),
      cid: 'ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5',
      dimensions: { width: 100, height: 50 },
    });

    expect(result.cid).toBe('ipfs://QmP6aJhM3SgoRSPUccBQK9VMHNqqezixG1Qvjy2xPWvPh5');
    expect(result.ops.length).toBeGreaterThan(0);
  });

  it('creates and updates comment ops without fetching', () => {
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
});
