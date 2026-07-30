---
'@geoprotocol/geo-sdk': patch
---

Point `TESTNET` at the live SpaceRegistry (`0xCF13491802747e759e1BB8E364bc43045398d1DD`) and
DAOSpaceFactory (`0x323aF429B85c954D4a161b2A6281c26DF45b7128`) on chain 55516.

The previous addresses belonged to an abandoned deployment whose owner key is no longer
available, and which has nothing registered in it — `spaceIdToAddress()` returned the zero
address for every space. This fails silently: a wrong-but-deployed registry still has bytecode,
so contract-code guards pass and transactions succeed emitting no events.
