import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { parseEther, isAddress } from "viem";
import { normalize } from "viem/ens";
import { resolveWallet } from "../wallet/index.js";
import { getWalletClient, getPublicClient } from "../chain/client.js";
import { getStealthMetaAddress } from "../chain/registry.js";
import { postAnnouncement } from "../chain/announcer.js";
import { parseStealthMetaAddress } from "../crypto/keys.js";
import { generateStealthAddress } from "../crypto/stealth.js";
import type { EthAddress, HexString } from "../crypto/types.js";

export const sendCommand = new Command("send")
  .description("Send ETH to a stealth address derived from a recipient's registered meta-address")
  .requiredOption("--to <recipient>", "Recipient Ethereum address or ENS name")
  .requiredOption("--amount <eth>", "Amount in ETH to send")
  .option("--rpc-url <url>", "RPC URL", process.env.RPC_URL)
  .option("--private-key <key>", "Sender's private key")
  .option("--keystore <path>", "Keystore file path")
  .option("--password <pass>", "Keystore password")
  .option("--chain-id <id>", "Chain ID", "1")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    if (!opts.rpcUrl) {
      console.error(chalk.red("Error: --rpc-url or RPC_URL env var required"));
      process.exit(1);
    }

    const account = await resolveWallet(opts);
    const chainId = Number(opts.chainId);
    const walletClient = getWalletClient(opts.rpcUrl, chainId, account);
    const publicClient = getPublicClient(opts.rpcUrl, chainId);

    // Resolve recipient address
    let recipientAddress: EthAddress;
    if (isAddress(opts.to)) {
      recipientAddress = opts.to as EthAddress;
    } else {
      // Assume ENS name
      const spinner = ora(`Resolving ENS name: ${opts.to}`).start();
      try {
        const resolved = await publicClient.getEnsAddress({
          name: normalize(opts.to),
        });
        if (!resolved) {
          spinner.fail(`Could not resolve ENS name: ${opts.to}`);
          process.exit(1);
        }
        recipientAddress = resolved as EthAddress;
        spinner.succeed(`Resolved ${opts.to} → ${recipientAddress}`);
      } catch (err: any) {
        spinner.fail(`ENS resolution failed: ${err.message}`);
        process.exit(1);
      }
    }

    // Look up meta-address from registry
    const lookupSpinner = ora("Looking up stealth meta-address from registry...").start();
    let metaAddressRaw: HexString;
    try {
      metaAddressRaw = await getStealthMetaAddress(publicClient, recipientAddress);
      lookupSpinner.succeed("Found stealth meta-address");
    } catch (err: any) {
      lookupSpinner.fail(err.message);
      process.exit(1);
    }

    // Parse the meta-address bytes into spending + viewing public keys
    const { spendingPublicKey, viewingPublicKey } =
      parseStealthMetaAddress(metaAddressRaw);

    // Generate stealth address
    const { stealthAddress, ephemeralPublicKey, viewTag } =
      generateStealthAddress({ spendingPublicKey, viewingPublicKey });

    const amount = parseEther(opts.amount);

    // Send ETH to stealth address
    const sendSpinner = ora("Sending ETH to stealth address...").start();
    let sendTxHash: HexString;
    try {
      sendTxHash = await walletClient.sendTransaction({
        to: stealthAddress,
        value: amount,
      });
      sendSpinner.succeed("ETH sent");
    } catch (err: any) {
      sendSpinner.fail(`Send failed: ${err.message}`);
      process.exit(1);
    }

    // Post announcement
    const announceSpinner = ora("Posting announcement...").start();
    let announceTxHash: HexString;
    try {
      announceTxHash = await postAnnouncement(walletClient, {
        stealthAddress,
        ephemeralPublicKey,
        viewTag,
      });
      announceSpinner.succeed("Announcement posted");
    } catch (err: any) {
      announceSpinner.fail(`Announcement failed: ${err.message}`);
      process.exit(1);
    }

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            stealthAddress,
            ephemeralPublicKey,
            viewTag,
            sendTxHash,
            announceTxHash,
            amount: opts.amount,
          },
          null,
          2,
        ),
      );
      return;
    }

    console.log();
    console.log(chalk.bold("Stealth payment sent"));
    console.log();
    console.log(`  Recipient:        ${chalk.cyan(recipientAddress)}`);
    console.log(`  Stealth address:  ${chalk.green(stealthAddress)}`);
    console.log(`  Amount:           ${opts.amount} ETH`);
    console.log(`  Send tx:          ${chalk.dim(sendTxHash)}`);
    console.log(`  Announce tx:      ${chalk.dim(announceTxHash)}`);
    console.log();
  });
