import type { GeoClientContext } from './context.js';
import { requireFetch } from './context.js';

class GeoApiError extends Error {
  readonly _tag = 'GeoApiError';
}

export type GraphQlResponse<T> = {
  data?: T;
  errors?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHex(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]*$/.test(value);
}

function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

async function responseErrorMessage(response: Response): Promise<string> {
  let body = '';
  try {
    body = await response.text();
  } catch (_error) {}

  const status = `${response.status} ${response.statusText}`.trim();
  return body ? `${status}: ${body}` : status;
}

function responseOk(response: Response): boolean {
  if (typeof response.ok === 'boolean') return response.ok;
  if (typeof response.status === 'number') return response.status >= 200 && response.status < 300;
  return true;
}

export async function graphqlRequest<T>(context: GeoClientContext, query: string): Promise<GraphQlResponse<T>> {
  const fetchFn = requireFetch(context, 'GraphQL requests');
  let result: Response;
  try {
    result = await fetchFn(`${context.network.apiOrigin}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch (error) {
    throw new GeoApiError(`Could not fetch GraphQL data: ${error}`);
  }

  if (!responseOk(result)) {
    throw new GeoApiError(`GraphQL request failed: ${await responseErrorMessage(result)}`);
  }

  let response: unknown;
  try {
    response = await result.json();
  } catch (error) {
    throw new GeoApiError(`Could not parse GraphQL response: ${error}`);
  }

  if (!isRecord(response)) {
    throw new GeoApiError('GraphQL response must be an object');
  }

  return response as GraphQlResponse<T>;
}

export async function graphqlData<T>(context: GeoClientContext, query: string): Promise<T> {
  const response = await graphqlRequest<T>(context, query);
  if (response.errors) {
    throw new GeoApiError(`GraphQL request returned errors: ${JSON.stringify(response.errors)}`);
  }
  if (response.data === undefined) {
    throw new GeoApiError('GraphQL response did not include data');
  }

  return response.data;
}

export async function getEditCalldata(context: GeoClientContext, params: { spaceId: string; cid: string }) {
  const fetchFn = requireFetch(context, 'Edit calldata requests');
  let result: Response;
  try {
    result = await fetchFn(`${context.network.apiOrigin}/space/${params.spaceId}/edit/calldata`, {
      method: 'POST',
      body: JSON.stringify({ cid: params.cid }),
    });
  } catch (error) {
    throw new GeoApiError(`Could not get edit calldata from space ${params.spaceId}: ${error}`);
  }

  if (!responseOk(result)) {
    throw new GeoApiError(
      `Could not get edit calldata from space ${params.spaceId}: ${await responseErrorMessage(result)}`,
    );
  }

  let response: unknown;
  try {
    response = await result.json();
  } catch (error) {
    throw new GeoApiError(
      `Could not parse response from API when getting calldata for space ${params.spaceId}: ${error}`,
    );
  }

  if (!isRecord(response) || !isAddress(response.to) || !isHex(response.data)) {
    throw new GeoApiError(`Malformed edit calldata response for space ${params.spaceId}`);
  }

  return {
    to: response.to,
    data: response.data,
  };
}
