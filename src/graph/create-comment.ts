import { Micro } from 'effect';
import { COMMENT_TYPE } from '../core/ids/content.js';
import { MARKDOWN_CONTENT, REPLY_TO_PROPERTY, RESOLVED_PROPERTY } from '../core/ids/system.js';
import { Id } from '../id.js';
import { assertValid, generate } from '../id-utils.js';
import type { CreateCommentParams, CreateResult, Network } from '../types.js';
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

/**
 * Strips markdown syntax and returns the first 20 characters for use as the comment name.
 */
function deriveCommentName(content: string): string {
  const stripped = content
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/__(.+?)__/g, '$1') // bold (underscore)
    .replace(/_(.+?)_/g, '$1') // italic (underscore)
    .replace(/~~(.+?)~~/g, '$1') // strikethrough
    .replace(/`(.+?)`/g, '$1') // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/!\[.*?\]\(.+?\)/g, '') // images
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/^[-*+]\s+/gm, '') // unordered lists
    .replace(/^\d+\.\s+/gm, '') // ordered lists
    .replace(/---/g, '') // horizontal rules
    .replace(/\n+/g, ' ') // newlines to spaces
    .trim();

  return stripped.slice(0, 20);
}

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
 * When replying to a comment (has existing reply-to relations), creates 2 reply-to relations:
 * the root entity and the direct parent comment.
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
  // If the target has reply-to relations, it is a comment — find the root
  // entity (the non-comment target with no reply-tos) and create exactly
  // 2 relations: root entity + direct parent comment.
  const existingReplyTos = await fetchReplyToRelations(replyTo.entityId, network);

  const replyToTargets: Array<{ toEntity: Id | string; toSpace: Id | string }> = [];

  if (existingReplyTos.length > 0) {
    // Target is a comment. Find the root entity by checking which
    // of the target's reply-tos has no reply-to relations itself.
    for (const candidate of existingReplyTos) {
      const candidateReplyTos = await fetchReplyToRelations(candidate.entityId, network);
      if (candidateReplyTos.length === 0) {
        replyToTargets.push({ toEntity: candidate.entityId, toSpace: candidate.spaceId });
        break;
      }
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
