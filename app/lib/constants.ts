import { polygon } from "wagmi/chains";

export const SUPPORTED_CHAIN = polygon;

export const CONTRACTS = {
  factory: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "0x") as `0x${string}`,
  usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
  conditionalTokens:
    "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045" as `0x${string}`,
  ctfExchange:
    "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E" as `0x${string}`,
};

export const POLYMARKET_API = "https://gamma-api.polymarket.com";
export const POLYMARKET_CLOB = "https://clob.polymarket.com";
