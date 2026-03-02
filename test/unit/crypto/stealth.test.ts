import { describe, it, expect } from "vitest";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex, privateKeyToAccount } from "viem/accounts";
import { generateStealthKeys, parseStealthMetaAddress } from "../../../src/crypto/keys.js";
import {
  generateStealthAddress,
  checkStealthAddress,
  computeStealthKey,
} from "../../../src/crypto/stealth.js";

describe("generateStealthKeys", () => {
  it("generates valid keypairs and meta-address", () => {
    const keys = generateStealthKeys();

    expect(keys.spendingPrivateKey).toMatch(/^0x[0-9a-f]{64}$/);
    expect(keys.viewingPrivateKey).toMatch(/^0x[0-9a-f]{64}$/);
    // Compressed public keys start with 02 or 03
    expect(keys.spendingPublicKey).toMatch(/^0x0[23][0-9a-f]{64}$/);
    expect(keys.viewingPublicKey).toMatch(/^0x0[23][0-9a-f]{64}$/);
    // Meta-address: st:eth:0x + 66 chars spending + 66 chars viewing = st:eth: + 134 chars
    expect(keys.stealthMetaAddress).toMatch(/^st:eth:0x[0-9a-f]{132}$/);
  });
});

describe("parseStealthMetaAddress", () => {
  it("round-trips with generateStealthKeys", () => {
    const keys = generateStealthKeys();
    const parsed = parseStealthMetaAddress(keys.stealthMetaAddress);

    expect(parsed.spendingPublicKey).toBe(keys.spendingPublicKey);
    expect(parsed.viewingPublicKey).toBe(keys.viewingPublicKey);
  });

  it("throws on invalid length", () => {
    expect(() => parseStealthMetaAddress("0xabc")).toThrow("Invalid stealth meta-address");
  });
});

describe("stealth address round-trip", () => {
  it("generate → check → computeKey full cycle", () => {
    const keys = generateStealthKeys();
    const { spendingPublicKey, viewingPublicKey } = parseStealthMetaAddress(
      keys.stealthMetaAddress,
    );

    // Sender generates a stealth address
    const result = generateStealthAddress({
      spendingPublicKey,
      viewingPublicKey,
    });

    expect(result.stealthAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(result.ephemeralPublicKey).toMatch(/^0x0[23][0-9a-f]{64}$/);
    expect(result.viewTag).toMatch(/^0x[0-9a-f]{2}$/);

    // Recipient checks the announcement
    const isMatch = checkStealthAddress({
      ephemeralPublicKey: result.ephemeralPublicKey,
      viewingPrivateKey: keys.viewingPrivateKey,
      spendingPublicKey: keys.spendingPublicKey,
      stealthAddress: result.stealthAddress,
      viewTag: result.viewTag,
    });

    expect(isMatch).toBe(true);

    // Recipient derives the stealth private key
    const stealthPrivKey = computeStealthKey({
      ephemeralPublicKey: result.ephemeralPublicKey,
      viewingPrivateKey: keys.viewingPrivateKey,
      spendingPrivateKey: keys.spendingPrivateKey,
    });

    // Verify: the derived private key's address matches the stealth address
    const account = privateKeyToAccount(stealthPrivKey);
    expect(account.address.toLowerCase()).toBe(
      result.stealthAddress.toLowerCase(),
    );
  });

  it("check returns false for wrong viewing key", () => {
    const keys = generateStealthKeys();
    const wrongKeys = generateStealthKeys();
    const { spendingPublicKey, viewingPublicKey } = parseStealthMetaAddress(
      keys.stealthMetaAddress,
    );

    const result = generateStealthAddress({
      spendingPublicKey,
      viewingPublicKey,
    });

    const isMatch = checkStealthAddress({
      ephemeralPublicKey: result.ephemeralPublicKey,
      viewingPrivateKey: wrongKeys.viewingPrivateKey,
      spendingPublicKey: keys.spendingPublicKey,
      stealthAddress: result.stealthAddress,
      viewTag: result.viewTag,
    });

    // Overwhelmingly likely to be false (255/256 chance view tag rejects)
    // In the rare case view tag matches, the full check will still fail
    expect(isMatch).toBe(false);
  });

  it("check returns false for wrong stealth address", () => {
    const keys = generateStealthKeys();
    const { spendingPublicKey, viewingPublicKey } = parseStealthMetaAddress(
      keys.stealthMetaAddress,
    );

    const result = generateStealthAddress({
      spendingPublicKey,
      viewingPublicKey,
    });

    const isMatch = checkStealthAddress({
      ephemeralPublicKey: result.ephemeralPublicKey,
      viewingPrivateKey: keys.viewingPrivateKey,
      spendingPublicKey: keys.spendingPublicKey,
      stealthAddress: "0x0000000000000000000000000000000000000001",
      viewTag: result.viewTag,
    });

    expect(isMatch).toBe(false);
  });

  it("works with deterministic ephemeral key", () => {
    const keys = generateStealthKeys();
    const { spendingPublicKey, viewingPublicKey } = parseStealthMetaAddress(
      keys.stealthMetaAddress,
    );
    const ephemeralPrivateKey = secp256k1.utils.randomPrivateKey();

    const result1 = generateStealthAddress({
      spendingPublicKey,
      viewingPublicKey,
      ephemeralPrivateKey,
    });
    const result2 = generateStealthAddress({
      spendingPublicKey,
      viewingPublicKey,
      ephemeralPrivateKey,
    });

    // Same ephemeral key should produce same stealth address
    expect(result1.stealthAddress).toBe(result2.stealthAddress);
    expect(result1.ephemeralPublicKey).toBe(result2.ephemeralPublicKey);
    expect(result1.viewTag).toBe(result2.viewTag);
  });
});
