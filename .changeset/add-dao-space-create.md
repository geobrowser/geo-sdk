---
"@geoprotocol/geo-sdk": patch
---

Add `daoSpace.createSpace` function for creating DAO spaces. This function generates a space entity, uploads the initial edit to IPFS, and returns the calldata needed to submit a transaction to the DAO Space Factory contract.

```ts
import { daoSpace } from '@geoprotocol/geo-sdk';

const { to, calldata, spaceEntityId, cid } = await daoSpace.createSpace({
  name: 'My DAO Space',
  votingSettings: {
    slowPathPercentageThreshold: 50,  // 50% approval needed
    fastPathFlatThreshold: 3,         // 3 editors for fast path
    quorum: 2,                        // minimum 2 editors must vote
    durationInDays: 7,                // 7 day voting period
  },
  initialEditorSpaceIds: ['0x01234567890abcdef01234567890abcd'],
  author: '0x1234567890abcdef1234567890abcdef12345678',
});

// Using viem
const hash = await walletClient.sendTransaction({
  to,
  data: calldata,
});
```
