import { Brand } from 'effect';

/**
 * A globally unique knowledge graph identifier.
 *
 * Canonical form is a UUID v4 **without dashes** (32 hex chars).
 * For compatibility, UUIDs **with dashes** are also accepted anywhere an `Id` is validated.
 */
export type Id = string & Brand.Brand<'Id'>;

export const Id = Brand.refined<Id>(
  id => isValid(id),
  id => Brand.error(`Expected ${id} to be a valid Id`),
);

const UUID_DASHED_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const UUID_DASHLESS_REGEX = /^[0-9a-fA-F]{32}$/;

export function isValid(id: string): boolean {
  return UUID_DASHED_REGEX.test(id) || UUID_DASHLESS_REGEX.test(id);
}
