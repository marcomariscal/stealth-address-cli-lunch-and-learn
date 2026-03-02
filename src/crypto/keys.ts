import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex } from "viem";
import type { StealthKeys, StealthMetaAddress, HexString } from "./types.js";

export function generateStealthKeys(): StealthKeys {
  const spendingPrivateKey = secp256k1.utils.randomPrivateKey();
  const viewingPrivateKey = secp256k1.utils.randomPrivateKey();

  const spendingPublicKey = secp256k1.getPublicKey(spendingPrivateKey, true);
  const viewingPublicKey = secp256k1.getPublicKey(viewingPrivateKey, true);

  const spendPubHex = bytesToHex(spendingPublicKey);
  const viewPubHex = bytesToHex(viewingPublicKey);

  // Meta-address format: st:eth:0x || spendingPubKey || viewingPubKey
  const stealthMetaAddress =
    `st:eth:0x${spendPubHex.slice(2)}${viewPubHex.slice(2)}` as HexString;

  return {
    spendingPrivateKey: bytesToHex(spendingPrivateKey),
    spendingPublicKey: spendPubHex,
    viewingPrivateKey: bytesToHex(viewingPrivateKey),
    viewingPublicKey: viewPubHex,
    stealthMetaAddress,
  };
}

export function parseStealthMetaAddress(metaAddress: string): StealthMetaAddress {
  // Format: st:eth:0x<spendPubKey 66 hex><viewPubKey 66 hex>
  const hex = metaAddress.startsWith("st:eth:")
    ? metaAddress.slice(7)
    : metaAddress;

  if (!hex.startsWith("0x") || hex.length !== 134) {
    throw new Error(
      `Invalid stealth meta-address. Expected 134 hex chars (0x + 66 spending + 66 viewing), got ${hex.length}`,
    );
  }

  const spendingPublicKey = `0x${hex.slice(2, 68)}` as HexString;
  const viewingPublicKey = `0x${hex.slice(68)}` as HexString;

  return { spendingPublicKey, viewingPublicKey };
}
