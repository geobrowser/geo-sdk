import type { Op } from '@geoprotocol/grc-20';
import type { Id } from '../id.js';
import type { GeoSmartAccount, Network } from '../types.js';

export type CreateSpaceResult = {
  to: `0x${string}`;
  calldata: `0x${string}`;
};

export type PublishEditParams = {
  name: string;
  spaceId: Id | string;
  ops: Op[];
  /** The author's personal space ID. */
  author: Id | string;
  network?: Network;
};

export type PublishEditResult = {
  editId: Id;
  cid: string;
  to: `0x${string}`;
  calldata: `0x${string}`;
};

export type PublishAndSendParams = PublishEditParams & {
  /** Smart account wallet client used to send the transaction */
  wallet: GeoSmartAccount;
};

export type PublishAndSendResult = {
  /** The generated edit ID */
  editId: Id;
  /** The IPFS CID of the published edit */
  cid: string;
  /** Transaction hash */
  txHash: `0x${string}`;
};
