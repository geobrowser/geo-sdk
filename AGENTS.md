# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

This is `@geoprotocol/geo-sdk`, a TypeScript SDK for interacting with The Graph's Knowledge Graph. The SDK handles creating entities, properties, types, and relations, encoding them as ops, publishing to IPFS, and submitting transactions onchain.

## Commands

```bash
pnpm build          # Compile TypeScript to dist/
pnpm test           # Run all tests with Vitest
pnpm test -- -t "test name"  # Run a single test by name
pnpm lint           # Check linting with Biome
pnpm lint:fix       # Fix linting issues
```

## Architecture

### Data Flow
1. Create ops using `Graph.*` functions (e.g., `Graph.createEntity`, `Graph.createProperty`)
2. Publish ops to IPFS using `Ipfs.publishEdit` - this encodes ops into protobuf binary format
3. Get calldata for the space's governance contract
4. Submit transaction onchain using wallet client

## Code Conventions

- Use `.js` extensions in imports (ES modules)
- Kebab-case filenames (e.g., `create-entity.ts`)
- Test files co-located with source (e.g., `create-entity.test.ts`)
- Use `Id()` type wrapper for all entity/property/relation IDs
- Use `assertValid()` from `id-utils.js` for ID validation in functions
- 2-space indentation, single quotes, trailing commas
- Use Effect library's `Micro` for async error handling in IPFS operations

## Changesets

When making any user-facing change (features, bug fixes, refactors that affect the public API), create a changeset entry:

1. Create a new markdown file in `.changeset/` with a random kebab-case name (e.g., `.changeset/cool-dogs-fly.md`)
2. Use this format:
   ```markdown
   ---
   "@geoprotocol/geo-sdk": patch
   ---

   Short description of the change.
   ```
3. Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes
