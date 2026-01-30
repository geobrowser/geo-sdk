---
'@geoprotocol/geo-sdk': minor
---

Add `daoSpace.proposeEdit()` function for creating proposals to publish edits to DAO spaces.

This function:
- Publishes ops to IPFS using the GRC-20 binary format
- Generates a unique proposal ID (or accepts a custom one)
- Encodes the calldata for the SpaceRegistry's `enter()` function with PROPOSAL_CREATED action

The proposal, when executed, will call the DAO space's `publish()` function. Since `publish()` is a valid fast-path action, with FAST voting mode and sufficient votes, the proposal will auto-execute.

Example usage:
```ts
import { daoSpace, Graph } from '@geoprotocol/geo-sdk';

const { ops } = Graph.createEntity({ name: 'New Entity' });
const { editId, cid, to, calldata, proposalId } = await daoSpace.proposeEdit({
  name: 'Add new entity',
  ops,
  author: '0x1234...',
  daoSpaceAddress: '0xDAOSpaceContractAddress...',
  callerSpaceId: '0xCallerBytes16SpaceId...',
  daoSpaceId: '0xDAOBytes16SpaceId...',
});

await walletClient.sendTransaction({ to, data: calldata });
```
