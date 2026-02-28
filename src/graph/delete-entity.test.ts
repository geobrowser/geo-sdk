import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Id } from '../id.js';
import { toGrcId } from '../id-utils.js';
import { deleteEntity } from './delete-entity.js';

function mockGraphQLResponse(
  entity: {
    valuesList: Array<{ propertyId: string; spaceId: string }>;
    relationsList: Array<{ id: string; spaceId: string }>;
  } | null,
) {
  return {
    ok: true,
    json: async () => ({ data: { entity } }),
  };
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
      'https://testnet-api.geobrowser.io/graphql',
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
});
