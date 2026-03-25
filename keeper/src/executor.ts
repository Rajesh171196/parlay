import { executeParlay } from "./contracts.js";
import {
  getMarketByCondition,
  getTokenIdForOutcome,
  getPrice,
} from "./polymarket.js";
import type { ActiveParlay } from "./watcher.js";

export async function executeParlayTrades(parlay: ActiveParlay) {
  const { address, legs } = parlay;
  console.log(`[Executor] Executing parlay ${address} with ${legs.length} legs`);

  // Step 1: Verify all markets exist and get token IDs
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const conditionId = leg.conditionId;

    const market = await getMarketByCondition(conditionId);
    if (!market) {
      console.error(`[Executor] Market not found for condition ${conditionId}`);
      return false;
    }

    const tokenId = getTokenIdForOutcome(market, Number(leg.outcomeIndex));
    if (!tokenId) {
      console.error(`[Executor] Token not found for outcome ${leg.outcomeIndex}`);
      return false;
    }

    const price = await getPrice(tokenId);
    console.log(
      `[Executor] Leg ${i}: "${leg.description}" | Price: ${price.mid.toFixed(3)} | Token: ${tokenId}`
    );

    // In production: place buy orders on CLOB and transfer tokens to vault
    // For now: log the intended trade
    console.log(
      `[Executor] Would buy outcome tokens at ~${price.ask.toFixed(3)} on CLOB`
    );
  }

  // Step 2: Mark as executed on-chain
  try {
    const receipt = await executeParlay(address as `0x${string}`);
    console.log(
      `[Executor] Parlay ${address} marked as executed. TX: ${receipt.transactionHash}`
    );
    return true;
  } catch (e) {
    console.error(`[Executor] Failed to execute parlay ${address}:`, e);
    return false;
  }
}
