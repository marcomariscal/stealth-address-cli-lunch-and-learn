import {
  createPublicClient,
  createWalletClient,
  http,
  type Chain,
  type HttpTransport,
} from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
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
    return {
      id: chainId,
      name: `Chain ${chainId}`,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [] } },
    } as Chain;
  }
  return chain;
}

export function getPublicClient(rpcUrl: string, chainId: number) {
  return createPublicClient({
    chain: getChain(chainId),
    transport: http(rpcUrl),
  });
}

export function getWalletClient(
  rpcUrl: string,
  chainId: number,
  account: PrivateKeyAccount,
) {
  return createWalletClient({
    account,
    chain: getChain(chainId),
    transport: http(rpcUrl),
  });
}
