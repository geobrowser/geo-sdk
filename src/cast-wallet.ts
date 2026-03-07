import type { Hex } from 'viem';

type GetPrivateKeyFromCastParams = {
  /** The cast wallet account name (matches a keystore file in ~/.foundry/keystores/) */
  account: string;
  /** Optional password. If omitted, cast will prompt interactively. */
  password?: string;
};

function exec(command: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use dynamic require to avoid needing @types/node
    // biome-ignore lint/security/noGlobalEval: dynamic require for Node.js child_process without @types/node
    const cp = eval("require('child_process')") as {
      execFile: (
        cmd: string,
        args: string[],
        opts: { timeout: number },
        cb: (err: Error | null, stdout: string) => void,
      ) => void;
    };

    cp.execFile(command, args, { timeout: timeoutMs }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

/**
 * Retrieve a private key from Foundry's encrypted keystore using `cast wallet decrypt-keystore`.
 *
 * Requires Foundry to be installed (`cast` must be on PATH).
 * Create a keystore with: `cast wallet import <name> --interactive`
 *
 * @example
 * ```ts
 * import { getPrivateKeyFromCast, getSmartAccountWalletClient } from '@geoprotocol/geo-sdk';
 *
 * const privateKey = await getPrivateKeyFromCast({ account: 'geo-deployer' });
 * const wallet = await getSmartAccountWalletClient({ privateKey });
 * ```
 */
export async function getPrivateKeyFromCast(params: GetPrivateKeyFromCastParams): Promise<Hex> {
  const { account, password } = params;

  const args = ['wallet', 'decrypt-keystore', account];
  if (password) {
    args.push('--unsafe-password', password);
  }

  try {
    const stdout = await exec('cast', args, 30_000);

    const key = stdout.trim();
    if (!key.startsWith('0x')) {
      return `0x${key}` as Hex;
    }
    return key as Hex;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('ENOENT') || message.includes('not found')) {
      throw new Error('Foundry `cast` command not found. Install from https://getfoundry.sh');
    }
    if (message.includes('No keystore found') || message.includes('not exist')) {
      throw new Error(
        `No keystore found for account "${account}". Create one with: cast wallet import ${account} --interactive`,
      );
    }

    throw new Error(`Failed to decrypt keystore for "${account}": ${message}`);
  }
}
