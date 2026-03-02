import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getPublicClient } from "../chain/client.js";
import { getAnnouncements } from "../chain/announcer.js";
import { checkStealthAddress } from "../crypto/stealth.js";
import type { HexString, EthAddress } from "../crypto/types.js";

export interface ScanResult {
  stealthAddress: EthAddress;
  ephemeralPubKey: HexString;
  blockNumber: bigint;
  transactionHash: HexString;
}

export const scanCommand = new Command("scan")
  .description("Scan for stealth payments sent to you")
  .requiredOption("--viewing-key <key>", "Your viewing private key")
  .requiredOption("--spending-pub-key <key>", "Your spending public key")
  .option("--rpc-url <url>", "RPC URL", process.env.RPC_URL)
  .option("--chain-id <id>", "Chain ID", "1")
  .option("--from-block <n>", "Start scanning from block")
  .option("--to-block <n>", "Stop scanning at block")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    if (!opts.rpcUrl) {
      console.error(chalk.red("Error: --rpc-url or RPC_URL env var required"));
      process.exit(1);
    }

    const chainId = Number(opts.chainId);
    const publicClient = getPublicClient(opts.rpcUrl, chainId);

    const spinner = ora("Scanning announcements...").start();

    try {
      const announcements = await getAnnouncements(publicClient, {
        fromBlock: opts.fromBlock ? BigInt(opts.fromBlock) : undefined,
        toBlock: opts.toBlock ? BigInt(opts.toBlock) : undefined,
      });

      spinner.text = `Checking ${announcements.length} announcements...`;

      const matches: ScanResult[] = [];

      for (const ann of announcements) {
        // Extract view tag from metadata (first byte)
        const viewTag =
          ann.metadata && ann.metadata.length >= 4
            ? (`0x${ann.metadata.slice(2, 4)}` as HexString)
            : ("0x00" as HexString);

        const isMatch = checkStealthAddress({
          ephemeralPublicKey: ann.ephemeralPubKey,
          viewingPrivateKey: opts.viewingKey as HexString,
          spendingPublicKey: opts.spendingPubKey as HexString,
          stealthAddress: ann.stealthAddress,
          viewTag,
        });

        if (isMatch) {
          matches.push({
            stealthAddress: ann.stealthAddress,
            ephemeralPubKey: ann.ephemeralPubKey,
            blockNumber: ann.blockNumber,
            transactionHash: ann.transactionHash,
          });
        }
      }

      spinner.succeed(
        `Scan complete. Found ${matches.length} stealth payment(s).`,
      );

      if (opts.json) {
        console.log(
          JSON.stringify(
            matches.map((m) => ({
              ...m,
              blockNumber: m.blockNumber.toString(),
            })),
            null,
            2,
          ),
        );
        return;
      }

      if (matches.length === 0) {
        console.log(chalk.dim("\n  No stealth payments found.\n"));
        return;
      }

      console.log();
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i]!;
        console.log(
          `  ${chalk.bold(`#${i + 1}`)}  Address:     ${chalk.green(m.stealthAddress)}`,
        );
        console.log(
          `       Ephemeral:   ${chalk.dim(m.ephemeralPubKey)}`,
        );
        console.log(
          `       Block:       ${m.blockNumber}`,
        );
        console.log(
          `       Tx:          ${chalk.dim(m.transactionHash)}`,
        );
        console.log();
      }
    } catch (err: any) {
      spinner.fail(`Scan failed: ${err.message}`);
      process.exit(1);
    }
  });
