import chalk from "chalk";

export function warnGasFunding() {
  console.error(
    chalk.yellow(
      "  WARNING: The stealth address needs gas to withdraw. Funding it from a known\n" +
        "  address can link you to this payment. Consider using a relayer or paymaster.",
    ),
  );
}

export function warnCollectorPattern(address: string) {
  console.error(
    chalk.yellow(
      `  WARNING: Withdrawing multiple stealth payments to ${address} creates a\n` +
        "  'collector pattern' that can deanonymize you. Use distinct withdrawal addresses.",
    ),
  );
}

export function warnSelfSend() {
  console.error(
    chalk.yellow(
      "  WARNING: Sending to your own address. Self-sends are a known\n" +
        "  deanonymization vector.",
    ),
  );
}
