import type { Op } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import { WEBSITE_PROPERTY } from './core/ids/content.js';
import { TYPES_PROPERTY } from './core/ids/system.js';
import { createEntity } from './graph/create-entity.js';
import { createRelation } from './graph/create-relation.js';
import { deleteRelation } from './graph/delete-relation.js';
import { updateEntity } from './graph/update-entity.js';
import { updateRelation } from './graph/update-relation.js';
import { generate } from './id-utils.js';
import { publishEdit } from './ipfs.js';

describe('publishEdit', () => {
  it('full flow with createEntity', async () => {
    const { ops } = createEntity({
      name: 'test',
      description: 'test',
      values: [
        {
          property: WEBSITE_PROPERTY,
          type: 'text',
          value: 'test',
        },
      ],
    });

    const { cid, editId } = await publishEdit({
      name: 'test',
      ops,
      author: '0x000000000000000000000000000000000000',
      network: 'TESTNET',
    });

    expect(cid).toMatch(/^ipfs:\/\//);
    expect(editId).toBeTruthy();
  });

  it('handles updateEntity ops', async () => {
    const entityId = generate();
    const { ops } = updateEntity({
      id: entityId,
      name: 'updated name',
      description: 'updated description',
      values: [{ property: WEBSITE_PROPERTY, type: 'text', value: 'https://example.com' }],
    });

    const { cid, editId } = await publishEdit({
      name: 'update test',
      ops,
      author: '0x000000000000000000000000000000000000',
      network: 'TESTNET',
    });

    expect(cid).toMatch(/^ipfs:\/\//);
    expect(editId).toBeTruthy();
  });

  it('handles createRelation ops', async () => {
    const fromEntityId = generate();
    const toEntityId = generate();
    const { ops } = createRelation({
      fromEntity: fromEntityId,
      toEntity: toEntityId,
      type: TYPES_PROPERTY,
    });

    const { cid, editId } = await publishEdit({
      name: 'relation test',
      ops,
      author: '0x000000000000000000000000000000000000',
      network: 'TESTNET',
    });

    expect(cid).toMatch(/^ipfs:\/\//);
    expect(editId).toBeTruthy();
  });

  it('handles deleteRelation ops', async () => {
    const relationId = generate();
    const { ops } = deleteRelation({ id: relationId });

    const { cid, editId } = await publishEdit({
      name: 'delete relation test',
      ops,
      author: '0x000000000000000000000000000000000000',
      network: 'TESTNET',
    });

    expect(cid).toMatch(/^ipfs:\/\//);
    expect(editId).toBeTruthy();
  });

  it('handles updateRelation ops', async () => {
    const relationId = generate();
    const { ops } = updateRelation({
      id: relationId,
      position: 'abc123',
    });

    const { cid, editId } = await publishEdit({
      name: 'update relation test',
      ops,
      author: '0x000000000000000000000000000000000000',
      network: 'TESTNET',
    });

    expect(cid).toMatch(/^ipfs:\/\//);
    expect(editId).toBeTruthy();
  });

  it('handles all value types in createEntity', async () => {
    const textPropertyId = generate();
    const float64PropertyId = generate();
    const boolPropertyId = generate();
    const pointPropertyId = generate();
    const datePropertyId = generate();
    const timePropertyId = generate();
    const datetimePropertyId = generate();
    const schedulePropertyId = generate();
    const { ops } = createEntity({
      name: 'value types test',
      values: [
        { property: textPropertyId, type: 'text', value: 'text value' },
        { property: float64PropertyId, type: 'float64', value: 42.5 },
        { property: boolPropertyId, type: 'bool', value: true },
        { property: pointPropertyId, type: 'point', lon: -122.4, lat: 37.8 },
        { property: datePropertyId, type: 'date', value: '2024-01-15' },
        { property: timePropertyId, type: 'time', value: '14:30:00Z' },
        { property: datetimePropertyId, type: 'datetime', value: '2024-01-15T14:30:00Z' },
        { property: schedulePropertyId, type: 'schedule', value: 'FREQ=WEEKLY;BYDAY=MO' },
      ],
    });

    const { cid, editId } = await publishEdit({
      name: 'all value types test',
      ops,
      author: '0x000000000000000000000000000000000000',
      network: 'TESTNET',
    });

    expect(cid).toMatch(/^ipfs:\/\//);
    expect(editId).toBeTruthy();
  });

  it('handles multiple ops in a single edit', async () => {
    const entity1 = createEntity({ name: 'Entity 1' });
    const entity2 = createEntity({ name: 'Entity 2' });
    const relation = createRelation({
      fromEntity: entity1.id,
      toEntity: entity2.id,
      type: TYPES_PROPERTY,
    });

    const ops: Op[] = [...entity1.ops, ...entity2.ops, ...relation.ops];

    const { cid, editId } = await publishEdit({
      name: 'multiple ops test',
      ops,
      author: '0x000000000000000000000000000000000000',
      network: 'TESTNET',
    });

    expect(cid).toMatch(/^ipfs:\/\//);
    expect(editId).toBeTruthy();
  });
});
