import type { CreateRelation, UpdateEntity } from '@geoprotocol/grc-20';
import { describe, expect, it, vi } from 'vitest';
import { createGeoClient } from '../client.js';
import { REPLY_TO_PROPERTY } from '../core/ids/system.js';
import { toGrcId } from '../id-utils.js';
import { defineGeoNetwork } from '../networks.js';

const ENTITY_ID = '3af3e22d21694a078681516710b7ecf1';
const SPACE_ID = 'd4bc2f205e2d415e971eb0b9fbf6b6fc';
const COMMENT_A_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ROOT_ENTITY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const ROOT_SPACE_ID = 'cccccccccccccccccccccccccccccccc';
const PROPERTY_ID = 'dddddddddddddddddddddddddddddddd';
const RELATION_ID = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

function customNetwork() {
  return defineGeoNetwork({
    id: 'LOCAL',
    name: 'Local Geo',
    apiOrigin: 'http://localhost:3000',
  });
}

function replyToRelations(ops: Array<{ type: string }>) {
  return ops.filter(
    (op): op is CreateRelation =>
      op.type === 'createRelation' &&
      (op as CreateRelation).relationType.every((byte, index) => byte === toGrcId(REPLY_TO_PROPERTY)[index]),
  );
}

describe('geo graph workflow clients', () => {
  it('creates comment reply chains from fetched parent context', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            entity: {
              relationsList: [
                {
                  toEntity: { id: ROOT_ENTITY_ID },
                  toSpace: { id: ROOT_SPACE_ID },
                  position: 'a1',
                },
                {
                  toEntity: { id: COMMENT_A_ID },
                  toSpace: { id: SPACE_ID },
                  position: 'a0',
                },
              ],
            },
          },
        }),
      ),
    );
    const geo = createGeoClient({ network: customNetwork(), fetch });

    const result = await geo.comments.create({
      id: 'ffffffffffffffffffffffffffffffff',
      content: 'Deep reply',
      replyTo: { entityId: ENTITY_ID, spaceId: SPACE_ID },
    });
    const relations = replyToRelations(result.ops);

    expect(relations).toHaveLength(3);
    expect(relations[0]?.to).toEqual(toGrcId(ENTITY_ID));
    expect(relations[1]?.to).toEqual(toGrcId(COMMENT_A_ID));
    expect(relations[2]?.to).toEqual(toGrcId(ROOT_ENTITY_ID));
    expect(relations[0]?.toSpace).toEqual(toGrcId(SPACE_ID));
    expect(relations[2]?.toSpace).toEqual(toGrcId(ROOT_SPACE_ID));
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/graphql', expect.objectContaining({ method: 'POST' }));
  });

  it('deletes an entity using fetched values and relations for the requested space', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            entity: {
              valuesList: [
                { propertyId: PROPERTY_ID, spaceId: SPACE_ID },
                { propertyId: PROPERTY_ID, spaceId: SPACE_ID },
                { propertyId: ROOT_ENTITY_ID, spaceId: ROOT_SPACE_ID },
              ],
              relationsList: [
                { id: RELATION_ID, spaceId: SPACE_ID },
                { id: COMMENT_A_ID, spaceId: ROOT_SPACE_ID },
              ],
            },
          },
        }),
      ),
    );
    const geo = createGeoClient({ network: customNetwork(), fetch });

    const result = await geo.entities.delete({ id: ENTITY_ID, spaceId: SPACE_ID });

    expect(result.id).toBe(ENTITY_ID);
    expect(result.ops.map(op => op.type)).toEqual(['updateEntity', 'deleteRelation']);
    expect((result.ops[0] as UpdateEntity).unset).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/graphql', expect.objectContaining({ method: 'POST' }));
  });
});
