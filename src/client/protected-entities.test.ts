import { describe, expect, it } from 'vitest';
import { AVATAR_PROPERTY } from '../core/ids/content.js';
import { COVER_PROPERTY } from '../core/ids/system.js';
import { Id } from '../id.js';
import {
  anchoredEntityIds,
  assertNotAnchored,
  ProtectedEntityError,
  type SpaceAnchorsResponse,
  spaceAnchorsQueryField,
} from './protected-entities.js';

const spaceId = Id('a1b2c3d4e5f647889012345678901234');
const pageId = Id('ba886bf1e1b84703be7f99d57cfc35e6');
const avatarId = Id('b00b403b8afb46dead3c3860b5c647e7');
const coverId = Id('0c88fcee71f740b2929fcff5507aafda');
const contentId = Id('5cade5757ecd41ae83481b22ffc2f94e');

function space(relations: Array<{ typeId: string; toEntityId: string }> = []): SpaceAnchorsResponse {
  return { page: { id: pageId, relationsList: relations } };
}

const avatarRelation = { typeId: String(AVATAR_PROPERTY), toEntityId: String(avatarId) };
const coverRelation = { typeId: String(COVER_PROPERTY), toEntityId: String(coverId) };

describe('anchoredEntityIds', () => {
  it('should anchor the space home entity', () => {
    expect(anchoredEntityIds(space()).get(pageId)).toBe('page');
  });

  it('should anchor the avatar and cover images the home entity points at', () => {
    const anchors = anchoredEntityIds(space([avatarRelation, coverRelation]));

    expect(anchors.get(avatarId)).toBe('avatar');
    expect(anchors.get(coverId)).toBe('cover');
  });

  it('should not anchor ordinary content', () => {
    expect(anchoredEntityIds(space([avatarRelation])).has(contentId)).toBe(false);
  });

  it('should return no anchors when the space or its home entity is missing', () => {
    expect(anchoredEntityIds(undefined).size).toBe(0);
    expect(anchoredEntityIds(null).size).toBe(0);
    expect(anchoredEntityIds({ page: null }).size).toBe(0);
  });

  it('should keep the page reason when the home entity is also an anchor target', () => {
    const anchors = anchoredEntityIds(space([{ typeId: String(AVATAR_PROPERTY), toEntityId: String(pageId) }]));

    expect(anchors.get(pageId)).toBe('page');
  });

  it('should normalize dashed and uppercased ids', () => {
    const dashedPage = 'ba886bf1-e1b8-4703-be7f-99d57cfc35e6';
    const anchors = anchoredEntityIds({
      page: { id: dashedPage, relationsList: [{ ...avatarRelation, toEntityId: String(avatarId).toUpperCase() }] },
    });

    expect(anchors.get(pageId)).toBe('page');
    expect(anchors.get(avatarId)).toBe('avatar');
  });
});

describe('assertNotAnchored', () => {
  it('should allow deleting ordinary content', () => {
    expect(() =>
      assertNotAnchored({ id: contentId, spaceId, space: space([avatarRelation, coverRelation]) }),
    ).not.toThrow();
  });

  it('should refuse deleting the space home entity', () => {
    expect(() => assertNotAnchored({ id: pageId, spaceId, space: space() })).toThrow(ProtectedEntityError);
  });

  it('should refuse deleting the avatar image', () => {
    expect(() => assertNotAnchored({ id: avatarId, spaceId, space: space([avatarRelation]) })).toThrow(
      /avatar image of space/,
    );
  });

  it('should refuse deleting the cover image', () => {
    expect(() => assertNotAnchored({ id: coverId, spaceId, space: space([coverRelation]) })).toThrow(
      /cover image of space/,
    );
  });

  it('should refuse a dashed id that normalizes to an anchor', () => {
    expect(() => assertNotAnchored({ id: 'ba886bf1-e1b8-4703-be7f-99d57cfc35e6', spaceId, space: space() })).toThrow(
      ProtectedEntityError,
    );
  });

  it('should carry the entity, space and reason on the error', () => {
    try {
      assertNotAnchored({ id: avatarId, spaceId, space: space([avatarRelation]) });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ProtectedEntityError);
      expect(error).toMatchObject({ entityId: String(avatarId), spaceId: String(spaceId), reason: 'avatar' });
    }
  });

  it('should tell the caller how to override', () => {
    expect(() => assertNotAnchored({ id: pageId, spaceId, space: space() })).toThrow(/deleteAnchored: true/);
  });

  it('should allow the delete when deleteAnchored is set', () => {
    expect(() =>
      assertNotAnchored({ id: pageId, spaceId, space: space([avatarRelation]), deleteAnchored: true }),
    ).not.toThrow();
  });
});

describe('spaceAnchorsQueryField', () => {
  it('should query the space by its normalized id', () => {
    expect(spaceAnchorsQueryField('a1b2c3d4-e5f6-4788-9012-345678901234')).toContain(`space(id: "${spaceId}")`);
  });

  it('should request only the anchor relation properties', () => {
    const field = spaceAnchorsQueryField(spaceId);

    expect(field).toContain(String(AVATAR_PROPERTY));
    expect(field).toContain(String(COVER_PROPERTY));
  });
});
