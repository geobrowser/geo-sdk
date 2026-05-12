import { encodeEdit, type Edit as GrcEdit, type Op, randomId } from '@geoprotocol/grc-20';
import { Micro } from 'effect';
import { gzipSync } from 'fflate';
import { imageSize } from 'image-size';
import type { FetchLike } from './client/context.js';
import type { Id } from './id.js';
import { assertValid, fromBytes, toGrcId } from './id-utils.js';

class IpfsUploadError extends Error {
  readonly _tag = 'IpfsUploadError';
}

export type PublishEditParams = {
  name: string;
  ops: Op[];
  /** The author's personal space ID. Used as the `authors` field in the GRC-20 Edit message. */
  author: Id | string;
};

export type PublishEditResult = {
  cid: `ipfs://${string}`;
  editId: Id;
};

export type PublishImageParams =
  | {
      blob: Blob;
    }
  | {
      url: string;
    };

function isIpfsUri(value: unknown): value is `ipfs://${string}` {
  return typeof value === 'string' && /^ipfs:\/\/.+/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

async function readCidResponse(response: Response, operation: string): Promise<`ipfs://${string}`> {
  if (!responseOk(response)) {
    throw new IpfsUploadError(`${operation} failed: ${await responseErrorMessage(response)}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new IpfsUploadError(`Could not parse response from IPFS: ${error}`);
  }

  const cid = isRecord(json) ? json.cid : undefined;
  if (!isIpfsUri(cid)) {
    throw new IpfsUploadError(`${operation} returned an invalid IPFS CID`);
  }

  return cid;
}

export async function publishEditCore({
  name,
  ops,
  author,
  apiOrigin,
  fetch: fetchFn,
}: PublishEditParams & { apiOrigin: string; fetch: FetchLike }): Promise<PublishEditResult> {
  if (ops.length === 0) {
    throw new Error('`ops` in `publishEdit` must not be empty');
  }

  assertValid(author, '`author` in `publishEdit`');

  const editId = randomId();
  const grcEdit: GrcEdit = {
    id: editId,
    name,
    authors: [toGrcId(author)],
    createdAt: BigInt(Date.now()) * 1000n,
    ops,
  };

  const binary = encodeEdit(grcEdit);

  const MAX_EDIT_SIZE = 10 * 1024 * 1024;
  if (binary.byteLength > MAX_EDIT_SIZE) {
    throw new Error(
      `Edit size (${(binary.byteLength / 1024 / 1024).toFixed(2)}MB) exceeds the ${MAX_EDIT_SIZE / 1024 / 1024}MB limit. Reduce the number of ops or split into multiple edits.`,
    );
  }

  const binaryArray = new Uint8Array(binary);
  const blob = new Blob([binaryArray], { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.append('file', blob);

  const cid = await Micro.runPromise(uploadBinary({ formData, apiOrigin, fetch: fetchFn }));
  const editIdString = fromBytes(editId);

  return { cid, editId: editIdString };
}

export async function uploadImageCore(
  params: PublishImageParams & { apiOrigin: string; fetch: FetchLike; alternativeGateway?: boolean },
) {
  const formData = new FormData();
  let blob: Blob;
  if ('blob' in params) {
    blob = params.blob;
  } else {
    let response: Response;
    try {
      response = await params.fetch(params.url);
    } catch (error) {
      throw new IpfsUploadError(`Could not fetch image from ${params.url}: ${error}`);
    }
    if (!responseOk(response)) {
      throw new IpfsUploadError(`Could not fetch image from ${params.url}: ${await responseErrorMessage(response)}`);
    }
    blob = await response.blob();
  }

  formData.append('file', blob);

  const buffer = new Uint8Array(await blob.arrayBuffer());
  let dimensions: { width: number; height: number } | undefined;
  try {
    dimensions = imageSize(buffer);
  } catch (_error) {}

  const cid = await Micro.runPromise(
    uploadFile({
      formData,
      apiOrigin: params.apiOrigin,
      fetch: params.fetch,
      alternativeGateway: params.alternativeGateway,
    }),
  );

  if (dimensions) {
    return {
      cid,
      dimensions: {
        width: dimensions.width,
        height: dimensions.height,
      },
    };
  }

  return { cid };
}

export async function uploadCSVCore({
  csvString,
  apiOrigin,
  fetch: fetchFn,
}: {
  csvString: string;
  apiOrigin: string;
  fetch: FetchLike;
}): Promise<`ipfs://${string}`> {
  const encoder = new TextEncoder();
  const csvStringBytes = encoder.encode(csvString);
  const blob = await gzipSync(csvStringBytes);

  const formData = new FormData();
  // @ts-expect-error - this is a type mismatch which is fine
  formData.append('file', new Blob([blob], { type: 'text/csv' }));

  return await Micro.runPromise(uploadBinary({ formData, apiOrigin, fetch: fetchFn }));
}

function uploadBinary({
  formData,
  apiOrigin,
  fetch: fetchFn,
}: {
  formData: FormData;
  apiOrigin: string;
  fetch: FetchLike;
}) {
  return Micro.gen(function* () {
    const result = yield* Micro.tryPromise({
      try: () =>
        fetchFn(`${apiOrigin}/ipfs/upload-edit`, {
          method: 'POST',
          body: formData,
        }),
      catch: error => new IpfsUploadError(`Could not upload data to IPFS: ${error}`),
    });

    const cid = yield* Micro.tryPromise({
      try: () => readCidResponse(result, 'IPFS edit upload'),
      catch: error => (error instanceof IpfsUploadError ? error : new IpfsUploadError(String(error))),
    });

    return cid;
  });
}

function uploadFile({
  formData,
  apiOrigin,
  fetch: fetchFn,
  alternativeGateway,
}: {
  formData: FormData;
  apiOrigin: string;
  fetch: FetchLike;
  alternativeGateway?: boolean;
}) {
  return Micro.gen(function* () {
    const path = alternativeGateway ? '/ipfs/upload-file-alternative-gateway' : '/ipfs/upload-file';

    const result = yield* Micro.tryPromise({
      try: () =>
        fetchFn(`${apiOrigin}${path}`, {
          method: 'POST',
          body: formData,
        }),
      catch: error => new IpfsUploadError(`Could not upload file to IPFS: ${error}`),
    });

    const cid = yield* Micro.tryPromise({
      try: () => readCidResponse(result, 'IPFS file upload'),
      catch: error => (error instanceof IpfsUploadError ? error : new IpfsUploadError(String(error))),
    });

    return cid;
  });
}
