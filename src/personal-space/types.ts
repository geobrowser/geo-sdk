import type { Op } from '@geoprotocol/grc-20';
import type { Id } from '../id.js';
import type { Network } from '../types.js';

export type CreateSpaceResult = {
  to: `0x${string}`;
  calldata: `0x${string}`;
};

export type PublishEditParams = {
  name: string;
  spaceId: Id | string;
  ops: Op[];
  author: `0x${string}`;
  network?: Network;
};

export type PublishEditResult = {
  editId: Id;
  cid: string;
  to: `0x${string}`;
  calldata: `0x${string}`;
};
