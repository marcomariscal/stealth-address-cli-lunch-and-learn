import "dotenv/config";
import { Command } from "commander";
import { generateCommand } from "./commands/generate.js";
import { registerCommand } from "./commands/register.js";
import { sendCommand } from "./commands/send.js";
import { scanCommand } from "./commands/scan.js";
import { spendCommand } from "./commands/spend.js";

const program = new Command();

program
  .name("stealth")
  .description("Stealth address CLI tool (ERC-5564 / ERC-6538)")
  .version("0.1.0");

program.addCommand(generateCommand);
program.addCommand(registerCommand);
program.addCommand(sendCommand);
program.addCommand(scanCommand);
program.addCommand(spendCommand);

program.parse();
