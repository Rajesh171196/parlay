# UGP — User Generated Parlays on Polymarket

You are an expert blockchain developer and DeFi architect. The user wants to deploy UGP, a platform for creating shareable parlay bets on top of Polymarket on Polygon.

## What You're Building

UGP lets users:
1. Chat with an AI agent to combine multiple Polymarket outcomes into a custom parlay
2. Deploy a smart contract for each parlay on Polygon
3. Share a link with friends who can "ape in" by depositing USDC
4. Earn 1% creator fee on all deposits (protocol also takes 1%)

Think "pump.fun for parlays" — creators get paid when others bet on their parlays.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Polygon Chain   │◀────│  Keeper Service │
│  (Chat + UI)    │     │  (Contracts)     │     │  (Resolution)   │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                         │
         ▼                       ▼                         ▼
   Claude API            Polymarket CTF              Polymarket CLOB
   (AI Agent)            (Outcome Tokens)            (Liquidity)
```

### Smart Contracts (Polygon)
- **ParlayFactory.sol** — Deploys minimal proxy clones of ParlayVault for each parlay
- **ParlayVault.sol** — Holds deposits, tracks legs, distributes winnings
  - 1% creator fee + 1% protocol fee on deposits
  - Deposit window open until first leg's market closes
  - Min deposit: 1 USDC
  - Keeper role executes trades and resolves legs
  - Emergency withdraw if keeper doesn't execute within 7 days

### Web App (Next.js)
- `/` — Landing page with trending parlays
- `/create` — Chat with AI to create a parlay
- `/parlay/[address]` — Shareable parlay page with "Ape In" button
- AI agent searches Polymarket markets, calculates combined odds, deploys contracts

### Keeper Service (Node.js)
- Watches for new parlays on-chain
- Buys outcome tokens on Polymarket CLOB for each leg
- Monitors market resolutions
- Resolves legs and triggers settlement on-chain

## Step-by-Step Deployment

### Prerequisites
```bash
# Check these are installed
forge --version    # Foundry for Solidity
node --version     # Node.js 18+
```

### Step 1: Deploy Smart Contracts

```bash
cd contracts

# Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Create .env
cat > .env << 'EOF'
POLYGON_RPC_URL=https://polygon-rpc.com
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
POLYGONSCAN_API_KEY=your_polygonscan_key
PROTOCOL_FEE_ADDRESS=0xYOUR_TREASURY_ADDRESS
EOF

# Deploy to Polygon
source .env
forge script script/Deploy.s.sol:DeployUGP \
  --rpc-url $POLYGON_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify

# Note the deployed ParlayFactory address
```

### Step 2: Set Up Web App

```bash
cd app

# Install dependencies
npm install

# Configure environment
cat > .env.local << 'EOF'
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_FACTORY_ADDRESS=0xDEPLOYED_FACTORY_ADDRESS
NEXT_PUBLIC_POLYGON_RPC=https://polygon-rpc.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
EOF

# Run locally
npm run dev

# Deploy to Vercel
npx vercel --prod
```

### Step 3: Start Keeper

```bash
cd keeper

# Install dependencies
npm install

# Configure environment
cat > .env << 'EOF'
KEEPER_PRIVATE_KEY=0xKEEPER_WALLET_PRIVATE_KEY
POLYGON_RPC_URL=https://polygon-rpc.com
FACTORY_ADDRESS=0xDEPLOYED_FACTORY_ADDRESS
POLYMARKET_API_KEY=your_polymarket_api_key
POLYMARKET_API_SECRET=your_polymarket_secret
EOF

# Start keeper
npm start
```

### Step 4: Fund the Keeper
The keeper wallet needs:
- MATIC for gas on Polygon
- USDC to buy outcome tokens (will be reimbursed from vault deposits)

```bash
# Send MATIC and USDC to the keeper address
# Keeper address is derived from KEEPER_PRIVATE_KEY
```

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Fee split | 1% creator + 1% protocol | Incentivizes creators without being extractive |
| Deposit window | Until first leg closes | Maximizes participation window |
| Min deposit | 1 USDC | Lowest possible barrier to entry |
| Contract pattern | EIP-1167 minimal proxy | ~$0.01 deploy cost per parlay |
| Resolution | Keeper-based | Polymarket CLOB is off-chain, needs intermediary |
| Emergency withdraw | 7 days after deadline | Protects users if keeper goes down |

## Polymarket Integration Details

### Market Search
```
GET https://gamma-api.polymarket.com/markets?query=trump
```

### CLOB Trading
```
Base URL: https://clob.polymarket.com
- GET /markets/{condition_id} — market details
- GET /book?token_id={id} — order book
- POST /order — place order (requires API key signing)
```

### On-Chain Contracts (Polygon)
- ConditionalTokens: `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045`
- CTFExchange: `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`
- USDC: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

## How the AI Agent Works

The chat agent in the web app uses this system prompt:

```
You are the UGP parlay creation assistant. Help users create parlays by:
1. Understanding what outcomes they want to combine
2. Searching Polymarket for matching markets
3. Presenting markets with current prices (probability)
4. Calculating combined parlay odds
5. Confirming the selection and triggering deployment

When the user describes their parlay, search for each market on Polymarket.
Present results as cards with: market question, current probability, close date.
Calculate combined odds: multiply (1/probability) for each leg.

When confirmed, output a JSON action block:
{
  "action": "create_parlay",
  "legs": [
    {"conditionId": "0x...", "outcomeIndex": 1, "questionId": "0x...", "description": "..."},
    ...
  ],
  "combinedOdds": 12.5,
  "depositDeadline": 1234567890
}
```

## Troubleshooting

- **"Keeper not executing"**: Check keeper has MATIC for gas and is running
- **"Can't deposit"**: Check USDC approval and that deposit window is still open
- **"Market not found"**: Polymarket API may be rate limiting, try specific search terms
- **"Deploy fails"**: Check deployer has MATIC for gas, contract addresses are correct

## Post-Deploy Checklist
- [ ] Factory deployed and verified on Polygonscan
- [ ] Web app deployed (Vercel recommended)
- [ ] Keeper running and funded
- [ ] Test: create a parlay with small amounts
- [ ] Test: deposit from another wallet
- [ ] Test: share link and deposit from it
- [ ] Monitor keeper logs for resolution events
