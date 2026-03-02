import type { PrivateKeyAccount } from "viem/accounts";
import { resolveFromPrivateKey } from "./privateKey.js";
import { resolveFromKeystore } from "./keystore.js";

export interface WalletOptions {
  privateKey?: string;
  keystore?: string;
  password?: string;
}

export async function resolveWallet(
  opts: WalletOptions,
): Promise<PrivateKeyAccount> {
  if (opts.privateKey) {
    return resolveFromPrivateKey(opts.privateKey);
  }

  if (opts.keystore) {
    return resolveFromKeystore(opts.keystore, opts.password);
  }

  if (process.env.PRIVATE_KEY) {
    return resolveFromPrivateKey(process.env.PRIVATE_KEY);
  }

  throw new Error(
    "No wallet provided. Use --private-key, --keystore, or set PRIVATE_KEY env var.",
  );
}
