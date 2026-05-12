import type { GeoNetworkConfig } from '../types.js';

export type FetchLike = typeof fetch;

export type GeoClientContext = {
  network: GeoNetworkConfig;
  fetch?: FetchLike;
};

/**
 * Returns the fetch implementation for an operation that requires network access.
 *
 * Sync calldata helpers should not call this. Async helpers that upload files,
 * publish edits, or fetch graph context use it so missing fetch errors are
 * raised only when network access is actually required.
 *
 * @param context Client context passed to the helper.
 * @param operation Human-readable operation name used in the thrown error.
 * @returns The configured fetch implementation.
 * @throws When neither `context.fetch` nor `globalThis.fetch` is available.
 */
export function requireFetch(context: GeoClientContext, operation: string): FetchLike {
  const fetchFn = context.fetch ?? globalThis.fetch;
  if (!fetchFn) {
    throw new Error(`${operation} requires a fetch implementation`);
  }

  return fetchFn;
}
