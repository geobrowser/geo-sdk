import { AVATAR_PROPERTY } from '../core/ids/content.js';
import { COVER_PROPERTY } from '../core/ids/system.js';

/**
 * Relation properties whose target entities anchor a space's identity.
 *
 * The relations themselves live on the space's `page` entity, so their targets
 * are ordinary Image entities that nothing else marks as special — without this
 * list a caller iterating a space's entities cannot tell them apart from
 * content.
 */
export const ANCHOR_RELATION_PROPERTIES = [AVATAR_PROPERTY, COVER_PROPERTY] as const;

/** Why an entity is considered an anchor of its space. */
export type AnchorReason = 'page' | 'avatar' | 'cover';

const ANCHOR_DESCRIPTION: Record<AnchorReason, string> = {
  page: "the home entity of space %s, which holds the space's name, description and identity",
  avatar: 'the avatar image of space %s',
  cover: 'the cover image of space %s',
};

/**
 * Thrown when a delete would remove an entity that anchors a space's identity.
 *
 * Anchored entities are refused by default because deleting one destroys the
 * space itself rather than content in it, and the loss is not recoverable by
 * re-running the caller's script.
 */
export class ProtectedEntityError extends Error {
  readonly _tag = 'ProtectedEntityError';
  readonly entityId: string;
  readonly spaceId: string;
  readonly reason: AnchorReason;

  constructor(params: { entityId: string; spaceId: string; reason: AnchorReason }) {
    const what = ANCHOR_DESCRIPTION[params.reason].replace('%s', params.spaceId);
    super(
      `Refusing to delete ${params.entityId}: it is ${what}. ` + 'Pass `deleteAnchored: true` to delete it anyway.',
    );
    this.entityId = params.entityId;
    this.spaceId = params.spaceId;
    this.reason = params.reason;
  }
}

/** Shape of the `space` field {@link spaceAnchorsQueryField} adds to a query. */
export type SpaceAnchorsResponse = {
  page: {
    id: string;
    relationsList: Array<{ typeId: string; toEntityId: string }>;
  } | null;
} | null;

function normalizeId(value: string): string {
  return value.replaceAll('-', '').toLowerCase();
}

/**
 * Builds the `space` selection that resolves a space's anchored entities.
 *
 * Callers embed this in a query they are already making so the guard costs no
 * extra round-trip.
 *
 * @param spaceId Space whose anchors should be resolved.
 * @returns A GraphQL field selection, to be inlined in a query body.
 */
export function spaceAnchorsQueryField(spaceId: string): string {
  const anchorProperties = JSON.stringify(ANCHOR_RELATION_PROPERTIES.map(String));

  return `space(id: ${JSON.stringify(normalizeId(spaceId))}) {
      page {
        id
        relationsList(filter: { typeId: { in: ${anchorProperties} } }) {
          typeId
          toEntityId
        }
      }
    }`;
}

/**
 * Resolves the entities that anchor a space's identity, keyed by normalized id.
 *
 * @param space The `space` payload returned for {@link spaceAnchorsQueryField}.
 * @returns Anchored entity ids mapped to why each one is anchored.
 */
export function anchoredEntityIds(space: SpaceAnchorsResponse | undefined): Map<string, AnchorReason> {
  const anchors = new Map<string, AnchorReason>();
  if (!space?.page) {
    return anchors;
  }

  anchors.set(normalizeId(space.page.id), 'page');

  for (const relation of space.page.relationsList ?? []) {
    const reason: AnchorReason = normalizeId(relation.typeId) === String(AVATAR_PROPERTY) ? 'avatar' : 'cover';
    const target = normalizeId(relation.toEntityId);
    // The page entity being its own avatar target is nonsensical, but if it
    // happens the stronger `page` reason must win.
    if (!anchors.has(target)) {
      anchors.set(target, reason);
    }
  }

  return anchors;
}

/**
 * Refuses a delete that would remove one of the space's anchored entities.
 *
 * @param params Entity and space being deleted, the resolved `space` payload, and the override flag.
 * @throws {ProtectedEntityError} When the entity is anchored and `deleteAnchored` is not set.
 */
export function assertNotAnchored(params: {
  id: string;
  spaceId: string;
  space: SpaceAnchorsResponse | undefined;
  deleteAnchored?: boolean;
}): void {
  if (params.deleteAnchored) {
    return;
  }

  const reason = anchoredEntityIds(params.space).get(normalizeId(params.id));
  if (!reason) {
    return;
  }

  throw new ProtectedEntityError({ entityId: params.id, spaceId: params.spaceId, reason });
}
