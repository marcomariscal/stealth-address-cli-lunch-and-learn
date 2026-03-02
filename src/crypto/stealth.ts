import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak256, bytesToHex, hexToBytes } from "viem";
import { publicKeyToAddress } from "viem/utils";

const Point = secp256k1.ProjectivePoint;
import type {
  HexString,
  EthAddress,
  GenerateStealthAddressResult,
} from "./types.js";

/**
 * Sender-side: generate a one-time stealth address for a recipient.
 *
 * 1. Generate ephemeral keypair
 * 2. ECDH: sharedSecret = ephemeralPriv * viewingPubKey
 * 3. hash = keccak256(sharedSecret)
 * 4. viewTag = hash[0]
 * 5. stealthPubKey = spendingPubKey + hash * G
 * 6. stealthAddress = address(stealthPubKey)
 */
export function generateStealthAddress(args: {
  spendingPublicKey: HexString;
  viewingPublicKey: HexString;
  ephemeralPrivateKey?: Uint8Array;
}): GenerateStealthAddressResult {
  const ephPriv =
    args.ephemeralPrivateKey ?? secp256k1.utils.randomPrivateKey();
  const ephPub = secp256k1.getPublicKey(ephPriv, true);

  const sharedSecret = secp256k1.getSharedSecret(
    ephPriv,
    hexToBytes(args.viewingPublicKey),
  );

  const hashedSecret = keccak256(sharedSecret);
  const viewTag = `0x${hashedSecret.slice(2, 4)}` as HexString;

  // stealthPubKey = spendingPubKey + hash * G
  const hashScalar = BigInt(hashedSecret);
  const hashPoint = Point.BASE.multiply(hashScalar);
  const spendPoint = Point.fromHex(hexToBytes(args.spendingPublicKey));
  const stealthPoint = spendPoint.add(hashPoint);

  // Uncompressed public key for address derivation
  const stealthPubKeyUncompressed = stealthPoint.toRawBytes(false);
  const stealthAddress = publicKeyToAddress(
    bytesToHex(stealthPubKeyUncompressed),
  );

  return {
    stealthAddress,
    ephemeralPublicKey: bytesToHex(ephPub),
    viewTag,
  };
}

/**
 * Recipient-side: check if an announcement corresponds to your keys.
 *
 * 1. ECDH: sharedSecret = viewingPriv * ephemeralPubKey
 * 2. hash = keccak256(sharedSecret)
 * 3. Fast filter: if hash[0] != viewTag, skip
 * 4. Full check: stealthPubKey = spendingPubKey + hash * G
 * 5. Compare derived address with announced stealth address
 */
export function checkStealthAddress(args: {
  ephemeralPublicKey: HexString;
  viewingPrivateKey: HexString;
  spendingPublicKey: HexString;
  stealthAddress: EthAddress;
  viewTag: HexString;
}): boolean {
  const sharedSecret = secp256k1.getSharedSecret(
    hexToBytes(args.viewingPrivateKey).slice(0, 32),
    hexToBytes(args.ephemeralPublicKey),
  );

  const hashedSecret = keccak256(sharedSecret);

  // View tag fast filter (1 byte — 255/256 rejection rate)
  const computedViewTag = `0x${hashedSecret.slice(2, 4)}`;
  if (computedViewTag !== args.viewTag) return false;

  // Full verification
  const hashScalar = BigInt(hashedSecret);
  const hashPoint = Point.BASE.multiply(hashScalar);
  const spendPoint = Point.fromHex(hexToBytes(args.spendingPublicKey));
  const stealthPoint = spendPoint.add(hashPoint);
  const stealthPubKeyUncompressed = stealthPoint.toRawBytes(false);
  const derivedAddress = publicKeyToAddress(
    bytesToHex(stealthPubKeyUncompressed),
  );

  return derivedAddress.toLowerCase() === args.stealthAddress.toLowerCase();
}

/**
 * Recipient-side: derive the private key for a stealth address.
 *
 * stealthPrivateKey = (spendingPrivateKey + keccak256(sharedSecret)) mod n
 */
export function computeStealthKey(args: {
  ephemeralPublicKey: HexString;
  viewingPrivateKey: HexString;
  spendingPrivateKey: HexString;
}): HexString {
  const sharedSecret = secp256k1.getSharedSecret(
    hexToBytes(args.viewingPrivateKey).slice(0, 32),
    hexToBytes(args.ephemeralPublicKey),
  );

  const hashedSecret = keccak256(sharedSecret);

  const spendBigInt = BigInt(args.spendingPrivateKey);
  const hashBigInt = BigInt(hashedSecret);
  const curveOrder = secp256k1.CURVE.n;
  const stealthPrivKey = (spendBigInt + hashBigInt) % curveOrder;

  return `0x${stealthPrivKey.toString(16).padStart(64, "0")}` as HexString;
}
