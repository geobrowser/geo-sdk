/**
 * This module provides utility functions for interacting with the default
 * IPFS gateway in TypeScript.
 *
 * @since 0.1.1
 */

import type { Op } from '@geoprotocol/grc-20';
import type { Id } from './id.js';
import { publishEditCore, uploadCSVCore, uploadImageCore } from './ipfs-core.js';
import { resolveGeoNetwork } from './networks.js';
import type { Network } from './types.js';

type PublishEditProposalParams = {
  name: string;
  ops: Op[];
  /** The author's personal space ID. Used as the `authors` field in the GRC-20 Edit message. */
  author: Id | string;
  network?: Network;
};

type PublishEditResult = {
  // IPFS CID representing the edit prefixed with `ipfs://`
  cid: string;
  // The ID of the edit
  editId: Id;
};

/**
 * Generates correct GRC-20 v2 binary encoding for an Edit and uploads it to IPFS.
 *
 * @deprecated Use `createGeoClient({ network }).edits.publish(...)`.
 */
export async function publishEdit(args: PublishEditProposalParams): Promise<PublishEditResult> {
  const { network = 'TESTNET', ...params } = args;
  const config = resolveGeoNetwork(network);
  return publishEditCore({
    ...params,
    apiOrigin: config.apiOrigin,
    fetch: globalThis.fetch,
  });
}

type PublishImageParams =
  | {
      blob: Blob;
    }
  | {
      url: string;
    };

/**
 * @deprecated Use `createGeoClient({ network }).storage.uploadImage(...)`.
 */
export async function uploadImage(params: PublishImageParams, network?: Network, alternativeGateway?: boolean) {
  const config = resolveGeoNetwork(network);
  return uploadImageCore({
    ...params,
    apiOrigin: config.apiOrigin,
    fetch: globalThis.fetch,
    alternativeGateway,
  });
}

/**
 * Uploads a CSV file to IPFS and returns the CID. This CSV
 * file will be compressed using gzip before being uploaded.
 *
 * @deprecated Use `createGeoClient({ network }).storage.uploadCSV(...)`.
 */
export async function uploadCSV(csvString: string, network?: Network): Promise<`ipfs://${string}`> {
  const config = resolveGeoNetwork(network);
  return uploadCSVCore({
    csvString,
    apiOrigin: config.apiOrigin,
    fetch: globalThis.fetch,
  });
}
