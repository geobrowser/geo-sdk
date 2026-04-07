import { Micro } from 'effect';
import { COMMENT_TYPE } from '../core/ids/content.js';
import { MARKDOWN_CONTENT, REPLY_TO_PROPERTY, RESOLVED_PROPERTY } from '../core/ids/system.js';
import { Id } from '../id.js';
import { assertValid, generate } from '../id-utils.js';
import type { CreateCommentParams, CreateResult, Network } from '../types.js';
import { deriveCommentName } from './comment-utils.js';
import { getApiOrigin } from './constants.js';
import { createEntity } from './create-entity.js';

class CreateCommentError extends Error {
  readonly _tag = 'CreateCommentError';
}

type EntityRelationsResponse = {
  data: {
    entity: {
      relationsList: Array<{
        toEntity: { id: string };
        toSpace: { id: string } | null;
      }>;
    } | null;
  };
};

type ReplyTo = {
  entityId: string;
  spaceId: string;
};

async function fetchReplyToRelations(entityId: Id | string, network: Network): Promise<Array<ReplyTo>> {
  const query = `query entity {
    entity(id: "${entityId}") {
      relationsList(filter: { typeId: { in: ["${REPLY_TO_PROPERTY}"] } }) {
        toEntity { id }
        toSpace { id }
      }
    }
  }`;

  const fetchData = Micro.gen(function* () {
    const result = yield* Micro.tryPromise({
      try: () =>
        fetch(`${getApiOrigin(network)}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        }),
      catch: error => new CreateCommentError(`Could not fetch entity data for ${entityId}: ${error}`),
    });

    const json = yield* Micro.tryPromise({
      try: () => result.json() as Promise<EntityRelationsResponse>,
      catch: error => new CreateCommentError(`Could not parse GraphQL response for entity ${entityId}: ${error}`),
    });

    return json;
  });

  const response = await Micro.runPromise(fetchData);

  if (!response.data?.entity) {
    return [];
  }

  return response.data.entity.relationsList
    .filter((r): r is typeof r & { toSpace: { id: string } } => r.toSpace !== null)
    .map(r => ({
      entityId: r.toEntity.id,
      spaceId: r.toSpace.id,
    }));
}

/**
 * Creates a comment entity. Content can be plain text or markdown.
 *
 * When replying to a root entity (no existing reply-to relations), creates 1 reply-to relation.
 * When replying to a comment that has already been published on the Knowledge Graph, carries
 * forward all of the parent's reply-to relations and adds the parent itself, accumulating the
 * full ancestor chain. The parent comment must be published before creating a reply so that its
 * reply-to relations can be fetched.
 *
 * @example
 * ```ts
 * import { Graph } from '@geoprotocol/geo-sdk';
 *
 * const { id, ops } = await Graph.createComment({
 *   content: 'I agree with this.',
 *   replyTo: { entityId: someId, spaceId: spaceId },
 *   resolved: false, // optional, defaults to false
 * });
 * ```
 *
 * @param params – {@link CreateCommentParams}
 * @returns – {@link CreateResult}
 */
export const createComment = async ({
  id: providedId,
  content,
  replyTo,
  resolved = false,
  network = 'TESTNET',
}: CreateCommentParams): Promise<CreateResult> => {
  if (providedId) assertValid(providedId, '`id` in `createComment`');
  assertValid(replyTo.entityId, '`replyTo.entityId` in `createComment`');
  assertValid(replyTo.spaceId, '`replyTo.spaceId` in `createComment`');

  const id = providedId ?? generate();
  const name = deriveCommentName(content);

  // Fetch existing reply-to relations from the target entity.
  // If the target has no reply-to relations, it is a root entity — use it directly.
  // If the target has reply-to relations, it is a comment — carry forward all
  // of the parent's reply-tos and add the parent itself. This accumulates the
  // full ancestor chain at any depth.
  const existingReplyTos = await fetchReplyToRelations(replyTo.entityId, network);

  const replyToTargets: Array<{ toEntity: Id | string; toSpace: Id | string }> = [];

  if (existingReplyTos.length > 0) {
    // Target is a comment. Carry forward all its reply-to relations.
    for (const existing of existingReplyTos) {
      replyToTargets.push({ toEntity: existing.entityId, toSpace: existing.spaceId });
    }
    // Add the direct parent comment
    replyToTargets.push({ toEntity: replyTo.entityId, toSpace: replyTo.spaceId });
  } else {
    // Target is a root entity
    replyToTargets.push({ toEntity: replyTo.entityId, toSpace: replyTo.spaceId });
  }

  const replyToRelations: Record<string, Array<{ toEntity: Id | string; toSpace: Id | string }>> = {
    [REPLY_TO_PROPERTY]: replyToTargets,
  };

  const { ops } = createEntity({
    id,
    name,
    types: [COMMENT_TYPE],
    values: [
      {
        property: MARKDOWN_CONTENT,
        type: 'text',
        value: content,
      },
      {
        property: RESOLVED_PROPERTY,
        type: 'boolean',
        value: resolved,
      },
    ],
    relations: replyToRelations,
  });

  return { id: Id(id), ops };
};
