import { resolveLeg, settleParlay } from "./contracts.js";
import {
  getMarketByCondition,
  isMarketResolved,
  getWinningOutcome,
} from "./polymarket.js";
import type { ActiveParlay } from "./watcher.js";

export async function resolveLegs(parlay: ActiveParlay): Promise<number> {
  const { address, legs } = parlay;
  let resolved = 0;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    if (leg.resolved) continue;

    const market = await getMarketByCondition(leg.conditionId);
    if (!market) {
      console.warn(`[Resolver] Market not found for condition ${leg.conditionId}`);
      continue;
    }

    if (!isMarketResolved(market)) continue;

    const winningOutcome = getWinningOutcome(market);
    if (winningOutcome === null) {
      console.warn(`[Resolver] Could not determine outcome for ${leg.conditionId}`);
      continue;
    }

    const won = winningOutcome === Number(leg.outcomeIndex);
    console.log(
      `[Resolver] Leg ${i} of ${address}: "${leg.description}" → ${won ? "WON" : "LOST"}`
    );

    try {
      const receipt = await resolveLeg(address as `0x${string}`, i, won);
      console.log(`[Resolver] Resolved leg ${i}. TX: ${receipt.transactionHash}`);
      resolved++;
    } catch (e) {
      console.error(`[Resolver] Failed to resolve leg ${i} of ${address}:`, e);
    }
  }

  return resolved;
}

export async function trySettle(parlay: ActiveParlay): Promise<boolean> {
  const { address } = parlay;

  try {
    // In production: redeem winning positions on Polymarket first,
    // then transfer USDC to vault, then call settle
    console.log(`[Resolver] Settling parlay ${address}`);

    const receipt = await settleParlay(address as `0x${string}`);
    console.log(`[Resolver] Settled. TX: ${receipt.transactionHash}`);
    return true;
  } catch (e) {
    console.error(`[Resolver] Failed to settle ${address}:`, e);
    return false;
  }
}
