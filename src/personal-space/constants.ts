import { keccak256, toHex } from 'viem';

export const EDITS_PUBLISHED = keccak256(toHex('GOVERNANCE.EDITS_PUBLISHED'));
export const EMPTY_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
export const EMPTY_SIGNATURE = '0x' as const;
