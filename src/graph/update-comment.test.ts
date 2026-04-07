import type { UpdateEntity } from '@geoprotocol/grc-20';
import { describe, expect, it } from 'vitest';
import { MARKDOWN_CONTENT, NAME_PROPERTY, RESOLVED_PROPERTY } from '../core/ids/system.js';
import { Id } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { updateComment } from './update-comment.js';

const commentId = Id('3af3e22d21694a078681516710b7ecf1');

describe('updateComment', () => {
  it('updates content and name', () => {
    const { id, ops } = updateComment({
      id: commentId,
      content: 'Updated content',
    });

    expect(id).toBe(commentId);
    expect(ops).toHaveLength(1);

    const op = ops[0] as UpdateEntity;
    expect(op.type).toBe('updateEntity');
    expect(op.id).toEqual(toGrcId(commentId));

    // Name should be derived from content
    const nameValue = op.set.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
    });
    expect(nameValue).toBeDefined();
    if (nameValue?.value.type === 'text') {
      expect(nameValue.value.value).toBe('Updated content');
    }

    // Markdown content
    const markdownValue = op.set.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]);
    });
    expect(markdownValue).toBeDefined();
    if (markdownValue?.value.type === 'text') {
      expect(markdownValue.value.value).toBe('Updated content');
    }
  });

  it('updates resolved only', () => {
    const { id, ops } = updateComment({
      id: commentId,
      resolved: true,
    });

    expect(id).toBe(commentId);
    expect(ops).toHaveLength(1);

    const op = ops[0] as UpdateEntity;
    expect(op.type).toBe('updateEntity');

    // Should not have name or markdown content
    const nameValue = op.set.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
    });
    expect(nameValue).toBeUndefined();

    const markdownValue = op.set.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]);
    });
    expect(markdownValue).toBeUndefined();

    // Should have resolved
    const resolvedValue = op.set.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(RESOLVED_PROPERTY)[i]);
    });
    expect(resolvedValue).toBeDefined();
    if (resolvedValue?.value.type === 'boolean') {
      expect(resolvedValue.value.value).toBe(true);
    }
  });

  it('updates both content and resolved', () => {
    const { ops } = updateComment({
      id: commentId,
      content: 'New content',
      resolved: false,
    });

    const op = ops[0] as UpdateEntity;

    const markdownValue = op.set.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]);
    });
    expect(markdownValue).toBeDefined();

    const resolvedValue = op.set.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(RESOLVED_PROPERTY)[i]);
    });
    expect(resolvedValue).toBeDefined();
    if (resolvedValue?.value.type === 'boolean') {
      expect(resolvedValue.value.value).toBe(false);
    }
  });

  it('strips markdown from name and truncates to 20 chars', () => {
    const { ops } = updateComment({
      id: commentId,
      content: '## Lorem ipsum dolor sit amet, consectetur adipiscing',
    });

    const op = ops[0] as UpdateEntity;
    const nameValue = op.set.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
    });
    expect(nameValue).toBeDefined();
    if (nameValue?.value.type === 'text') {
      expect(nameValue.value.value).toBe('Lorem ipsum dolor si');
    }
  });

  it('throws for invalid id', () => {
    expect(() =>
      updateComment({
        id: 'invalid',
        content: 'Test',
      }),
    ).toThrow('Invalid id: "invalid" for `id` in `updateComment`');
  });
});
