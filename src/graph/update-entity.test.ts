import { EmbeddingSubType, languages, type UpdateEntity } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import { DESCRIPTION_PROPERTY, NAME_PROPERTY } from '../core/ids/system.js';
import { Id } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { updateEntity } from './update-entity.js';

describe('updateEntity', () => {
  const entityId = Id('b1dc6e5c63e143bab3d4755b251a4ea1');
  const _coverId = Id('30145d36d5a54244be593d111d879ba5');

  it('updates an entity with name and description', async () => {
    const result = updateEntity({
      id: entityId,
      name: 'Updated Entity',
      description: 'Updated Description',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(entityId);
    expect(result.ops).toHaveLength(1);

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');
    expect(entityOp.id).toEqual(toGrcId(entityId));

    // Verify name value
    const nameValue = entityOp.set.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
    });
    expect(nameValue).toBeDefined();
    expect(nameValue?.value.type).toBe('text');
    if (nameValue?.value.type === 'text') {
      expect(nameValue.value.value).toBe('Updated Entity');
    }

    // Verify description value
    const descValue = entityOp.set.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(DESCRIPTION_PROPERTY)[i]);
    });
    expect(descValue).toBeDefined();
    expect(descValue?.value.type).toBe('text');
    if (descValue?.value.type === 'text') {
      expect(descValue.value.value).toBe('Updated Description');
    }
  });

  it('updates an entity with only name', async () => {
    const result = updateEntity({
      id: entityId,
      name: 'Updated Entity',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(entityId);
    expect(result.ops).toHaveLength(1);

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');
    expect(entityOp.id).toEqual(toGrcId(entityId));
    expect(entityOp.set).toHaveLength(1);

    // Verify name value
    const nameValue = entityOp.set[0];
    expect(nameValue?.property).toEqual(toGrcId(NAME_PROPERTY));
    expect(nameValue?.value.type).toBe('text');
    if (nameValue?.value.type === 'text') {
      expect(nameValue.value.value).toBe('Updated Entity');
    }
  });

  it('updates an entity with custom typed values', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'text', value: 'updated custom value' }],
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(entityId);
    expect(result.ops).toHaveLength(1);

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');
    expect(entityOp.id).toEqual(toGrcId(entityId));
    expect(entityOp.set).toHaveLength(1);

    // Verify custom value
    const customValue = entityOp.set[0];
    expect(customValue?.property).toEqual(toGrcId(customPropertyId));
    expect(customValue?.value.type).toBe('text');
    if (customValue?.value.type === 'text') {
      expect(customValue.value.value).toBe('updated custom value');
    }
  });

  it('updates an entity with a float value', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'float', value: 42.5 }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');
    expect(entityOp.id).toEqual(toGrcId(entityId));
    expect(entityOp.set).toHaveLength(1);

    const floatValue = entityOp.set[0];
    expect(floatValue?.property).toEqual(toGrcId(customPropertyId));
    expect(floatValue?.value.type).toBe('float');
    if (floatValue?.value.type === 'float') {
      expect(floatValue.value.value).toBe(42.5);
    }
  });

  it('updates an entity with a float value with unit', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const unitId = Id('016c9b1cd8a84e4d9e844e40878bb235');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'float', value: 42.5, unit: unitId }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const floatValue = entityOp.set[0];
    expect(floatValue?.value.type).toBe('float');
    if (floatValue?.value.type === 'float') {
      expect(floatValue.value.value).toBe(42.5);
      expect(floatValue.value.unit).toEqual(toGrcId(unitId));
    }
  });

  it('updates an entity with a boolean value', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'boolean', value: true }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const boolValue = entityOp.set[0];
    expect(boolValue?.property).toEqual(toGrcId(customPropertyId));
    expect(boolValue?.value.type).toBe('boolean');
    if (boolValue?.value.type === 'boolean') {
      expect(boolValue.value.value).toBe(true);
    }
  });

  it('updates an entity with a point value', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'point', lon: -122.4, lat: 37.8 }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const pointValue = entityOp.set[0];
    expect(pointValue?.property).toEqual(toGrcId(customPropertyId));
    expect(pointValue?.value.type).toBe('point');
    if (pointValue?.value.type === 'point') {
      expect(pointValue.value.lon).toBe(-122.4);
      expect(pointValue.value.lat).toBe(37.8);
    }
  });

  it('updates an entity with a date value', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'date', value: '2024-03-20' }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const dateValue = entityOp.set[0];
    expect(dateValue?.property).toEqual(toGrcId(customPropertyId));
    expect(dateValue?.value.type).toBe('date');
    if (dateValue?.value.type === 'date') {
      expect(dateValue.value.value).toBe('2024-03-20');
    }
  });

  it('updates an entity with a text value with language', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const languageId = Id('0a4e9810f78f429ea4ceb1904a43251d');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'text', value: 'localized text', language: languageId }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const textValue = entityOp.set[0];
    expect(textValue?.value.type).toBe('text');
    if (textValue?.value.type === 'text') {
      expect(textValue.value.value).toBe('localized text');
      expect(textValue.value.language).toEqual(toGrcId(languageId));
    }
  });

  it('updates an entity with an integer value', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'integer', value: 9007199254740993n }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const int64Value = entityOp.set[0];
    expect(int64Value?.property).toEqual(toGrcId(customPropertyId));
    expect(int64Value?.value.type).toBe('integer');
    if (int64Value?.value.type === 'integer') {
      expect(int64Value.value.value).toBe(9007199254740993n);
    }
  });

  it('updates an entity with an integer value with unit', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const unitId = Id('016c9b1cd8a84e4d9e844e40878bb235');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'integer', value: 42n, unit: unitId }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const int64Value = entityOp.set[0];
    expect(int64Value?.value.type).toBe('integer');
    if (int64Value?.value.type === 'integer') {
      expect(int64Value.value.value).toBe(42n);
      expect(int64Value.value.unit).toEqual(toGrcId(unitId));
    }
  });

  it('updates an entity with a decimal value (i64 mantissa)', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      values: [
        {
          property: customPropertyId,
          type: 'decimal',
          exponent: -2,
          mantissa: { type: 'i64', value: 12345n },
        },
      ],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const decimalValue = entityOp.set[0];
    expect(decimalValue?.property).toEqual(toGrcId(customPropertyId));
    expect(decimalValue?.value.type).toBe('decimal');
    if (decimalValue?.value.type === 'decimal') {
      expect(decimalValue.value.exponent).toBe(-2);
      expect(decimalValue.value.mantissa).toEqual({ type: 'i64', value: 12345n });
    }
  });

  it('updates an entity with a decimal value with unit', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const unitId = Id('016c9b1cd8a84e4d9e844e40878bb235');
    const result = updateEntity({
      id: entityId,
      values: [
        {
          property: customPropertyId,
          type: 'decimal',
          exponent: -2,
          mantissa: { type: 'i64', value: 12345n },
          unit: unitId,
        },
      ],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const decimalValue = entityOp.set[0];
    expect(decimalValue?.value.type).toBe('decimal');
    if (decimalValue?.value.type === 'decimal') {
      expect(decimalValue.value.exponent).toBe(-2);
      expect(decimalValue.value.mantissa).toEqual({ type: 'i64', value: 12345n });
      expect(decimalValue.value.unit).toEqual(toGrcId(unitId));
    }
  });

  it('updates an entity with a bytes value', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const bytesData = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'bytes', value: bytesData }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const bytesValue = entityOp.set[0];
    expect(bytesValue?.property).toEqual(toGrcId(customPropertyId));
    expect(bytesValue?.value.type).toBe('bytes');
    if (bytesValue?.value.type === 'bytes') {
      expect(bytesValue.value.value).toEqual(bytesData);
    }
  });

  it('updates an entity with an embedding value', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const embeddingData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    const result = updateEntity({
      id: entityId,
      values: [
        {
          property: customPropertyId,
          type: 'embedding',
          subType: EmbeddingSubType.Float32,
          dims: 2,
          data: embeddingData,
        },
      ],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const embeddingValue = entityOp.set[0];
    expect(embeddingValue?.property).toEqual(toGrcId(customPropertyId));
    expect(embeddingValue?.value.type).toBe('embedding');
    if (embeddingValue?.value.type === 'embedding') {
      expect(embeddingValue.value.subType).toBe(EmbeddingSubType.Float32);
      expect(embeddingValue.value.dims).toBe(2);
      expect(embeddingValue.value.data).toEqual(embeddingData);
    }
  });

  // Unset tests
  it('unsets a property value with default (all) language', async () => {
    const propertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      unset: [{ property: propertyId }],
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(entityId);
    expect(result.ops).toHaveLength(1);

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');
    expect(entityOp.unset).toHaveLength(1);
    expect(entityOp.unset[0]?.property).toEqual(toGrcId(propertyId));
    expect(entityOp.unset[0]?.language).toEqual({ type: 'all' });
  });

  it('unsets a property value with explicit all language', async () => {
    const propertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      unset: [{ property: propertyId, language: 'all' }],
    });

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.unset).toHaveLength(1);
    expect(entityOp.unset[0]?.language).toEqual({ type: 'all' });
  });

  it('unsets a property value with english language using grc-20 helper', async () => {
    const propertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      unset: [{ property: propertyId, language: languages.english() }],
    });

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.unset).toHaveLength(1);
    expect(entityOp.unset[0]?.property).toEqual(toGrcId(propertyId));
    expect(entityOp.unset[0]?.language).toEqual({ type: 'specific', language: languages.english() });
  });

  it('unsets a property value with specific language using string ID', async () => {
    const propertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const germanLanguageId = Id('0a4e9810f78f429ea4ceb1904a43251d');
    const result = updateEntity({
      id: entityId,
      unset: [{ property: propertyId, language: germanLanguageId }],
    });

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.unset).toHaveLength(1);
    expect(entityOp.unset[0]?.property).toEqual(toGrcId(propertyId));
    expect(entityOp.unset[0]?.language).toEqual({ type: 'specific', language: toGrcId(germanLanguageId) });
  });

  it('supports mixed set and unset operations', async () => {
    const propertyId1 = Id('fa269fd3de9849cf90c44235d905a67c');
    const propertyId2 = Id('016c9b1cd8a84e4d9e844e40878bb235');
    const result = updateEntity({
      id: entityId,
      values: [{ property: propertyId1, type: 'text', value: 'new value' }],
      unset: [{ property: propertyId2 }],
    });

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');
    expect(entityOp.set).toHaveLength(1);
    expect(entityOp.unset).toHaveLength(1);
    expect(entityOp.set[0]?.property).toEqual(toGrcId(propertyId1));
    expect(entityOp.unset[0]?.property).toEqual(toGrcId(propertyId2));
  });

  it('supports unsetting multiple properties', async () => {
    const propertyId1 = Id('fa269fd3de9849cf90c44235d905a67c');
    const propertyId2 = Id('016c9b1cd8a84e4d9e844e40878bb235');
    const result = updateEntity({
      id: entityId,
      unset: [{ property: propertyId1 }, { property: propertyId2, language: languages.german() }],
    });

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.unset).toHaveLength(2);
    expect(entityOp.unset[0]?.property).toEqual(toGrcId(propertyId1));
    expect(entityOp.unset[0]?.language).toEqual({ type: 'all' });
    expect(entityOp.unset[1]?.property).toEqual(toGrcId(propertyId2));
    expect(entityOp.unset[1]?.language).toEqual({ type: 'specific', language: languages.german() });
  });

  it('throws an error if the provided id is invalid', () => {
    expect(() => updateEntity({ id: 'invalid' })).toThrow('Invalid id: "invalid" for `id` in `updateEntity`');
  });

  it('throws an error if a property id in values is invalid', () => {
    expect(() =>
      updateEntity({
        id: entityId,
        values: [{ property: 'invalid-prop', type: 'text', value: 'test' }],
      }),
    ).toThrow('Invalid id: "invalid-prop" for `values` in `updateEntity`');
  });

  it('throws an error if a language id in values is invalid', () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    expect(() =>
      updateEntity({
        id: entityId,
        values: [{ property: customPropertyId, type: 'text', value: 'test', language: 'invalid-lang' }],
      }),
    ).toThrow('Invalid id: "invalid-lang" for `language` in `values` in `updateEntity`');
  });

  it('throws an error if a unit id in values is invalid', () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    expect(() =>
      updateEntity({
        id: entityId,
        values: [{ property: customPropertyId, type: 'float', value: 42, unit: 'invalid-unit' }],
      }),
    ).toThrow('Invalid id: "invalid-unit" for `unit` in `values` in `updateEntity`');
  });

  it('throws an error if a property id in unset is invalid', () => {
    expect(() =>
      updateEntity({
        id: entityId,
        unset: [{ property: 'invalid-prop' }],
      }),
    ).toThrow('Invalid id: "invalid-prop" for `property` in `unset` in `updateEntity`');
  });

  it('throws an error if a language id in unset is invalid', () => {
    const propertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    expect(() =>
      updateEntity({
        id: entityId,
        unset: [{ property: propertyId, language: 'invalid-lang' }],
      }),
    ).toThrow('Invalid id: "invalid-lang" for `language` in `unset` in `updateEntity`');
  });

  it('throws an error if a unit id in integer value is invalid', () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    expect(() =>
      updateEntity({
        id: entityId,
        values: [{ property: customPropertyId, type: 'integer', value: 42n, unit: 'invalid-unit' }],
      }),
    ).toThrow('Invalid id: "invalid-unit" for `unit` in `values` in `updateEntity`');
  });

  it('throws an error if a unit id in decimal value is invalid', () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    expect(() =>
      updateEntity({
        id: entityId,
        values: [
          {
            property: customPropertyId,
            type: 'decimal',
            exponent: -2,
            mantissa: { type: 'i64', value: 12345n },
            unit: 'invalid-unit',
          },
        ],
      }),
    ).toThrow('Invalid id: "invalid-unit" for `unit` in `values` in `updateEntity`');
  });

  it('updates an entity with an integer value from number', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'integer', value: 42 }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const int64Value = entityOp.set[0];
    expect(int64Value?.property).toEqual(toGrcId(customPropertyId));
    expect(int64Value?.value.type).toBe('integer');
    if (int64Value?.value.type === 'integer') {
      expect(int64Value.value.value).toBe(42n);
    }
  });

  it('updates an entity with an integer value from number with unit', async () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const unitId = Id('016c9b1cd8a84e4d9e844e40878bb235');
    const result = updateEntity({
      id: entityId,
      values: [{ property: customPropertyId, type: 'integer', value: 42, unit: unitId }],
    });

    expect(result).toBeDefined();

    const entityOp = result.ops[0] as UpdateEntity;
    expect(entityOp.type).toBe('updateEntity');

    const int64Value = entityOp.set[0];
    expect(int64Value?.value.type).toBe('integer');
    if (int64Value?.value.type === 'integer') {
      expect(int64Value.value.value).toBe(42n);
      expect(int64Value.value.unit).toEqual(toGrcId(unitId));
    }
  });

  it('throws error for non-integer number in integer value', () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    expect(() =>
      updateEntity({
        id: entityId,
        values: [{ property: customPropertyId, type: 'integer', value: 42.5 }],
      }),
    ).toThrow('Value 42.5 is not a valid integer for `integer` value in `updateEntity`');
  });

  it('throws error for NaN in integer value', () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    expect(() =>
      updateEntity({
        id: entityId,
        values: [{ property: customPropertyId, type: 'integer', value: NaN }],
      }),
    ).toThrow('Value NaN is not a valid integer for `integer` value in `updateEntity`');
  });

  it('throws error for Infinity in integer value', () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    expect(() =>
      updateEntity({
        id: entityId,
        values: [{ property: customPropertyId, type: 'integer', value: Infinity }],
      }),
    ).toThrow('Value Infinity is not a valid integer for `integer` value in `updateEntity`');
  });

  it('throws error for unsafe integer in integer value', () => {
    const customPropertyId = Id('fa269fd3de9849cf90c44235d905a67c');
    const unsafeInteger = Number.MAX_SAFE_INTEGER + 1;
    expect(() =>
      updateEntity({
        id: entityId,
        values: [{ property: customPropertyId, type: 'integer', value: unsafeInteger }],
      }),
    ).toThrow(
      `Value ${unsafeInteger} is outside safe integer range for \`integer\` value in \`updateEntity\`. Use bigint for large integers.`,
    );
  });
});
