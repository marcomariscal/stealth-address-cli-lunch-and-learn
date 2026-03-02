import { Command } from "commander";
import chalk from "chalk";
import { generateStealthKeys } from "../crypto/keys.js";

export const generateCommand = new Command("generate")
  .description("Generate a new stealth meta-address (spending + viewing keypairs)")
  .option("--json", "Output as JSON")
  .action((opts) => {
    const keys = generateStealthKeys();

    if (opts.json) {
      console.log(JSON.stringify(keys, null, 2));
      return;
    }

    console.log();
    console.log(chalk.bold("Stealth Keys Generated"));
    console.log();
    console.log(
      `  Spending Private Key:  ${chalk.red(keys.spendingPrivateKey)}  ${chalk.dim("(KEEP SECRET)")}`,
    );
    console.log(
      `  Viewing Private Key:   ${chalk.red(keys.viewingPrivateKey)}  ${chalk.dim("(KEEP SECRET)")}`,
    );
    console.log();
    console.log(
      `  Spending Public Key:   ${chalk.cyan(keys.spendingPublicKey)}`,
    );
    console.log(
      `  Viewing Public Key:    ${chalk.cyan(keys.viewingPublicKey)}`,
    );
    console.log();
    console.log(
      `  Stealth Meta-Address:  ${chalk.green(keys.stealthMetaAddress)}`,
    );
    console.log();
    console.log(
      chalk.dim(
        "  Save your private keys securely. The meta-address is safe to share publicly.",
      ),
    );
    console.log();
  });
