import type { Op } from '@geoprotocol/grc-20';
import type { Id } from '../id.js';
import type { Network, Networkish } from '../types.js';

export type CreateSpaceParams = {
  network?: Networkish;
};

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
