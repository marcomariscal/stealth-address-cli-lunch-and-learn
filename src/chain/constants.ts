import type { EthAddress } from "../crypto/types.js";

export const ERC5564_ANNOUNCER_ADDRESS: EthAddress =
  "0x55649E01B5Df198D18D95b5cc5051630cfD45564";
export const ERC6538_REGISTRY_ADDRESS: EthAddress =
  "0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538";

export const SCHEME_ID = 1n;

// Block numbers where the singleton contracts were deployed per chain
export const ERC5564_START_BLOCKS: Record<number, bigint> = {
  1: 20042207n, // mainnet
  11155111: 5486597n, // sepolia
  10: 121097390n, // optimism
  8453: 15502414n, // base
  42161: 219468264n, // arbitrum one
};
