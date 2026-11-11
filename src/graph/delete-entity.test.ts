import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Id } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { deleteEntity } from './delete-entity.js';

function connection<T>(nodes: T[], endCursor: string | null = null) {
  return { nodes, pageInfo: { hasNextPage: endCursor !== null, endCursor } };
}

/** The first-page response `deleteEntity` reads: the existence check plus the first page of each list. */
function mockGraphQLResponse(
  entity: {
    valuesList: Array<{ propertyId: string; spaceId: string }>;
    relationsList: Array<{ id: string; spaceId: string }>;
  } | null,
  cursors: { values?: string; relations?: string } = {},
) {
  return {
    ok: true,
    json: async () => ({
      data: {
        entity: entity ? { id: 'entity' } : null,
        values: connection(entity?.valuesList ?? [], cursors.values ?? null),
        relations: connection(entity?.relationsList ?? [], cursors.relations ?? null),
      },
    }),
  };
}

function mockPage(field: 'values' | 'relations', nodes: unknown[], endCursor: string | null = null) {
  return { ok: true, json: async () => ({ data: { [field]: connection(nodes, endCursor) } }) };
}

describe('deleteEntity', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const entityId = Id('5cade5757ecd41ae83481b22ffc2f94e');
  const spaceId = Id('a1b2c3d4e5f647889012345678901234');
  const propertyId = Id('fa269fd3de9849cf90c44235d905a67c');
  const propertyId2 = Id('ab369fd3de9849cf90c44235d905a67c');
  const relationId = Id('b2c3d4e5f6a748899012345678901234');
  const relationId2 = Id('d4e5f6a7b8c948899012345678901234');

  it('should create unset ops for entity values', async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        valuesList: [{ propertyId: propertyId, spaceId }],
        relationsList: [],
      }),
    );

    const result = await deleteEntity({ id: entityId, spaceId });

    expect(result.id).toBe(entityId);
    expect(result.ops).toHaveLength(1);
    expect(result.ops[0]).toMatchObject({
      type: 'updateEntity',
      id: toGrcId(entityId),
    });
  });

  it('should create delete ops for entity relations', async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        valuesList: [],
        relationsList: [{ id: relationId, spaceId }],
      }),
    );

    const result = await deleteEntity({ id: entityId, spaceId });

    expect(result.ops).toHaveLength(1);
    expect(result.ops[0]).toMatchObject({
      type: 'deleteRelation',
      id: toGrcId(relationId),
    });
  });

  it('should create both unset and delete ops', async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        valuesList: [
          { propertyId: propertyId, spaceId },
          { propertyId: propertyId2, spaceId },
        ],
        relationsList: [
          { id: relationId, spaceId },
          { id: relationId2, spaceId },
        ],
      }),
    );

    const result = await deleteEntity({ id: entityId, spaceId });

    expect(result.ops).toHaveLength(3); // 1 updateEntity + 2 deleteRelation
    expect(result.ops[0]).toMatchObject({ type: 'updateEntity' });
    expect(result.ops[1]).toMatchObject({ type: 'deleteRelation', id: toGrcId(relationId) });
    expect(result.ops[2]).toMatchObject({ type: 'deleteRelation', id: toGrcId(relationId2) });
  });

  it('should only include values and relations matching the spaceId', async () => {
    const otherSpaceId = Id('c3d4e5f6a7b848899012345678901234');

    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        valuesList: [
          { propertyId: propertyId, spaceId },
          { propertyId: propertyId2, spaceId: otherSpaceId },
        ],
        relationsList: [
          { id: relationId, spaceId },
          { id: relationId2, spaceId: otherSpaceId },
        ],
      }),
    );

    const result = await deleteEntity({ id: entityId, spaceId });

    expect(result.ops).toHaveLength(2); // 1 updateEntity + 1 deleteRelation
    expect(result.ops[0]).toMatchObject({ type: 'updateEntity' });
    expect(result.ops[1]).toMatchObject({ type: 'deleteRelation', id: toGrcId(relationId) });
  });

  it('should match when spaceId is passed with dashes', async () => {
    const dashlessSpaceId = 'a1b2c3d4e5f647889012345678901234';
    const dashedSpaceId = Id('a1b2c3d4-e5f6-4788-9012-345678901234');

    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        valuesList: [{ propertyId: propertyId, spaceId: dashlessSpaceId }],
        relationsList: [{ id: relationId, spaceId: dashlessSpaceId }],
      }),
    );

    const result = await deleteEntity({ id: entityId, spaceId: dashedSpaceId });

    expect(result.ops).toHaveLength(2);
    expect(result.ops[0]).toMatchObject({ type: 'updateEntity' });
    expect(result.ops[1]).toMatchObject({ type: 'deleteRelation', id: toGrcId(relationId) });
  });

  it('should delete every relation and unset every value when there are more than 1000 in the space', async () => {
    const ids = (count: number, offset: number, tail: string) =>
      Array.from({ length: count }, (_, i) => `${(offset + i).toString(16).padStart(8, '0')}${tail}`);
    const relationIds = ids(1300, 0, 'aaaa4aaa8aaaaaaaaaaaaaaa');
    const propertyIds = ids(1100, 0, 'bbbb4bbb8bbbbbbbbbbbbbbb');

    mockFetch
      .mockResolvedValueOnce(
        mockGraphQLResponse(
          {
            valuesList: propertyIds.slice(0, 1000).map(propertyId => ({ propertyId, spaceId })),
            relationsList: relationIds.slice(0, 1000).map(id => ({ id, spaceId })),
          },
          { values: 'values-1', relations: 'relations-1' },
        ),
      )
      .mockResolvedValueOnce(
        mockPage(
          'values',
          propertyIds.slice(1000).map(propertyId => ({ propertyId, spaceId })),
        ),
      )
      .mockResolvedValueOnce(
        mockPage(
          'relations',
          relationIds.slice(1000).map(id => ({ id, spaceId })),
        ),
      );

    const result = await deleteEntity({ id: entityId, spaceId });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    const bodies = mockFetch.mock.calls.map(call => JSON.parse(String(call[1]?.body)).query as string);
    expect(bodies[1]).toContain('after: "values-1"');
    expect(bodies[2]).toContain('after: "relations-1"');

    const unset = result.ops.find(op => op.type === 'updateEntity') as { unset: unknown[] } | undefined;
    expect(unset?.unset).toHaveLength(1100);
    expect(result.ops.filter(op => op.type === 'deleteRelation')).toHaveLength(1300);
  });

  it('should return empty ops when entity is not found', async () => {
    mockFetch.mockResolvedValueOnce(mockGraphQLResponse(null));

    const result = await deleteEntity({ id: entityId, spaceId });

    expect(result.id).toBe(entityId);
    expect(result.ops).toHaveLength(0);
  });

  it('should return empty ops when entity has no values or relations', async () => {
    mockFetch.mockResolvedValueOnce(mockGraphQLResponse({ valuesList: [], relationsList: [] }));

    const result = await deleteEntity({ id: entityId, spaceId });

    expect(result.ops).toHaveLength(0);
  });

  it('should throw an error when entity ID is invalid', async () => {
    await expect(deleteEntity({ id: 'invalid-id', spaceId })).rejects.toThrow('Invalid id: "invalid-id"');
  });

  it('should throw an error when space ID is invalid', async () => {
    await expect(deleteEntity({ id: entityId, spaceId: 'invalid-space' })).rejects.toThrow(
      'Invalid id: "invalid-space"',
    );
  });

  it('should call the correct GraphQL endpoint', async () => {
    mockFetch.mockResolvedValueOnce(mockGraphQLResponse(null));

    await deleteEntity({ id: entityId, spaceId });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api-testnet.geobrowser.io/graphql',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('should throw when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(deleteEntity({ id: entityId, spaceId })).rejects.toThrow(/Could not fetch entity data/);
  });

  it('should throw when response parsing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(deleteEntity({ id: entityId, spaceId })).rejects.toThrow(/Could not parse GraphQL response/);
  });

  it('should throw when GraphQL returns errors without data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errors: [{ message: 'Resolver failed' }] }),
    });

    await expect(deleteEntity({ id: entityId, spaceId })).rejects.toThrow(/GraphQL request returned errors/);
  });
});
