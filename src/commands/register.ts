import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { resolveWallet } from "../wallet/index.js";
import { getWalletClient, getPublicClient } from "../chain/client.js";
import { registerStealthMetaAddress } from "../chain/registry.js";
import type { HexString } from "../crypto/types.js";

export const registerCommand = new Command("register")
  .description("Register your stealth meta-address on the ERC-6538 registry")
  .requiredOption("--meta-address <addr>", "Stealth meta-address to register")
  .option("--rpc-url <url>", "RPC URL", process.env.RPC_URL)
  .option("--private-key <key>", "Private key")
  .option("--keystore <path>", "Keystore file path")
  .option("--password <pass>", "Keystore password")
  .option("--chain-id <id>", "Chain ID", "1")
  .action(async (opts) => {
    if (!opts.rpcUrl) {
      console.error(chalk.red("Error: --rpc-url or RPC_URL env var required"));
      process.exit(1);
    }

    const account = await resolveWallet(opts);
    const chainId = Number(opts.chainId);
    const walletClient = getWalletClient(opts.rpcUrl, chainId, account);
    const publicClient = getPublicClient(opts.rpcUrl, chainId);

    // Strip st:eth: prefix if present, registry expects raw bytes
    const rawMetaAddress = opts.metaAddress.startsWith("st:eth:")
      ? opts.metaAddress.slice(7)
      : opts.metaAddress;

    const spinner = ora("Registering stealth meta-address...").start();

    try {
      const txHash = await registerStealthMetaAddress(
        walletClient,
        rawMetaAddress as HexString,
      );
      spinner.succeed("Stealth meta-address registered");

      console.log();
      console.log(`  Registrant:  ${chalk.cyan(account.address)}`);
      console.log(`  Tx hash:     ${chalk.green(txHash)}`);
      console.log();
    } catch (err: any) {
      spinner.fail("Registration failed");
      console.error(chalk.red(`  ${err.message}`));
      process.exit(1);
    }
  });
