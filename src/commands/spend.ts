import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getWalletClient, getPublicClient } from "../chain/client.js";
import { computeStealthKey } from "../crypto/stealth.js";
import { warnGasFunding } from "../privacy/warnings.js";
import type { HexString, EthAddress } from "../crypto/types.js";

export const spendCommand = new Command("spend")
  .description("Derive the stealth private key and withdraw funds")
  .requiredOption("--ephemeral-pub-key <key>", "Ephemeral public key from the announcement")
  .requiredOption("--viewing-key <key>", "Your viewing private key")
  .requiredOption("--spending-key <key>", "Your spending private key")
  .requiredOption("--to <address>", "Destination address for withdrawal")
  .option("--rpc-url <url>", "RPC URL", process.env.RPC_URL)
  .option("--chain-id <id>", "Chain ID", "1")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    if (!opts.rpcUrl) {
      console.error(chalk.red("Error: --rpc-url or RPC_URL env var required"));
      process.exit(1);
    }

    const chainId = Number(opts.chainId);
    const publicClient = getPublicClient(opts.rpcUrl, chainId);

    // Derive stealth private key
    const stealthPrivKey = computeStealthKey({
      ephemeralPublicKey: opts.ephemeralPubKey as HexString,
      viewingPrivateKey: opts.viewingKey as HexString,
      spendingPrivateKey: opts.spendingKey as HexString,
    });

    const stealthAccount = privateKeyToAccount(stealthPrivKey);
    const walletClient = getWalletClient(
      opts.rpcUrl,
      chainId,
      stealthAccount,
    );

    // Check balance
    const balance = await publicClient.getBalance({
      address: stealthAccount.address,
    });

    if (balance === 0n) {
      console.error(
        chalk.red(
          `\n  Stealth address ${stealthAccount.address} has zero balance.\n`,
        ),
      );
      process.exit(1);
    }

    // Privacy warnings
    console.log();
    warnGasFunding();
    console.log();

    // Estimate gas and send max
    const gasPrice = await publicClient.getGasPrice();
    const gasLimit = 21000n;
    const gasCost = gasPrice * gasLimit;
    const sendAmount = balance - gasCost;

    if (sendAmount <= 0n) {
      console.error(
        chalk.red("  Insufficient balance to cover gas costs."),
      );
      process.exit(1);
    }

    if (!opts.json) {
      console.log(`  Stealth address:  ${chalk.cyan(stealthAccount.address)}`);
      console.log(`  Balance:          ${formatEther(balance)} ETH`);
      console.log(`  Gas cost:         ~${formatEther(gasCost)} ETH`);
      console.log(
        `  Sending:          ${formatEther(sendAmount)} ETH → ${chalk.cyan(opts.to)}`,
      );
      console.log();
    }

    const spinner = ora("Withdrawing funds...").start();

    try {
      const txHash = await walletClient.sendTransaction({
        to: opts.to as EthAddress,
        value: sendAmount,
        gas: gasLimit,
      });
      spinner.succeed("Withdrawal complete");

      if (opts.json) {
        console.log(
          JSON.stringify(
            {
              stealthAddress: stealthAccount.address,
              to: opts.to,
              amount: formatEther(sendAmount),
              txHash,
            },
            null,
            2,
          ),
        );
        return;
      }

      console.log();
      console.log(`  Tx hash:  ${chalk.green(txHash)}`);
      console.log();
    } catch (err: any) {
      spinner.fail(`Withdrawal failed: ${err.message}`);
      process.exit(1);
    }
  });
