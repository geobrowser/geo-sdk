import fs from 'node:fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

const envContent = `PRIVATE_KEY=${privateKey}\nADDRESS=${account.address}\n`;

try {
  fs.writeFileSync('.env', envContent, { flag: 'wx', mode: 0o600 });
} catch (error) {
  const err = error as NodeJS.ErrnoException;
  if (err.code === 'EEXIST') {
    console.error('Error: .env file already exists. Aborting to avoid overwriting it.');
    process.exitCode = 1;
  } else {
    throw error;
  }
}

console.log('Created .env file with:');
console.log(`  ADDRESS=${account.address}`);
console.log('');
console.log('Fund this address with testnet ETH from:');
console.log('  https://faucet.conduit.xyz/geo-test-zc16z3tcvf');
