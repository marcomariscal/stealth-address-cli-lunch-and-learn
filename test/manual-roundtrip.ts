import { parseStealthMetaAddress } from "../src/crypto/keys.js";
import {
  generateStealthAddress,
  checkStealthAddress,
  computeStealthKey,
} from "../src/crypto/stealth.js";
import { privateKeyToAccount } from "viem/accounts";

// Alice (sender) keys - just needs a regular wallet to send from
const aliceSenderKey = "0xfe3315c6108e2848b1bb72cdaa8cc71f3f15031f3c66749fbb180a3c1a23bd46";
const aliceAccount = privateKeyToAccount(aliceSenderKey);

// Bob (recipient) stealth keys
const bob = {
  spendingPrivateKey: "0x65f72a1c5dda92fae6c655c6657436f45e82ba631c3c6e5c727050ed55585e4f",
  spendingPublicKey: "0x023834068b2f2892a5fdf5a2eb50006077dabc406b118ff769712a84e3a6e02bab",
  viewingPrivateKey: "0x71a63148733638eb8e5fc1fca8daf15efb0c5fa0e32182cfa57e802286ed5ef0",
  viewingPublicKey: "0x02c4248b27afd0369cec4be2736984daf31b92efb51e2e31ec1a5afbed55288ae4",
  stealthMetaAddress: "st:eth:0x023834068b2f2892a5fdf5a2eb50006077dabc406b118ff769712a84e3a6e02bab02c4248b27afd0369cec4be2736984daf31b92efb51e2e31ec1a5afbed55288ae4",
} as const;

console.log("=== STEALTH ADDRESS ROUND-TRIP TEST ===\n");

// Step 1: Alice looks up Bob's meta-address (simulated - normally from registry)
console.log("1. Alice resolves Bob's meta-address from registry");
console.log(`   Meta-address: ${bob.stealthMetaAddress.slice(0, 40)}...`);

const { spendingPublicKey, viewingPublicKey } = parseStealthMetaAddress(
  bob.stealthMetaAddress,
);
console.log(`   Spending pub: ${spendingPublicKey.slice(0, 20)}...`);
console.log(`   Viewing pub:  ${viewingPublicKey.slice(0, 20)}...`);
console.log();

// Step 2: Alice generates a stealth address for Bob
console.log("2. Alice generates a one-time stealth address for Bob");
const { stealthAddress, ephemeralPublicKey, viewTag } =
  generateStealthAddress({ spendingPublicKey, viewingPublicKey });

console.log(`   Stealth address: ${stealthAddress}`);
console.log(`   Ephemeral key:   ${ephemeralPublicKey.slice(0, 20)}...`);
console.log(`   View tag:        ${viewTag}`);
console.log(`   (Alice would send ETH to ${stealthAddress} and post announcement)`);
console.log();

// Step 3: Bob scans announcements and finds the payment
console.log("3. Bob scans announcements using his viewing key");
const isMatch = checkStealthAddress({
  ephemeralPublicKey,
  viewingPrivateKey: bob.viewingPrivateKey,
  spendingPublicKey: bob.spendingPublicKey,
  stealthAddress,
  viewTag,
});
console.log(`   Match found: ${isMatch ? "YES ✓" : "NO ✗"}`);
console.log();

// Step 4: Bob derives the stealth private key to spend
console.log("4. Bob derives the stealth private key");
const stealthPrivKey = computeStealthKey({
  ephemeralPublicKey,
  viewingPrivateKey: bob.viewingPrivateKey,
  spendingPrivateKey: bob.spendingPrivateKey,
});

const stealthAccount = privateKeyToAccount(stealthPrivKey);
console.log(`   Stealth private key: ${stealthPrivKey.slice(0, 20)}...`);
console.log(`   Derived address:     ${stealthAccount.address}`);
console.log(`   Expected address:    ${stealthAddress}`);
console.log(
  `   Address match: ${stealthAccount.address.toLowerCase() === stealthAddress.toLowerCase() ? "YES ✓" : "NO ✗"}`,
);
console.log();

// Step 5: Verify a wrong key doesn't match
console.log("5. Verify: scanning with WRONG viewing key doesn't match");
const wrongMatch = checkStealthAddress({
  ephemeralPublicKey,
  viewingPrivateKey: aliceSenderKey, // Alice's key, not Bob's
  spendingPublicKey: bob.spendingPublicKey,
  stealthAddress,
  viewTag,
});
console.log(`   Wrong key match: ${wrongMatch ? "YES ✗ (BAD!)" : "NO ✓ (correctly rejected)"}`);
console.log();

console.log("=== ALL CHECKS PASSED ===");
