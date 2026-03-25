import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";

const account = privateKeyToAccount(config.keeperPrivateKey);

export const publicClient: PublicClient = createPublicClient({
  chain: polygon,
  transport: http(config.polygonRpcUrl),
});

export const walletClient: WalletClient = createWalletClient({
  account,
  chain: polygon,
  transport: http(config.polygonRpcUrl),
});

export const keeperAddress = account.address;

// ABIs
const FACTORY_ABI = [
  {
    type: "function",
    name: "getAllParlays",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getParlaysCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const VAULT_ABI = [
  {
    type: "function",
    name: "getStatus",
    inputs: [],
    outputs: [
      { name: "_executed", type: "bool" },
      { name: "_settled", type: "bool" },
      { name: "_allLegsWon", type: "bool" },
      { name: "_totalDeposits", type: "uint256" },
      { name: "_depositPool", type: "uint256" },
      { name: "_legsResolved", type: "uint256" },
      { name: "_totalLegs", type: "uint256" },
      { name: "_totalWinnings", type: "uint256" },
      { name: "_depositDeadline", type: "uint256" },
      { name: "_depositorsCount", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLegs",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "conditionId", type: "bytes32" },
          { name: "outcomeIndex", type: "uint256" },
          { name: "description", type: "string" },
          { name: "resolved", type: "bool" },
          { name: "won", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "execute",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveLeg",
    inputs: [
      { name: "legIndex", type: "uint256" },
      { name: "won", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "settle",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "depositPool",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export async function getAllParlays(): Promise<`0x${string}`[]> {
  const result = await publicClient.readContract({
    address: config.factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getAllParlays",
  });
  return result as `0x${string}`[];
}

export interface ParlayStatus {
  executed: boolean;
  settled: boolean;
  allLegsWon: boolean;
  totalDeposits: bigint;
  depositPool: bigint;
  legsResolved: bigint;
  totalLegs: bigint;
  totalWinnings: bigint;
  depositDeadline: bigint;
  depositorsCount: bigint;
}

export async function getParlayStatus(
  vaultAddress: `0x${string}`
): Promise<ParlayStatus> {
  const result = await publicClient.readContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "getStatus",
  });

  const [
    executed,
    settled,
    allLegsWon,
    totalDeposits,
    depositPool,
    legsResolved,
    totalLegs,
    totalWinnings,
    depositDeadline,
    depositorsCount,
  ] = result;

  return {
    executed,
    settled,
    allLegsWon,
    totalDeposits,
    depositPool,
    legsResolved,
    totalLegs,
    totalWinnings,
    depositDeadline,
    depositorsCount,
  };
}

export interface LegData {
  conditionId: `0x${string}`;
  outcomeIndex: bigint;
  description: string;
  resolved: boolean;
  won: boolean;
}

export async function getParlayLegs(
  vaultAddress: `0x${string}`
): Promise<LegData[]> {
  const result = await publicClient.readContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "getLegs",
  });
  return result as LegData[];
}

export async function executeParlay(vaultAddress: `0x${string}`) {
  const hash = await walletClient.writeContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "execute",
  });
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function resolveLeg(
  vaultAddress: `0x${string}`,
  legIndex: number,
  won: boolean
) {
  const hash = await walletClient.writeContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "resolveLeg",
    args: [BigInt(legIndex), won],
  });
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function settleParlay(vaultAddress: `0x${string}`) {
  const hash = await walletClient.writeContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "settle",
  });
  return publicClient.waitForTransactionReceipt({ hash });
}
