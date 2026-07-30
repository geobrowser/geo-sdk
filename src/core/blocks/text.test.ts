import type { CreateRelation, UpdateEntity } from '@geoprotocol/grc-20';
import { expect, it } from 'vitest';
import { Id } from '../../id.js';
import { toGrcId } from '../../id-utils.js';
import { BLOCKS, MARKDOWN_CONTENT, TEXT_BLOCK, TYPES_PROPERTY } from '../ids/system.js';
import { make } from './text.js';

it('preserves the legacy array return contract', () => {
  const ops = make({
    fromId: Id('5871e8f7b71948979c4dcf7c518d32ef'),
    text: 'test-text',
  });

  expect(Array.isArray(ops)).toBe(true);
});

it('should generate ops for a text block entity', () => {
  const fromId = Id('5871e8f7b71948979c4dcf7c518d32ef');
  const ops = make({
    fromId,
    text: 'test-text',
    position: 'test-position',
  });

  const [blockTypeOp, blockMarkdownTextOp, blockRelationOp] = ops;

  expect(ops.length).toBe(3);

  // Check types relation for text block
  expect(blockTypeOp?.type).toBe('createRelation');
  const typeRelOp = blockTypeOp as CreateRelation;
  expect(typeRelOp.to).toEqual(toGrcId(TEXT_BLOCK));
  expect(typeRelOp.relationType).toEqual(toGrcId(TYPES_PROPERTY));

  // Check entity update with markdown text
  expect(blockMarkdownTextOp?.type).toBe('updateEntity');
  const markdownEntityOp = blockMarkdownTextOp as UpdateEntity;

  // Verify markdown content value
  const markdownValue = markdownEntityOp.set.find(v => {
    const propBytes = v.property;
    return propBytes.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]);
  });
  expect(markdownValue).toBeDefined();
  expect(markdownValue?.value.type).toBe('text');
  if (markdownValue?.value.type === 'text') {
    expect(markdownValue.value.value).toBe('test-text');
  }

  // Check blocks relation
  expect(blockRelationOp?.type).toBe('createRelation');
  const blocksRelOp = blockRelationOp as CreateRelation;
  expect(blocksRelOp.from).toEqual(toGrcId(fromId));
  expect(blocksRelOp.relationType).toEqual(toGrcId(BLOCKS));
  expect(blocksRelOp.position).toBe('test-position');
});

it('should generate ops for a text block without position', () => {
  const fromId = Id('5871e8f7b71948979c4dcf7c518d32ef');
  const ops = make({
    fromId,
    text: 'markdown content here',
  });

  expect(ops.length).toBe(3);

  // Check blocks relation has no position
  const blocksRelOp = ops[2] as CreateRelation;
  expect(blocksRelOp.type).toBe('createRelation');
  expect(blocksRelOp.position).toBeUndefined();
});

it('should use a provided block id for deterministic re-runs', () => {
  const fromId = Id('5871e8f7b71948979c4dcf7c518d32ef');
  const blockId = Id('a1b2c3d4e5f64789a0b1c2d3e4f50617');
  const ops = make({
    fromId,
    text: 'test-text',
    id: blockId,
  });

  const typeRelOp = ops[0] as CreateRelation;
  expect(typeRelOp.from).toEqual(toGrcId(blockId));
  const blocksRelOp = ops[2] as CreateRelation;
  expect(blocksRelOp.to).toEqual(toGrcId(blockId));
});

it('should throw on an invalid provided id', () => {
  const fromId = Id('5871e8f7b71948979c4dcf7c518d32ef');
  expect(() => make({ fromId, text: 'test-text', id: 'not-a-valid-id' })).toThrow();
});

it('should encode a dashed provided id to the same bytes as its dashless form', () => {
  const fromId = Id('5871e8f7b71948979c4dcf7c518d32ef');
  const dashed = make({ fromId, text: 't', id: 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f50617' });
  const dashless = make({ fromId, text: 't', id: 'a1b2c3d4e5f64789a0b1c2d3e4f50617' });

  const dashedTypeRel = dashed[0] as CreateRelation;
  const dashlessTypeRel = dashless[0] as CreateRelation;
  expect(dashedTypeRel.from).toEqual(dashlessTypeRel.from);
});

it('should handle empty text', () => {
  const fromId = Id('5871e8f7b71948979c4dcf7c518d32ef');
  const ops = make({
    fromId,
    text: '',
    position: 'a',
  });

  expect(ops.length).toBe(3);

  const markdownEntityOp = ops[1] as UpdateEntity;
  const markdownValue = markdownEntityOp.set.find(v => {
    const propBytes = v.property;
    return propBytes.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]);
  });
  expect(markdownValue?.value.type).toBe('text');
  if (markdownValue?.value.type === 'text') {
    expect(markdownValue.value.value).toBe('');
  }
});

it('should handle multiline text content', () => {
  const fromId = Id('5871e8f7b71948979c4dcf7c518d32ef');
  const multilineText = `# Heading

This is a paragraph.

- Item 1
- Item 2`;
  const ops = make({
    fromId,
    text: multilineText,
    position: 'b',
  });

  const markdownEntityOp = ops[1] as UpdateEntity;
  const markdownValue = markdownEntityOp.set.find(v => {
    const propBytes = v.property;
    return propBytes.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]);
  });
  expect(markdownValue?.value.type).toBe('text');
  if (markdownValue?.value.type === 'text') {
    expect(markdownValue.value.value).toBe(multilineText);
  }
});
