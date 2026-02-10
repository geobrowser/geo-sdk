import { type CreateEntity, type CreateRelation, EmbeddingSubType } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import { CLAIM_TYPE, NEWS_STORY_TYPE } from '../core/ids/content.js';
import { COVER_PROPERTY, DESCRIPTION_PROPERTY, NAME_PROPERTY, TYPES_PROPERTY } from '../core/ids/system.js';
import { Id } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { createEntity } from './create-entity.js';

describe('createEntity', () => {
  const coverId = Id('30145d36d5a54244be593d111d879ba5');

  it('creates a basic entity without properties', () => {
    const entity = createEntity({});
    expect(entity).toBeDefined();
    expect(typeof entity.id).toBe('string');
    expect(entity.ops).toBeDefined();
    expect(entity.ops).toHaveLength(1); // One createEntity op
    expect(entity.ops[0]?.type).toBe('createEntity');

    // Verify the entity op structure
    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.id).toEqual(toGrcId(entity.id));
    expect(entityOp.values).toEqual([]);
  });

  it('creates an entity with types', () => {
    const entity = createEntity({
      types: [CLAIM_TYPE, NEWS_STORY_TYPE],
    });

    expect(entity).toBeDefined();
    expect(typeof entity.id).toBe('string');
    expect(entity.ops).toHaveLength(3); // One createEntity + two createRelation ops

    // Check createEntity op
    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.id).toEqual(toGrcId(entity.id));
    expect(entityOp.values).toEqual([]);

    // Check first type relation
    const typeRel1 = entity.ops[1] as CreateRelation;
    expect(typeRel1.type).toBe('createRelation');
    expect(typeRel1.from).toEqual(toGrcId(entity.id));
    expect(typeRel1.to).toEqual(toGrcId(CLAIM_TYPE));
    expect(typeRel1.relationType).toEqual(toGrcId(TYPES_PROPERTY));

    // Check second type relation
    const typeRel2 = entity.ops[2] as CreateRelation;
    expect(typeRel2.type).toBe('createRelation');
    expect(typeRel2.from).toEqual(toGrcId(entity.id));
    expect(typeRel2.to).toEqual(toGrcId(NEWS_STORY_TYPE));
    expect(typeRel2.relationType).toEqual(toGrcId(TYPES_PROPERTY));
  });

  it('creates an entity with name and description', () => {
    const entity = createEntity({
      name: 'Test Entity',
      description: 'Test Description',
    });

    expect(entity).toBeDefined();
    expect(typeof entity.id).toBe('string');
    expect(entity.ops).toHaveLength(1);

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.id).toEqual(toGrcId(entity.id));

    // Verify name property
    const nameValue = entityOp.values.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
    });
    expect(nameValue).toBeDefined();
    expect(nameValue?.value.type).toBe('text');
    if (nameValue?.value.type === 'text') {
      expect(nameValue.value.value).toBe('Test Entity');
    }

    // Verify description property
    const descValue = entityOp.values.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(DESCRIPTION_PROPERTY)[i]);
    });
    expect(descValue).toBeDefined();
    expect(descValue?.value.type).toBe('text');
    if (descValue?.value.type === 'text') {
      expect(descValue.value.value).toBe('Test Description');
    }
  });

  it('creates an entity with cover', () => {
    const entity = createEntity({
      cover: coverId,
    });

    expect(entity).toBeDefined();
    expect(typeof entity.id).toBe('string');
    expect(entity.ops).toHaveLength(2);

    // Check createEntity op
    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.id).toEqual(toGrcId(entity.id));

    // Check cover relation
    const coverRel = entity.ops[1] as CreateRelation;
    expect(coverRel.type).toBe('createRelation');
    expect(coverRel.from).toEqual(toGrcId(entity.id));
    expect(coverRel.to).toEqual(toGrcId(coverId));
    expect(coverRel.relationType).toEqual(toGrcId(COVER_PROPERTY));
  });

  it('creates an entity with custom text values', () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const entity = createEntity({
      values: [{ property: customPropertyId, type: 'text', value: 'custom value' }],
    });

    expect(entity).toBeDefined();
    expect(typeof entity.id).toBe('string');
    expect(entity.ops).toHaveLength(1);

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.values).toHaveLength(1);

    const customValue = entityOp.values[0];
    expect(customValue?.property).toEqual(toGrcId(customPropertyId));
    expect(customValue?.value.type).toBe('text');
    if (customValue?.value.type === 'text') {
      expect(customValue.value.value).toBe('custom value');
    }
  });

  it('creates an entity with a text value with language', () => {
    const languageId = Id('0a4e9810f78f429ea4ceb1904a43251d');
    const entity = createEntity({
      values: [
        {
          property: '295c8bc61ae342cbb2a65b61080906ff',
          type: 'text',
          value: 'test',
          language: languageId,
        },
      ],
    });

    expect(entity).toBeDefined();
    expect(typeof entity.id).toBe('string');
    expect(entity.ops).toHaveLength(1);

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.values).toHaveLength(1);

    const textValue = entityOp.values[0];
    expect(textValue?.value.type).toBe('text');
    if (textValue?.value.type === 'text') {
      expect(textValue.value.value).toBe('test');
      expect(textValue.value.language).toEqual(toGrcId(languageId));
    }
  });

  it('creates an entity with a text value in two different languages', () => {
    const englishLangId = Id('0a4e9810f78f429ea4ceb1904a43251d');
    const spanishLangId = Id('dad6e52a5e944e559411cfe3a3c3ea64');
    const entity = createEntity({
      values: [
        {
          property: '295c8bc61ae342cbb2a65b61080906ff',
          type: 'text',
          value: 'test',
          language: englishLangId,
        },
        {
          property: '295c8bc61ae342cbb2a65b61080906ff',
          type: 'text',
          value: 'prueba',
          language: spanishLangId,
        },
      ],
    });

    expect(entity).toBeDefined();
    expect(typeof entity.id).toBe('string');
    expect(entity.ops).toHaveLength(1);

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.values).toHaveLength(2);

    // Find English value
    const englishValue = entityOp.values.find(v => {
      if (v.value.type === 'text' && v.value.language) {
        return v.value.language.every((b, i) => b === toGrcId(englishLangId)[i]);
      }
      return false;
    });
    expect(englishValue?.value.type).toBe('text');
    if (englishValue?.value.type === 'text') {
      expect(englishValue.value.value).toBe('test');
    }

    // Find Spanish value
    const spanishValue = entityOp.values.find(v => {
      if (v.value.type === 'text' && v.value.language) {
        return v.value.language.every((b, i) => b === toGrcId(spanishLangId)[i]);
      }
      return false;
    });
    expect(spanishValue?.value.type).toBe('text');
    if (spanishValue?.value.type === 'text') {
      expect(spanishValue.value.value).toBe('prueba');
    }
  });

  it('creates an entity with a float value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'float',
          value: 42,
        },
      ],
    });

    expect(entity).toBeDefined();
    expect(typeof entity.id).toBe('string');
    expect(entity.ops).toHaveLength(1);

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.values).toHaveLength(1);

    const floatValue = entityOp.values[0];
    expect(floatValue?.property).toEqual(toGrcId(propertyId));
    expect(floatValue?.value.type).toBe('float');
    if (floatValue?.value.type === 'float') {
      expect(floatValue.value.value).toBe(42);
    }
  });

  it('creates an entity with a float value with unit', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const unitId = Id('016c9b1cd8a84e4d9e844e40878bb235');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'float',
          value: 42,
          unit: unitId,
        },
      ],
    });

    expect(entity).toBeDefined();
    expect(typeof entity.id).toBe('string');
    expect(entity.ops).toHaveLength(1);

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.values).toHaveLength(1);

    const floatValue = entityOp.values[0];
    expect(floatValue?.property).toEqual(toGrcId(propertyId));
    expect(floatValue?.value.type).toBe('float');
    if (floatValue?.value.type === 'float') {
      expect(floatValue.value.value).toBe(42);
      expect(floatValue.value.unit).toEqual(toGrcId(unitId));
    }
  });

  it('creates an entity with a boolean value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'boolean',
          value: true,
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.values).toHaveLength(1);

    const boolValue = entityOp.values[0];
    expect(boolValue?.property).toEqual(toGrcId(propertyId));
    expect(boolValue?.value.type).toBe('boolean');
    if (boolValue?.value.type === 'boolean') {
      expect(boolValue.value.value).toBe(true);
    }
  });

  it('creates an entity with a point value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'point',
          lon: -122.4194,
          lat: 37.7749,
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.values).toHaveLength(1);

    const pointValue = entityOp.values[0];
    expect(pointValue?.property).toEqual(toGrcId(propertyId));
    expect(pointValue?.value.type).toBe('point');
    if (pointValue?.value.type === 'point') {
      expect(pointValue.value.lon).toBe(-122.4194);
      expect(pointValue.value.lat).toBe(37.7749);
    }
  });

  it('creates an entity with a point value with altitude', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'point',
          lon: -122.4194,
          lat: 37.7749,
          alt: 100.5,
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const pointValue = entityOp.values[0];
    expect(pointValue?.value.type).toBe('point');
    if (pointValue?.value.type === 'point') {
      expect(pointValue.value.lon).toBe(-122.4194);
      expect(pointValue.value.lat).toBe(37.7749);
      expect(pointValue.value.alt).toBe(100.5);
    }
  });

  it('creates an entity with a date value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'date',
          value: '2024-03-20',
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.values).toHaveLength(1);

    const dateValue = entityOp.values[0];
    expect(dateValue?.property).toEqual(toGrcId(propertyId));
    expect(dateValue?.value.type).toBe('date');
    if (dateValue?.value.type === 'date') {
      expect(dateValue.value.value).toBe('2024-03-20');
    }
  });

  it('creates an entity with a time value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'time',
          value: '14:30:00Z',
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const timeValue = entityOp.values[0];
    expect(timeValue?.property).toEqual(toGrcId(propertyId));
    expect(timeValue?.value.type).toBe('time');
    if (timeValue?.value.type === 'time') {
      expect(timeValue.value.value).toBe('14:30:00Z');
    }
  });

  it('creates an entity with a datetime value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'datetime',
          value: '2024-03-20T14:30:00Z',
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const datetimeValue = entityOp.values[0];
    expect(datetimeValue?.property).toEqual(toGrcId(propertyId));
    expect(datetimeValue?.value.type).toBe('datetime');
    if (datetimeValue?.value.type === 'datetime') {
      expect(datetimeValue.value.value).toBe('2024-03-20T14:30:00Z');
    }
  });

  it('creates an entity with a schedule value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'schedule',
          value: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const scheduleValue = entityOp.values[0];
    expect(scheduleValue?.property).toEqual(toGrcId(propertyId));
    expect(scheduleValue?.value.type).toBe('schedule');
    if (scheduleValue?.value.type === 'schedule') {
      expect(scheduleValue.value.value).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    }
  });

  it('creates an entity with an integer value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'integer',
          value: 9007199254740993n,
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.values).toHaveLength(1);

    const int64Value = entityOp.values[0];
    expect(int64Value?.property).toEqual(toGrcId(propertyId));
    expect(int64Value?.value.type).toBe('integer');
    if (int64Value?.value.type === 'integer') {
      expect(int64Value.value.value).toBe(9007199254740993n);
    }
  });

  it('creates an entity with an integer value with unit', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const unitId = Id('016c9b1cd8a84e4d9e844e40878bb235');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'integer',
          value: 42n,
          unit: unitId,
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const int64Value = entityOp.values[0];
    expect(int64Value?.value.type).toBe('integer');
    if (int64Value?.value.type === 'integer') {
      expect(int64Value.value.value).toBe(42n);
      expect(int64Value.value.unit).toEqual(toGrcId(unitId));
    }
  });

  it('creates an entity with a decimal value (i64 mantissa)', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'decimal',
          exponent: -2,
          mantissa: { type: 'i64', value: 12345n },
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const decimalValue = entityOp.values[0];
    expect(decimalValue?.property).toEqual(toGrcId(propertyId));
    expect(decimalValue?.value.type).toBe('decimal');
    if (decimalValue?.value.type === 'decimal') {
      expect(decimalValue.value.exponent).toBe(-2);
      expect(decimalValue.value.mantissa).toEqual({ type: 'i64', value: 12345n });
    }
  });

  it('creates an entity with a decimal value (big mantissa)', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const bigBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'decimal',
          exponent: 5,
          mantissa: { type: 'big', bytes: bigBytes },
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const decimalValue = entityOp.values[0];
    expect(decimalValue?.value.type).toBe('decimal');
    if (decimalValue?.value.type === 'decimal') {
      expect(decimalValue.value.exponent).toBe(5);
      expect(decimalValue.value.mantissa).toEqual({ type: 'big', bytes: bigBytes });
    }
  });

  it('creates an entity with a decimal value with unit', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const unitId = Id('016c9b1cd8a84e4d9e844e40878bb235');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'decimal',
          exponent: -2,
          mantissa: { type: 'i64', value: 12345n },
          unit: unitId,
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const decimalValue = entityOp.values[0];
    expect(decimalValue?.value.type).toBe('decimal');
    if (decimalValue?.value.type === 'decimal') {
      expect(decimalValue.value.exponent).toBe(-2);
      expect(decimalValue.value.mantissa).toEqual({ type: 'i64', value: 12345n });
      expect(decimalValue.value.unit).toEqual(toGrcId(unitId));
    }
  });

  it('creates an entity with a bytes value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const bytesData = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'bytes',
          value: bytesData,
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const bytesValue = entityOp.values[0];
    expect(bytesValue?.property).toEqual(toGrcId(propertyId));
    expect(bytesValue?.value.type).toBe('bytes');
    if (bytesValue?.value.type === 'bytes') {
      expect(bytesValue.value.value).toEqual(bytesData);
    }
  });

  it('creates an entity with an embedding value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const embeddingData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'embedding',
          subType: EmbeddingSubType.Float32,
          dims: 2,
          data: embeddingData,
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const embeddingValue = entityOp.values[0];
    expect(embeddingValue?.property).toEqual(toGrcId(propertyId));
    expect(embeddingValue?.value.type).toBe('embedding');
    if (embeddingValue?.value.type === 'embedding') {
      expect(embeddingValue.value.subType).toBe(EmbeddingSubType.Float32);
      expect(embeddingValue.value.dims).toBe(2);
      expect(embeddingValue.value.data).toEqual(embeddingData);
    }
  });

  it('creates an entity with relations', () => {
    const providedId = Id('b1dc6e5c63e143bab3d4755b251a4ea1');
    const relationTypeId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const toEntityId = Id('d8fd9b48e090430db52c6b33d897d0f3');
    const entity = createEntity({
      id: providedId,
      relations: {
        [relationTypeId]: {
          toEntity: toEntityId,
        },
      },
    });

    expect(entity).toBeDefined();
    expect(entity.id).toBe(providedId);
    expect(entity.ops).toHaveLength(2);

    // Check createEntity op
    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.id).toEqual(toGrcId(providedId));

    // Check createRelation op
    const relationOp = entity.ops[1] as CreateRelation;
    expect(relationOp.type).toBe('createRelation');
    expect(relationOp.from).toEqual(toGrcId(entity.id));
    expect(relationOp.relationType).toEqual(toGrcId(relationTypeId));
    expect(relationOp.to).toEqual(toGrcId(toEntityId));
  });

  it('creates an entity with multiple relations of the same type', () => {
    const providedId = Id('b1dc6e5c63e143bab3d4755b251a4ea1');
    const relationTypeId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const toEntityId1 = Id('d8fd9b48e090430db52c6b33d897d0f3');
    const toEntityId2 = Id('e8fd9b48e090430db52c6b33d897d0f4');
    const entity = createEntity({
      id: providedId,
      relations: {
        [relationTypeId]: [{ toEntity: toEntityId1 }, { toEntity: toEntityId2 }],
      },
    });

    expect(entity).toBeDefined();
    expect(entity.id).toBe(providedId);
    expect(entity.ops).toHaveLength(3); // 1 createEntity + 2 createRelation

    // Check first relation
    const rel1 = entity.ops[1] as CreateRelation;
    expect(rel1.type).toBe('createRelation');
    expect(rel1.from).toEqual(toGrcId(entity.id));
    expect(rel1.to).toEqual(toGrcId(toEntityId1));
    expect(rel1.relationType).toEqual(toGrcId(relationTypeId));

    // Check second relation
    const rel2 = entity.ops[2] as CreateRelation;
    expect(rel2.type).toBe('createRelation');
    expect(rel2.from).toEqual(toGrcId(entity.id));
    expect(rel2.to).toEqual(toGrcId(toEntityId2));
    expect(rel2.relationType).toEqual(toGrcId(relationTypeId));
  });

  it('throws an error if the provided id is invalid', () => {
    expect(() => createEntity({ id: 'invalid' })).toThrow('Invalid id: "invalid" for `id` in `createEntity`');
  });

  it('throws an error if the cover id is invalid', () => {
    expect(() => createEntity({ cover: 'invalid-cover' })).toThrow(
      'Invalid id: "invalid-cover" for `cover` in `createEntity`',
    );
  });

  it('throws an error if a type id is invalid', () => {
    expect(() => createEntity({ types: ['invalid-type'] })).toThrow(
      'Invalid id: "invalid-type" for `types` in `createEntity`',
    );
  });

  it('throws an error if a property id in values is invalid', () => {
    expect(() => createEntity({ values: [{ property: 'invalid-prop', type: 'text', value: 'test' }] })).toThrow(
      'Invalid id: "invalid-prop" for `values` in `createEntity`',
    );
  });

  it('throws an error if a unit id in integer value is invalid', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    expect(() =>
      createEntity({ values: [{ property: propertyId, type: 'integer', value: 42n, unit: 'invalid-unit' }] }),
    ).toThrow('Invalid id: "invalid-unit" for `unit` in `values` in `createEntity`');
  });

  it('throws an error if a unit id in decimal value is invalid', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    expect(() =>
      createEntity({
        values: [
          {
            property: propertyId,
            type: 'decimal',
            exponent: -2,
            mantissa: { type: 'i64', value: 12345n },
            unit: 'invalid-unit',
          },
        ],
      }),
    ).toThrow('Invalid id: "invalid-unit" for `unit` in `values` in `createEntity`');
  });

  it('creates an entity with an integer value from number', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'integer',
          value: 42,
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.values).toHaveLength(1);

    const int64Value = entityOp.values[0];
    expect(int64Value?.property).toEqual(toGrcId(propertyId));
    expect(int64Value?.value.type).toBe('integer');
    if (int64Value?.value.type === 'integer') {
      expect(int64Value.value.value).toBe(42n);
    }
  });

  it('creates an entity with an integer value from number with unit', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const unitId = Id('016c9b1cd8a84e4d9e844e40878bb235');
    const entity = createEntity({
      values: [
        {
          property: propertyId,
          type: 'integer',
          value: 42,
          unit: unitId,
        },
      ],
    });

    expect(entity).toBeDefined();

    const entityOp = entity.ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');

    const int64Value = entityOp.values[0];
    expect(int64Value?.value.type).toBe('integer');
    if (int64Value?.value.type === 'integer') {
      expect(int64Value.value.value).toBe(42n);
      expect(int64Value.value.unit).toEqual(toGrcId(unitId));
    }
  });

  it('throws error for non-integer number in integer value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    expect(() =>
      createEntity({
        values: [{ property: propertyId, type: 'integer', value: 42.5 }],
      }),
    ).toThrow('Value 42.5 is not a valid integer for `integer` value in `createEntity`');
  });

  it('throws error for NaN in integer value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    expect(() =>
      createEntity({
        values: [{ property: propertyId, type: 'integer', value: NaN }],
      }),
    ).toThrow('Value NaN is not a valid integer for `integer` value in `createEntity`');
  });

  it('throws error for Infinity in integer value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    expect(() =>
      createEntity({
        values: [{ property: propertyId, type: 'integer', value: Infinity }],
      }),
    ).toThrow('Value Infinity is not a valid integer for `integer` value in `createEntity`');
  });

  it('throws error for unsafe integer in integer value', () => {
    const propertyId = Id('295c8bc61ae342cbb2a65b61080906ff');
    const unsafeInteger = Number.MAX_SAFE_INTEGER + 1;
    expect(() =>
      createEntity({
        values: [{ property: propertyId, type: 'integer', value: unsafeInteger }],
      }),
    ).toThrow(
      `Value ${unsafeInteger} is outside safe integer range for \`integer\` value in \`createEntity\`. Use bigint for large integers.`,
    );
  });
});
