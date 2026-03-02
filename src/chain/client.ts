import {
  createPublicClient,
  createWalletClient,
  http,
  type Chain,
  type PublicClient,
  type WalletClient,
  type Account,
} from "viem";
import {
  mainnet,
  sepolia,
  optimism,
  base,
  arbitrum,
} from "viem/chains";

const CHAINS: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  10: optimism,
  8453: base,
  42161: arbitrum,
};

function getChain(chainId: number): Chain {
  const chain = CHAINS[chainId];
  if (!chain) {
    // Allow unknown chains with minimal config (e.g. anvil / local)
    return {
      id: chainId,
      name: `Chain ${chainId}`,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [] } },
    } as Chain;
  }
  return chain;
}

export function getPublicClient(
  rpcUrl: string,
  chainId: number,
): PublicClient {
  return createPublicClient({
    chain: getChain(chainId),
    transport: http(rpcUrl),
  });
}

export function getWalletClient(
  rpcUrl: string,
  chainId: number,
  account: Account,
): WalletClient {
  return createWalletClient({
    account,
    chain: getChain(chainId),
    transport: http(rpcUrl),
  });
}
