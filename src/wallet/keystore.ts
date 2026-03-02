import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { HexString } from "../crypto/types.js";

async function promptPassword(prompt: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function resolveFromKeystore(
  keystorePath: string,
  password?: string,
): Promise<PrivateKeyAccount> {
  const keystoreJson = readFileSync(keystorePath, "utf-8");

  if (!password) {
    password = await promptPassword("Enter keystore password: ");
  }

  // viem doesn't have built-in keystore decryption, so we do it manually
  // using the Web Crypto API which is available in Node 20+
  const keystore = JSON.parse(keystoreJson);
  const privateKey = await decryptKeystoreV3(keystore, password);
  return privateKeyToAccount(privateKey);
}

async function decryptKeystoreV3(
  keystore: any,
  password: string,
): Promise<HexString> {
  const crypto = keystore.crypto || keystore.Crypto;
  if (!crypto) throw new Error("Invalid keystore file: missing crypto field");

  const kdfParams = crypto.kdfparams;
  const ciphertext = hexToBuffer(crypto.ciphertext);
  const iv = hexToBuffer(crypto.cipherparams.iv);
  const mac = crypto.mac;

  // Derive key
  let derivedKey: Uint8Array;
  if (crypto.kdf === "scrypt") {
    // Use Node's built-in scrypt
    const { scryptSync } = await import("node:crypto");
    derivedKey = scryptSync(
      Buffer.from(password),
      hexToBuffer(kdfParams.salt),
      kdfParams.dklen,
      { N: kdfParams.n, r: kdfParams.r, p: kdfParams.p },
    );
  } else if (crypto.kdf === "pbkdf2") {
    const { pbkdf2Sync } = await import("node:crypto");
    derivedKey = pbkdf2Sync(
      Buffer.from(password),
      hexToBuffer(kdfParams.salt),
      kdfParams.c,
      kdfParams.dklen,
      kdfParams.prf === "hmac-sha256" ? "sha256" : "sha256",
    );
  } else {
    throw new Error(`Unsupported KDF: ${crypto.kdf}`);
  }

  // Verify MAC
  const { createHash } = await import("node:crypto");
  const macInput = Buffer.concat([
    Buffer.from(derivedKey.slice(16, 32)),
    ciphertext,
  ]);
  const computedMac = createHash("sha3-256").update(macInput).digest("hex");
  if (computedMac !== mac) {
    throw new Error("Wrong password: MAC verification failed");
  }

  // Decrypt
  const { createDecipheriv } = await import("node:crypto");
  const decipher = createDecipheriv(
    "aes-128-ctr",
    Buffer.from(derivedKey.slice(0, 16)),
    iv,
  );
  const privateKey = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return `0x${privateKey.toString("hex")}` as HexString;
}

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex.replace("0x", ""), "hex");
}
