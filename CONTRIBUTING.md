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

The e2e surfaces run against the built-in Geo testnet config by default. They use the Privy EOA through the default ZeroDev testnet RPC unless you override `GEO_E2E_ZERODEV_RPC_URL`.

1. Generate a private key and write it to `.env`:
   ```bash
   pnpm create-private-key
   ```
2. Run the e2e suite:
   ```bash
   pnpm test:e2e
   ```
3. To use a different ZeroDev project, add the ZeroDev RPC to `.env`:
   ```bash
   GEO_E2E_ZERODEV_RPC_URL=https://rpc.zerodev.app/api/v3/<project-id>/chain/55516
   ```

### Smart account test (`src/smart-account-flow-test.test.ts`)

Uses a Safe smart account with Pimlico paymaster to publish an edit to an existing personal space. No testnet ETH is needed since gas is sponsored.

1. Add your Privy private key to `.env`:
   ```
   PRIVY_PRIVATE_KEY=<your-privy-private-key>
   ```
   You can export it from https://www.geobrowser.io/export-wallet. The key can be with or without the `0x` prefix.
2. The smart account derived from this key must already have a personal space on testnet.
3. Unskip the test and run it:
   ```bash
   pnpm test -- -t "should publish an edit to personal space via smart account"
   ```

## Creating a new changeset in a PR

```bash
pnpm changeset
```

## Publishing a new version

Publishing is done via two manually triggered GitHub Actions workflows (restricted to nikgraf and yanivtal):

1. Run the **Bump Version** workflow (Actions tab → Bump Version → Run workflow). This pushes a version branch. Open the link in the workflow summary to create a PR.
2. Merge the PR.
3. Run the **Publish** workflow (Actions tab → Publish → Run workflow). This publishes to npm, pushes the git tag, and creates a GitHub release.
