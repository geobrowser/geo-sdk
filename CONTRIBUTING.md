# Contributing

## Running tests

```bash
pnpm test
```

## Running linting

```bash
pnpm lint
```

## Build library

```bash
pnpm build
```

## Running integration tests

Integration tests are skipped by default. They require environment variables in `.env` and interact with the live testnet.

### EOA wallet tests

The e2e surfaces run against the built-in Geo testnet config by default and use the config's Geo-sponsored wallet RPC. Set `GEO_E2E_ZERODEV_RPC_URL` only when you need to override the default sponsorship project, or unset sponsorship in a custom network and fund the EOA directly.

1. Generate a private key and write it to `.env`:
   ```bash
   pnpm create-private-key
   ```
2. Optional: override the default sponsorship RPC URL in `.env`:
   ```bash
   GEO_E2E_ZERODEV_RPC_URL=https://rpc.zerodev.app/api/v3/<project-id>/chain/55516?provider=ULTRA_RELAY
   ```
   The ZeroDev project must allow requests from your local public IP or CI egress IP. Domain allowlists do not help Node-based e2e tests.
3. Run the e2e suite:
   ```bash
   pnpm test:e2e
   ```

## Creating a new changeset in a PR

Add a changeset for every user-facing change (not docs or CI):

```bash
pnpm changeset
```

Commit the generated `.changeset/` file. Never edit the package version manually.

## Releasing

1. Merge the changesets into `main`.
2. Run **Bump Version** from GitHub Actions and merge its release PR.
3. Run **Publish** from GitHub Actions.

Stable releases use npm's `latest` tag. Prereleases use their suffix (`beta`, etc.). Publishing also creates the `v<version>` git tag and GitHub release.

### Prerelease

Before **Bump Version**, enter or exit prerelease mode:

```bash
pnpm changeset pre enter beta
pnpm changeset pre exit
```

Commit `.changeset/pre.json` and merge it into `main`, then use the release steps above.
