export const FACTORY_ABI = [
  {
    type: "function",
    name: "createParlay",
    inputs: [
      {
        name: "legs",
        type: "tuple[]",
        components: [
          { name: "conditionId", type: "bytes32" },
          { name: "outcomeIndex", type: "uint256" },
          { name: "description", type: "string" },
          { name: "resolved", type: "bool" },
          { name: "won", type: "bool" },
        ],
      },
      { name: "depositDeadline", type: "uint256" },
    ],
    outputs: [{ name: "vault", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAllParlays",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getParlaysByCreator",
    inputs: [{ name: "creator", type: "address" }],
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
  {
    type: "function",
    name: "getParlaysPaginated",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "result", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ParlayCreated",
    inputs: [
      { name: "parlay", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "legsCount", type: "uint256", indexed: false },
      { name: "depositDeadline", type: "uint256", indexed: false },
    ],
  },
] as const;

export const VAULT_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimWinnings",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "emergencyWithdraw",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
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
    name: "creator",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deposits",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimed",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalDeposits",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "depositDeadline",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "depositor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Settled",
    inputs: [
      { name: "allWon", type: "bool", indexed: false },
      { name: "totalWinnings", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
