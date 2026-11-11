/**
 * Page size for reading every row of a list from the Geo API.
 *
 * The API rejects `first` and `offset` above 1000, and when a list omits `first`
 * it silently applies a default of 100, so an unpaginated read drops every row
 * past the 100th. Reads that must see every row page through a connection with
 * cursors instead (cursors have no cap, unlike `offset`).
 */
export const CONNECTION_PAGE_SIZE = 1000;

export type ConnectionPage<T> = {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

/** The GraphQL fields every paged connection selects alongside its nodes. */
export const PAGE_INFO_FIELDS = `pageInfo {
        hasNextPage
        endCursor
      }`;

/** Connection arguments for one page: `first`, plus `after` once past the first page. */
export function pageArgs(after: string | null): string {
  return after === null
    ? `first: ${CONNECTION_PAGE_SIZE}`
    : `first: ${CONNECTION_PAGE_SIZE}, after: ${JSON.stringify(after)}`;
}

/**
 * Collects every node of a connection, starting from a first page the caller
 * already fetched and following cursors until the last page.
 *
 * @param firstPage The first page of the connection.
 * @param fetchNext Fetches the page after the given cursor.
 * @param fail Builds the caller's own error type when pagination can't continue.
 * @throws When a page reports more results but its cursor is missing or doesn't
 *   advance, rather than requesting the same page forever.
 */
export async function collectPages<T>(
  firstPage: ConnectionPage<T>,
  fetchNext: (after: string) => Promise<ConnectionPage<T>>,
  fail: (reason: string) => Error,
): Promise<T[]> {
  const nodes = [...firstPage.nodes];
  let page = firstPage;
  let after: string | null = null;

  while (page.pageInfo.hasNextPage) {
    const next = page.pageInfo.endCursor;
    if (!next || next === after) {
      throw fail('pagination cursor did not advance');
    }
    after = next;
    page = await fetchNext(next);
    nodes.push(...page.nodes);
  }

  return nodes;
}
