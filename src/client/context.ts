import type { GeoNetworkConfig } from '../types.js';

export type FetchLike = typeof fetch;

export type GeoClientContext = {
  network: GeoNetworkConfig;
  fetch?: FetchLike;
};

export function requireFetch(context: GeoClientContext, operation: string): FetchLike {
  const fetchFn = context.fetch ?? globalThis.fetch;
  if (!fetchFn) {
    throw new Error(`${operation} requires a fetch implementation`);
  }

  return fetchFn;
}
