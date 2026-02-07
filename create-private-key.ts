import fs from 'node:fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

const envContent = `PRIVATE_KEY=${privateKey}\nADDRESS=${account.address}\n`;

fs.writeFileSync('.env', envContent);

console.log('Created .env file with:');
console.log(`  ADDRESS=${account.address}`);
console.log('');
console.log('Fund this address with testnet ETH from:');
console.log('  https://faucet.conduit.xyz/geo-test-zc16z3tcvf');
