import { ERC6538RegistryAbi } from "./abi/ERC6538Registry.js";
import { ERC6538_REGISTRY_ADDRESS, SCHEME_ID } from "./constants.js";
import type { getPublicClient, getWalletClient } from "./client.js";
import type { EthAddress, HexString } from "../crypto/types.js";

export async function registerStealthMetaAddress(
  walletClient: ReturnType<typeof getWalletClient>,
  stealthMetaAddress: HexString,
): Promise<HexString> {
  const hash = await walletClient.writeContract({
    address: ERC6538_REGISTRY_ADDRESS,
    abi: ERC6538RegistryAbi,
    functionName: "registerKeys",
    args: [SCHEME_ID, stealthMetaAddress],
  });
  return hash;
}

export async function getStealthMetaAddress(
  publicClient: ReturnType<typeof getPublicClient>,
  registrant: EthAddress,
): Promise<HexString> {
  const result = await publicClient.readContract({
    address: ERC6538_REGISTRY_ADDRESS,
    abi: ERC6538RegistryAbi,
    functionName: "stealthMetaAddressOf",
    args: [registrant, SCHEME_ID],
  });

  if (!result || result === "0x") {
    throw new Error(
      `No stealth meta-address registered for ${registrant}. They need to run 'stealth register' first.`,
    );
  }

  return result as HexString;
}
