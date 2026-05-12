---
title: "feat: Introduce lightweight Ops API and configured Geo client"
type: feat
status: active
date: 2026-05-11
deepened: 2026-05-11
updated: 2026-05-12
---

# feat: Introduce lightweight Ops API and configured Geo client

## Summary

Introduce a lightweight-first public API where pure edit-op builders live under `Ops.*` and networked workflows live on a configured Geo client. Keep all legacy exports available for now, mark them deprecated, and route them through the new API/client while preserving the current contract payload semantics.

This release intentionally defers contract upgrades. TESTNET/custom-network configuration is added as API structure, but v2 contract behavior and local contract e2e coverage should ship in a later, separate release.

## Requirements

- R1. Expose pure GRC-20 edit-op builders under a small, discoverable `Ops` namespace with plural domain groups.
- R2. Move networked behavior behind `createGeoClient({ network })`, accepting the built-in TESTNET config or a custom network config.
- R3. Keep the lightweight import path explicit through `@geoprotocol/geo-sdk/ops` and avoid pulling storage/client helpers into that path.
- R4. Keep existing public exports and function names available for this release line.
- R5. Mark legacy public APIs deprecated and delegate them to the new `Ops` functions or configured client workflows where practical.
- R6. Preserve current legacy contract payload semantics. Do not introduce v2 contract calldata, voting settings, proposal versions, or local v2 e2e tests in this release.
- R7. Validate upload-backed workflows before creating IPFS side effects when validation can be done deterministically.
- R8. Documentation and migration examples must teach the new API first and describe legacy names as compatibility aliases.

## Scope Boundaries

- Do not remove legacy `Graph`, `Ipfs`, `daoSpace`, `personalSpace`, root encoding helpers, or wallet helper exports.
- Do not make root-level domain exports like `Entity.create` or `Type.create`; the chosen shape is `Ops.entities.create` and related grouped namespaces.
- Do not expose public `Ops.daoSpaces.*` or `Tx.daoSpaces.*` primitives in the first version; DAO space creation is a configured client workflow.
- Do not change DAO/personal-space/proposal/entity-vote calldata semantics in this API-only release.
- Do not add local v2 contract harness tests until the contract upgrade work starts.
- Do not redesign the underlying GRC-20 op format or ID utilities.

## Deferred Work

- Contract v2 upgrade: add new ABI/payload support, v2 voting settings, proposal version handling, and opt-in local contract e2e coverage in a dedicated follow-up release.
- Legacy API removal: remove deprecated compatibility exports in a later major version after migration guidance has shipped.
- Optional package split: evaluate separate core/client packages only if export and dependency isolation cannot meet lightweight import goals.
- Full local stack e2e: add indexer/GraphQL assertions after local fresh-chain event propagation is reliable.
- Smart-account wallet redesign: update wallet helper ergonomics after the core Ops/client split is stable.

## Key Decisions

- Prefer `Ops` over `Graph` for pure op builders: `Ops` makes it explicit that the namespace creates edit operations and does not perform network effects.
- Use plural nested groups under `Ops`: plural groups preserve autocomplete discovery without polluting the root namespace or creating one giant flat function bucket.
- Keep effectful convenience helpers on `geo`: configured client methods make network/API/contract dependencies visible and avoid passing config through pure functions.
- Treat DAO/personal-space creation and proposals as workflows, not public low-level transaction namespaces.
- Keep legacy APIs as compatibility adapters, but keep their observable contract payloads compatible with the current release.
- Keep sync legacy helpers sync. A configured client must not require `fetch` just to encode calldata.

## Implementation Units

### U1. Network Configuration

- Add `GeoTestnetConfig`, `defineGeoNetworkConfig`, and `resolveGeoNetwork`.
- Keep legacy `Network` typed to the legacy-supported network set while adding a separate `Networkish` shape for new client configuration.
- Allow custom configs to provide API origins and contract addresses.

### U2. Pure Ops Namespace

- Add `src/ops/*` grouped by plural domains: `entities`, `types`, `properties`, `relations`, `images`, and `comments`.
- Keep pure builders free from upload, fetch, and contract dependencies.
- Make delete and reply-context helpers explicit about required fetched context rather than silently pretending to delete with no graph context.

### U3. Configured Client

- Add `createGeoClient({ network, fetch })`.
- Expose `geo.api`, `geo.storage`, `geo.images`, `geo.comments`, `geo.entities`, `geo.edits`, `geo.personalSpaces`, `geo.daoSpaces`, and `geo.entityVotes`. DAO proposal workflows live under `geo.daoSpaces` because proposals are DAO-space-specific. Pure ops are imported directly from `@geoprotocol/geo-sdk/ops` to avoid duplicating the API surface on the client.
- Lazy-load heavy upload/storage helpers where the public shape allows it.
- Validate required contracts before upload-backed workflows create IPFS side effects.

### U4. Legacy Compatibility

- Keep legacy namespaces exported from the root.
- Add deprecation JSDoc to old exports.
- Route legacy graph helpers to `Ops` where behavior is pure.
- Route legacy workflow helpers through the configured client where this preserves behavior and does not add new requirements.
- Preserve current DAO/personal-space/proposal/entity-vote calldata shapes.

### U5. Documentation And Validation

- Update README examples to show `Ops`, `createGeoClient`, custom networks, and legacy compatibility.
- Add a changeset describing the API-only migration surface.
- Add tests for lightweight imports, client network configuration, validation ordering, upload error handling, and GraphQL error handling.
- Run `pnpm build`, `pnpm lint`, and `pnpm test`.

## Success Criteria

- Consumers can use `import { entities } from '@geoprotocol/geo-sdk/ops'` for lightweight pure op construction.
- Consumers can use `createGeoClient({ network: GeoTestnetConfig })` or a custom network config for networked workflows.
- Legacy APIs remain available and deprecated.
- Synchronous calldata helpers still work without a global `fetch`.
- Contract-facing outputs remain on the existing legacy contract semantics.
- No v2 contract code, v2 e2e script, or v2 harness setup is included in this release.
