import { keccak256, toHex } from 'viem';

/**
 * Action hash for GOVERNANCE.PROPOSAL_CREATED
 * Used when creating proposals via SpaceRegistry.enter()
 */
export const PROPOSAL_CREATED_ACTION = keccak256(toHex('GOVERNANCE.PROPOSAL_CREATED'));

/**
 * Empty topic (bytes32(0)) used for proposals
 */
export const EMPTY_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

/**
 * Empty signature used when msg.sender == fromSpace
 */
export const EMPTY_SIGNATURE = '0x' as const;

/**
 * Regex for bytes16 hex: 0x prefix + 32 hex characters (16 bytes)
 */
export const BYTES16_HEX_REGEX = /^0x[0-9a-fA-F]{32}$/;

/**
 * Regex for bytes32 hex: 0x prefix + 64 hex characters (32 bytes)
 */
export const BYTES32_HEX_REGEX = /^0x[0-9a-fA-F]{64}$/;

/**
 * Checks if a string is a valid bytes16 hex (0x prefix + 32 hex chars).
 */
export function isBytes16Hex(value: string): boolean {
  return BYTES16_HEX_REGEX.test(value);
}

/**
 * Converts a bytes32 hex string to bytes16 by taking the first 16 bytes.
 */
export function toBytes16(hex32: `0x${string}`): `0x${string}` {
  const s = hex32.toLowerCase();
  if (!BYTES32_HEX_REGEX.test(s)) throw new Error(`Invalid hex32: ${hex32}`);
  return `0x${s.slice(2, 34)}` as `0x${string}`;
}

/**
 * Converts a bytes16 hex string to bytes32 (left-aligned, right-padded with zeros).
 */
export function bytes16ToBytes32LeftAligned(bytes16Hex: `0x${string}`): `0x${string}` {
  const s = bytes16Hex.toLowerCase();
  if (!BYTES16_HEX_REGEX.test(s)) throw new Error(`Invalid bytes16 hex: ${bytes16Hex}`);
  return `0x${s.slice(2)}${'0'.repeat(32)}` as `0x${string}`;
}
