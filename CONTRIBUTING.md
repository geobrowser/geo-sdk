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

The integration tests in `src/full-flow-test.test.ts` are skipped by default. To run them:

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