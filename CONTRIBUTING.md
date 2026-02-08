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

### EOA wallet test (`src/full-flow-test.test.ts`)

Uses a plain EOA wallet to create a personal space and publish an edit.

1. Generate a private key and write it to `.env`:
   ```bash
   pnpm create-private-key
   ```
2. Copy the `ADDRESS` from the output
3. Get testnet ETH from the faucet: https://faucet.conduit.xyz/geo-test-zc16z3tcvf
4. Unskip the test and run it:
   ```bash
   pnpm test -- -t "should create a space and publish an edit"
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

```bash
pnpm changeset version # commit the changes
pnpm build
pnpm changeset publish
git push origin <version tag> # e.g. v0.23.0
gh release create
```