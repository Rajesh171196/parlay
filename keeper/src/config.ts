import "dotenv/config";

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

export const config = {
  keeperPrivateKey: required("KEEPER_PRIVATE_KEY") as `0x${string}`,
  polygonRpcUrl: required("POLYGON_RPC_URL"),
  factoryAddress: required("FACTORY_ADDRESS") as `0x${string}`,
  polymarketApiKey: process.env.POLYMARKET_API_KEY ?? "",
  polymarketApiSecret: process.env.POLYMARKET_API_SECRET ?? "",

  // Polygon contract addresses
  usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
  conditionalTokens: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045" as `0x${string}`,
  ctfExchange: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E" as `0x${string}`,

  // Polling intervals (ms)
  pollNewParlays: 30_000,
  pollDeadlines: 30_000,
  pollResolutions: 60_000,
} as const;
