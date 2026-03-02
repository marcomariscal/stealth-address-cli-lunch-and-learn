import { parseAbiItem } from "viem";
import { ERC5564AnnouncerAbi } from "./abi/ERC5564Announcer.js";
import {
  ERC5564_ANNOUNCER_ADDRESS,
  SCHEME_ID,
  ERC5564_START_BLOCKS,
} from "./constants.js";
import type { getPublicClient, getWalletClient } from "./client.js";
import type { EthAddress, HexString } from "../crypto/types.js";

export interface AnnouncementLog {
  stealthAddress: EthAddress;
  ephemeralPubKey: HexString;
  metadata: HexString;
  blockNumber: bigint;
  transactionHash: HexString;
}

const ANNOUNCEMENT_EVENT = parseAbiItem(
  "event Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)",
);

export async function postAnnouncement(
  walletClient: ReturnType<typeof getWalletClient>,
  params: {
    stealthAddress: EthAddress;
    ephemeralPublicKey: HexString;
    viewTag: HexString;
  },
): Promise<HexString> {
  const metadata = params.viewTag;

  const hash = await walletClient.writeContract({
    address: ERC5564_ANNOUNCER_ADDRESS,
    abi: ERC5564AnnouncerAbi,
    functionName: "announce",
    args: [
      SCHEME_ID,
      params.stealthAddress,
      params.ephemeralPublicKey,
      metadata,
    ],
  });
  return hash;
}

export async function getAnnouncements(
  publicClient: ReturnType<typeof getPublicClient>,
  options?: {
    fromBlock?: bigint;
    toBlock?: bigint;
    chunkSize?: number;
  },
): Promise<AnnouncementLog[]> {
  const chainId = await publicClient.getChainId();
  const startBlock =
    options?.fromBlock ?? ERC5564_START_BLOCKS[chainId] ?? 0n;
  const endBlock =
    options?.toBlock ?? (await publicClient.getBlockNumber());
  const chunkSize = BigInt(options?.chunkSize ?? 5000);

  const announcements: AnnouncementLog[] = [];

  for (let from = startBlock; from <= endBlock; from += chunkSize + 1n) {
    const to = from + chunkSize > endBlock ? endBlock : from + chunkSize;

    const logs = await publicClient.getLogs({
      address: ERC5564_ANNOUNCER_ADDRESS,
      event: ANNOUNCEMENT_EVENT,
      args: { schemeId: SCHEME_ID },
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      announcements.push({
        stealthAddress: log.args.stealthAddress as EthAddress,
        ephemeralPubKey: log.args.ephemeralPubKey as HexString,
        metadata: log.args.metadata as HexString,
        blockNumber: log.blockNumber!,
        transactionHash: log.transactionHash as HexString,
      });
    }
  }

  return announcements;
}
