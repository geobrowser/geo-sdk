---
"@geoprotocol/geo-sdk": patch
---

Make `createGeoWalletClient` the default sponsored wallet helper.

Before, sponsored transactions used the experimental ZeroDev-specific helper:

```ts
const walletClient = await createGeoZeroDev7702WalletClient({
  signer,
  chain: GeoTestnetConfig.chain,
  zeroDevRpcUrl: process.env.GEO_ZERODEV_RPC_URL,
});
```

After, use the Geo network config directly. `GeoTestnetConfig` includes the default Geo-sponsored testnet RPC URL:

```ts
const walletClient = await createGeoWalletClient({
  signer,
  network: GeoTestnetConfig,
});
```

The older Safe/Pimlico `getSmartAccountWalletClient`, plain `getWalletClient`, and `TESTNET_RPC_URL` helpers were removed.
