import type { CreateEntity, CreateRelation } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import { JOB_TYPE, ROLES_PROPERTY } from '../core/ids/content.js';
import {
  BOOLEAN,
  BYTES,
  DATA_TYPE,
  DATE,
  DATETIME,
  DECIMAL,
  EMBEDDING,
  FLOAT,
  INTEGER,
  NAME_PROPERTY,
  POINT,
  PROPERTY,
  RELATION,
  RELATION_VALUE_RELATIONSHIP_TYPE,
  SCHEDULE,
  TEXT,
  TIME,
  TYPES_PROPERTY,
} from '../core/ids/system.js';
import { Id } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { createProperty } from './create-property.js';

describe('createProperty', () => {
  it('creates a TEXT property', async () => {
    const property = createProperty({
      name: 'Disclaimer',
      description: 'This is a disclaimer',
      dataType: 'TEXT',
    });
    expect(property).toBeDefined();
    expect(typeof property.id).toBe('string');
    expect(property.ops).toBeDefined();
    // 1 createEntity + 1 createRelation (type) + 1 createRelation (data type)
    expect(property.ops.length).toBe(3);

    // Check entity creation
    const entityOp = property.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.id).toEqual(toGrcId(property.id));

    // Verify name value
    const nameValue = entityOp.values.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
    });
    expect(nameValue).toBeDefined();
    expect(nameValue?.value.type).toBe('text');
    if (nameValue?.value.type === 'text') {
      expect(nameValue.value.value).toBe('Disclaimer');
    }

    // Check type relation to PROPERTY
    const typeRelOp = property.ops[1] as CreateRelation;
    expect(typeRelOp.type).toBe('createRelation');
    expect(typeRelOp.from).toEqual(toGrcId(property.id));
    expect(typeRelOp.to).toEqual(toGrcId(PROPERTY));
    expect(typeRelOp.relationType).toEqual(toGrcId(TYPES_PROPERTY));

    // Check data type relation to TEXT
    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(TEXT));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates a FLOAT property', async () => {
    const property = createProperty({
      name: 'Price',
      description: 'The price of the product',
      dataType: 'FLOAT',
    });

    expect(property).toBeDefined();
    expect(typeof property.id).toBe('string');
    expect(property.ops).toBeDefined();
    // 1 createEntity + 1 createRelation (type) + 1 createRelation (data type)
    expect(property.ops.length).toBe(3);

    // Check entity creation
    const entityOp = property.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.id).toEqual(toGrcId(property.id));

    // Check type relation to PROPERTY
    const typeRelOp = property.ops[1] as CreateRelation;
    expect(typeRelOp.type).toBe('createRelation');
    expect(typeRelOp.from).toEqual(toGrcId(property.id));
    expect(typeRelOp.to).toEqual(toGrcId(PROPERTY));
    expect(typeRelOp.relationType).toEqual(toGrcId(TYPES_PROPERTY));

    // Check data type relation to FLOAT
    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(FLOAT));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates a RELATION property', async () => {
    const property = createProperty({
      name: 'City',
      dataType: 'RELATION',
    });

    expect(property).toBeDefined();
    expect(typeof property.id).toBe('string');
    expect(property.ops).toBeDefined();
    // 1 createEntity + 1 createRelation (type) + 1 createRelation (data type)
    expect(property.ops.length).toBe(3);

    // Check entity creation
    const entityOp = property.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.id).toEqual(toGrcId(property.id));

    // Check type relation to PROPERTY
    const typeRelOp = property.ops[1] as CreateRelation;
    expect(typeRelOp.type).toBe('createRelation');
    expect(typeRelOp.from).toEqual(toGrcId(property.id));
    expect(typeRelOp.to).toEqual(toGrcId(PROPERTY));
    expect(typeRelOp.relationType).toEqual(toGrcId(TYPES_PROPERTY));

    // Check data type relation to RELATION
    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(RELATION));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates a RELATION property with properties and relation value types', async () => {
    const property = createProperty({
      name: 'City',
      dataType: 'RELATION',
      properties: [ROLES_PROPERTY],
      relationValueTypes: [JOB_TYPE],
    });

    expect(property).toBeDefined();
    expect(typeof property.id).toBe('string');
    expect(property.ops).toBeDefined();
    // 1 createEntity + 1 createRelation (type) + 1 createRelation (data type) + 1 createRelation (property) + 1 createRelation (value type)
    expect(property.ops.length).toBe(5);

    // Check entity creation
    const entityOp = property.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.id).toEqual(toGrcId(property.id));

    // Check type relation to PROPERTY
    const typeRelOp = property.ops[1] as CreateRelation;
    expect(typeRelOp.type).toBe('createRelation');
    expect(typeRelOp.from).toEqual(toGrcId(property.id));
    expect(typeRelOp.to).toEqual(toGrcId(PROPERTY));
    expect(typeRelOp.relationType).toEqual(toGrcId(TYPES_PROPERTY));

    // Check data type relation to RELATION
    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(RELATION));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));

    // Check property relation (ROLES_PROPERTY)
    const propRelOp = property.ops[3] as CreateRelation;
    expect(propRelOp.type).toBe('createRelation');
    expect(propRelOp.from).toEqual(toGrcId(property.id));
    expect(propRelOp.to).toEqual(toGrcId(ROLES_PROPERTY));
    expect(propRelOp.relationType).toEqual(toGrcId(PROPERTY));

    // Check relation value type relation (JOB_TYPE)
    const valueTypeRelOp = property.ops[4] as CreateRelation;
    expect(valueTypeRelOp.type).toBe('createRelation');
    expect(valueTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(valueTypeRelOp.to).toEqual(toGrcId(JOB_TYPE));
    expect(valueTypeRelOp.relationType).toEqual(toGrcId(RELATION_VALUE_RELATIONSHIP_TYPE));
  });

  it('creates a property with a provided id', async () => {
    const providedId = Id('b1dc6e5c63e143bab3d4755b251a4ea1');
    const property = createProperty({
      id: providedId,
      name: 'Price',
      dataType: 'FLOAT',
    });

    expect(property).toBeDefined();
    expect(property.id).toBe('b1dc6e5c63e143bab3d4755b251a4ea1');

    // Verify the entity op uses the provided ID
    const entityOp = property.ops[0] as CreateEntity;
    expect(entityOp.id).toEqual(toGrcId(providedId));

    // Verify the type relation uses the provided ID
    const typeRelOp = property.ops[1] as CreateRelation;
    expect(typeRelOp.from).toEqual(toGrcId(providedId));
  });

  it('throws an error if the provided id is invalid', async () => {
    // @ts-expect-error - invalid id type
    expect(() => createProperty({ id: 'invalid' })).toThrow('Invalid id: "invalid" for `id` in `createProperty`');
  });

  it('throws an error if a property id in properties is invalid', async () => {
    expect(() =>
      createProperty({
        name: 'City',
        dataType: 'RELATION',
        properties: ['invalid-prop'],
      }),
    ).toThrow('Invalid id: "invalid-prop" for `properties` in `createProperty`');
  });

  it('throws an error if a relation value type id is invalid', async () => {
    expect(() =>
      createProperty({
        name: 'City',
        dataType: 'RELATION',
        relationValueTypes: ['invalid-type'],
      }),
    ).toThrow('Invalid id: "invalid-type" for `relationValueTypes` in `createProperty`');
  });

  it('creates a BOOLEAN property', async () => {
    const property = createProperty({
      name: 'Is Active',
      dataType: 'BOOLEAN',
    });

    expect(property).toBeDefined();
    // 1 createEntity + 1 createRelation (type) + 1 createRelation (data type)
    expect(property.ops.length).toBe(3);

    const entityOp = property.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const typeRelOp = property.ops[1] as CreateRelation;
    expect(typeRelOp.type).toBe('createRelation');
    expect(typeRelOp.to).toEqual(toGrcId(PROPERTY));

    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(BOOLEAN));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates an INTEGER property', async () => {
    const property = createProperty({
      name: 'Count',
      dataType: 'INTEGER',
    });

    expect(property).toBeDefined();
    expect(property.ops.length).toBe(3);

    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(INTEGER));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates a DECIMAL property', async () => {
    const property = createProperty({
      name: 'Amount',
      dataType: 'DECIMAL',
    });

    expect(property).toBeDefined();
    expect(property.ops.length).toBe(3);

    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(DECIMAL));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates a BYTES property', async () => {
    const property = createProperty({
      name: 'Payload',
      dataType: 'BYTES',
    });

    expect(property).toBeDefined();
    expect(property.ops.length).toBe(3);

    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(BYTES));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates a DATE property', async () => {
    const property = createProperty({
      name: 'Date founded',
      dataType: 'DATE',
    });

    expect(property).toBeDefined();
    expect(property.ops.length).toBe(3);

    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(DATE));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates a TIME property', async () => {
    const property = createProperty({
      name: 'Opening Time',
      dataType: 'TIME',
    });

    expect(property).toBeDefined();
    // 1 createEntity + 1 createRelation (type) + 1 createRelation (data type)
    expect(property.ops.length).toBe(3);

    const typeRelOp = property.ops[1] as CreateRelation;
    expect(typeRelOp.type).toBe('createRelation');
    expect(typeRelOp.to).toEqual(toGrcId(PROPERTY));

    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(TIME));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates a DATETIME property', async () => {
    const property = createProperty({
      name: 'Created at',
      dataType: 'DATETIME',
    });

    expect(property).toBeDefined();
    expect(property.ops.length).toBe(3);

    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(DATETIME));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates a SCHEDULE property', async () => {
    const property = createProperty({
      name: 'Opening hours',
      dataType: 'SCHEDULE',
    });

    expect(property).toBeDefined();
    expect(property.ops.length).toBe(3);

    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(SCHEDULE));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates a POINT property', async () => {
    const property = createProperty({
      name: 'Location',
      dataType: 'POINT',
    });

    expect(property).toBeDefined();
    // 1 createEntity + 1 createRelation (type) + 1 createRelation (data type)
    expect(property.ops.length).toBe(3);

    const typeRelOp = property.ops[1] as CreateRelation;
    expect(typeRelOp.type).toBe('createRelation');
    expect(typeRelOp.to).toEqual(toGrcId(PROPERTY));

    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(POINT));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });

  it('creates an EMBEDDING property', async () => {
    const property = createProperty({
      name: 'Vector',
      dataType: 'EMBEDDING',
    });

    expect(property).toBeDefined();
    expect(property.ops.length).toBe(3);

    const dataTypeRelOp = property.ops[2] as CreateRelation;
    expect(dataTypeRelOp.type).toBe('createRelation');
    expect(dataTypeRelOp.from).toEqual(toGrcId(property.id));
    expect(dataTypeRelOp.to).toEqual(toGrcId(EMBEDDING));
    expect(dataTypeRelOp.relationType).toEqual(toGrcId(DATA_TYPE));
  });
});
