import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { HexString } from "../crypto/types.js";

export function resolveFromPrivateKey(key: string): PrivateKeyAccount {
  const normalizedKey = key.startsWith("0x") ? key : `0x${key}`;
  return privateKeyToAccount(normalizedKey as HexString);
}
