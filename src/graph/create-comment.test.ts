import type { CreateEntity, CreateRelation } from '@geoprotocol/grc-20';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMENT_TYPE } from '../core/ids/content.js';
import {
  MARKDOWN_CONTENT,
  NAME_PROPERTY,
  REPLY_TO_PROPERTY,
  RESOLVED_PROPERTY,
  TYPES_PROPERTY,
} from '../core/ids/system.js';
import { Id } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { TESTNET_API_ORIGIN } from './constants.js';
import { createComment } from './create-comment.js';

const entityId = Id('3af3e22d21694a078681516710b7ecf1');
const spaceId = Id('d4bc2f205e2d415e971eb0b9fbf6b6fc');
const graphqlUrl = `${TESTNET_API_ORIGIN}/graphql`;

function mockGraphQLResponse(relationsList: Array<Record<string, unknown>> = []) {
  vi.spyOn(global, 'fetch').mockImplementation(url => {
    if (url.toString() === graphqlUrl) {
      return Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              entity: { relationsList },
            },
          }),
      } as Response);
    }
    return vi.fn() as never;
  });
}

function mockRelation(toEntityId: string, toSpaceId: string) {
  return {
    toEntity: { id: toEntityId },
    toSpace: { id: toSpaceId },
  };
}

describe('createComment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a basic comment on an entity', async () => {
    mockGraphQLResponse();

    const { id, ops } = await createComment({
      content: 'Hello world',
      replyTo: { entityId, spaceId },
    });

    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(ops.length).toBeGreaterThanOrEqual(3);

    // createEntity op
    const entityOp = ops[0] as CreateEntity;
    expect(entityOp.type).toBe('createEntity');
    expect(entityOp.id).toEqual(toGrcId(id));

    // Verify name value
    const nameValue = entityOp.values.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
    });
    expect(nameValue).toBeDefined();
    expect(nameValue?.value.type).toBe('text');
    if (nameValue?.value.type === 'text') {
      expect(nameValue.value.value).toBe('Hello world');
    }

    // Verify markdown content value
    const markdownValue = entityOp.values.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(MARKDOWN_CONTENT)[i]);
    });
    expect(markdownValue).toBeDefined();
    expect(markdownValue?.value.type).toBe('text');
    if (markdownValue?.value.type === 'text') {
      expect(markdownValue.value.value).toBe('Hello world');
    }

    // Type relation to COMMENT_TYPE
    const typeRel = ops.find(
      op =>
        op.type === 'createRelation' &&
        (op as CreateRelation).relationType.every((b, i) => b === toGrcId(TYPES_PROPERTY)[i]),
    ) as CreateRelation;
    expect(typeRel).toBeDefined();
    expect(typeRel.from).toEqual(toGrcId(id));
    expect(typeRel.to).toEqual(toGrcId(COMMENT_TYPE));

    // Reply-to relation (only 1 — the root entity)
    const replyRels = ops.filter(
      op =>
        op.type === 'createRelation' &&
        (op as CreateRelation).relationType.every((b, i) => b === toGrcId(REPLY_TO_PROPERTY)[i]),
    ) as CreateRelation[];
    expect(replyRels).toHaveLength(1);
    expect(replyRels[0]?.to).toEqual(toGrcId(entityId));
    expect(replyRels[0]?.toSpace).toEqual(toGrcId(spaceId));
  });

  it('creates root entity + direct parent when replying to a comment', async () => {
    const rootEntityId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const rootSpaceId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    // First fetch: target's reply-tos (target is a comment pointing to root)
    // Second fetch: check root has no reply-tos (confirming it's the root)
    let fetchCallCount = 0;
    vi.spyOn(global, 'fetch').mockImplementation(url => {
      if (url.toString() === graphqlUrl) {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return Promise.resolve({
            status: 200,
            json: () =>
              Promise.resolve({
                data: { entity: { relationsList: [mockRelation(rootEntityId, rootSpaceId)] } },
              }),
          } as Response);
        }
        // Root entity has no reply-tos
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({ data: { entity: { relationsList: [] } } }),
        } as Response);
      }
      return vi.fn() as never;
    });

    const { ops } = await createComment({
      content: 'Reply',
      replyTo: { entityId, spaceId },
    });

    const replyRels = ops.filter(
      op =>
        op.type === 'createRelation' &&
        (op as CreateRelation).relationType.every((b, i) => b === toGrcId(REPLY_TO_PROPERTY)[i]),
    ) as CreateRelation[];
    expect(replyRels).toHaveLength(2);

    // Root entity
    const rootReply = replyRels.find(r => r.to.every((b, i) => b === toGrcId(rootEntityId)[i]));
    expect(rootReply).toBeDefined();
    expect(rootReply?.toSpace).toEqual(toGrcId(rootSpaceId));

    // Direct parent comment
    const parentReply = replyRels.find(r => r.to.every((b, i) => b === toGrcId(entityId)[i]));
    expect(parentReply).toBeDefined();
    expect(parentReply?.toSpace).toEqual(toGrcId(spaceId));
  });

  it('creates reply-tos for all ancestors at depth 3 (root + commentA + direct parent)', async () => {
    const rootEntityId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const rootSpaceId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const commentAId = 'cccccccccccccccccccccccccccccccc';
    const commentASpaceId = 'dddddddddddddddddddddddddddddddd';

    // Target is Comment B which has 2 reply-tos: [CommentA, RootEntity]
    // Creating Comment C on Comment B should carry forward all of B's reply-tos
    // plus B itself, resulting in 3 reply-to relations.
    vi.spyOn(global, 'fetch').mockImplementation(url => {
      if (url.toString() === graphqlUrl) {
        // Comment B's reply-tos
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              data: {
                entity: {
                  relationsList: [mockRelation(commentAId, commentASpaceId), mockRelation(rootEntityId, rootSpaceId)],
                },
              },
            }),
        } as Response);
      }
      return vi.fn() as never;
    });

    const { ops } = await createComment({
      content: 'Deep reply',
      replyTo: { entityId, spaceId },
    });

    const replyRels = ops.filter(
      op =>
        op.type === 'createRelation' &&
        (op as CreateRelation).relationType.every((b, i) => b === toGrcId(REPLY_TO_PROPERTY)[i]),
    ) as CreateRelation[];
    // All ancestors: root entity + commentA + direct parent
    expect(replyRels).toHaveLength(3);

    // Root entity
    const rootReply = replyRels.find(r => r.to.every((b, i) => b === toGrcId(rootEntityId)[i]));
    expect(rootReply).toBeDefined();

    // Comment A (intermediate ancestor)
    const commentAReply = replyRels.find(r => r.to.every((b, i) => b === toGrcId(commentAId)[i]));
    expect(commentAReply).toBeDefined();

    // Direct parent (entityId, the comment being replied to)
    const parentReply = replyRels.find(r => r.to.every((b, i) => b === toGrcId(entityId)[i]));
    expect(parentReply).toBeDefined();
  });

  it('sets resolved to false by default', async () => {
    mockGraphQLResponse();

    const { ops } = await createComment({
      content: 'Test',
      replyTo: { entityId, spaceId },
    });

    const entityOp = ops[0] as CreateEntity;
    const resolvedValue = entityOp.values.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(RESOLVED_PROPERTY)[i]);
    });
    expect(resolvedValue).toBeDefined();
    expect(resolvedValue?.value.type).toBe('boolean');
    if (resolvedValue?.value.type === 'boolean') {
      expect(resolvedValue.value.value).toBe(false);
    }
  });

  it('sets resolved to true when specified', async () => {
    mockGraphQLResponse();

    const { ops } = await createComment({
      content: 'Test',
      replyTo: { entityId, spaceId },
      resolved: true,
    });

    const entityOp = ops[0] as CreateEntity;
    const resolvedValue = entityOp.values.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(RESOLVED_PROPERTY)[i]);
    });
    expect(resolvedValue).toBeDefined();
    expect(resolvedValue?.value.type).toBe('boolean');
    if (resolvedValue?.value.type === 'boolean') {
      expect(resolvedValue.value.value).toBe(true);
    }
  });

  it('strips markdown from name and truncates to 20 chars', async () => {
    mockGraphQLResponse();

    const { ops } = await createComment({
      content: '## Lorem ipsum dolor sit amet, consectetur adipiscing',
      replyTo: { entityId, spaceId },
    });

    const entityOp = ops[0] as CreateEntity;
    const nameValue = entityOp.values.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
    });
    expect(nameValue).toBeDefined();
    expect(nameValue?.value.type).toBe('text');
    if (nameValue?.value.type === 'text') {
      expect(nameValue.value.value).toBe('Lorem ipsum dolor si');
    }
  });

  it('strips heading markdown from name', async () => {
    mockGraphQLResponse();

    const { ops } = await createComment({
      content: '## Hello World',
      replyTo: { entityId, spaceId },
    });

    const entityOp = ops[0] as CreateEntity;
    const nameValue = entityOp.values.find(v => {
      const propBytes = v.property;
      return propBytes.every((b, i) => b === toGrcId(NAME_PROPERTY)[i]);
    });
    expect(nameValue).toBeDefined();
    if (nameValue?.value.type === 'text') {
      expect(nameValue.value.value).toBe('Hello World');
    }
  });

  it('handles entity not found in API', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(url => {
      if (url.toString() === graphqlUrl) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({ data: { entity: null } }),
        } as Response);
      }
      return vi.fn() as never;
    });

    const { ops } = await createComment({
      content: 'Comment on missing entity',
      replyTo: { entityId, spaceId },
    });

    const replyRels = ops.filter(
      op =>
        op.type === 'createRelation' &&
        (op as CreateRelation).relationType.every((b, i) => b === toGrcId(REPLY_TO_PROPERTY)[i]),
    ) as CreateRelation[];
    expect(replyRels).toHaveLength(1);
  });

  it('uses provided id when given', async () => {
    mockGraphQLResponse();
    const customId = Id('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

    const { id } = await createComment({
      id: customId,
      content: 'Test',
      replyTo: { entityId, spaceId },
    });

    expect(id).toBe(customId);
  });

  it('throws for invalid replyTo entityId', async () => {
    await expect(
      createComment({
        content: 'Test',
        replyTo: { entityId: 'invalid', spaceId },
      }),
    ).rejects.toThrow('Invalid id: "invalid" for `replyTo.entityId` in `createComment`');
  });

  it('throws for invalid replyTo spaceId', async () => {
    await expect(
      createComment({
        content: 'Test',
        replyTo: { entityId, spaceId: 'invalid' },
      }),
    ).rejects.toThrow('Invalid id: "invalid" for `replyTo.spaceId` in `createComment`');
  });

  it('throws for invalid provided id', async () => {
    await expect(
      createComment({
        id: 'invalid',
        content: 'Test',
        replyTo: { entityId, spaceId },
      }),
    ).rejects.toThrow('Invalid id: "invalid" for `id` in `createComment`');
  });
});
