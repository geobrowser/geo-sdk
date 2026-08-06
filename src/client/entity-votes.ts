import type { Id } from '../id.js';
import { assertValid } from '../id-utils.js';
import type { GeoClientContext } from './context.js';
import * as Responses from './responses.js';

/** @deprecated Use `ClientResponseParams` from the canonical response helpers. */
export type ClientEntityVoteParams = Responses.ClientResponseParams;

/** @deprecated Use `ResponseCalldataParams` from the canonical response helpers. */
export type EntityVoteCalldataParams = Responses.ResponseCalldataParams;

function validateEntityVoteId(id: Id | string, sourceHint: string) {
  const normalized = id.startsWith('0x') ? id.slice(2) : id.replaceAll('-', '');
  assertValid(normalized, sourceHint);
}

function validateEntityVoteParams(params: ClientEntityVoteParams) {
  validateEntityVoteId(params.authorSpaceId, '`authorSpaceId` in entity vote');
  validateEntityVoteId(params.spaceId, '`spaceId` in entity vote');
  validateEntityVoteId(params.entityId, '`entityId` in entity vote');
}

/**
 * Encodes upvote calldata.
 *
 * @deprecated Use `geo.responses.upvote(...)` through `createGeoClient`.
 */
export function encodeUpvoteEntityCalldata(params: EntityVoteCalldataParams) {
  validateEntityVoteParams(params);
  return Responses.encodeUpvoteEntityResponseCalldata(params);
}

/**
 * Encodes downvote calldata.
 *
 * @deprecated Use `geo.responses.downvote(...)` through `createGeoClient`.
 */
export function encodeDownvoteEntityCalldata(params: EntityVoteCalldataParams) {
  validateEntityVoteParams(params);
  return Responses.encodeDownvoteEntityResponseCalldata(params);
}

/**
 * Encodes vote-withdrawal calldata.
 *
 * @deprecated Use `geo.responses.unvote(...)` through `createGeoClient`.
 */
export function encodeWithdrawEntityVoteCalldata(params: EntityVoteCalldataParams) {
  validateEntityVoteParams(params);
  return Responses.encodeUnvoteEntityResponseCalldata(params);
}

/**
 * Builds calldata for upvoting an entity using the configured space registry.
 *
 * @deprecated Use `geo.responses.upvote(...)`.
 */
export function upvote(context: GeoClientContext, params: ClientEntityVoteParams) {
  validateEntityVoteParams(params);
  return Responses.upvote(context, params);
}

/**
 * Builds calldata for downvoting an entity using the configured space registry.
 *
 * @deprecated Use `geo.responses.downvote(...)`.
 */
export function downvote(context: GeoClientContext, params: ClientEntityVoteParams) {
  validateEntityVoteParams(params);
  return Responses.downvote(context, params);
}

/**
 * Builds calldata for withdrawing an entity vote using the configured space registry.
 *
 * @deprecated Use `geo.responses.unvote(...)`.
 */
export function withdraw(context: GeoClientContext, params: ClientEntityVoteParams) {
  validateEntityVoteParams(params);
  return Responses.unvote(context, params);
}
