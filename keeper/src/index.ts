import { config } from "./config.js";
import { keeperAddress } from "./contracts.js";
import {
  getActiveParlays,
  getParlaysNeedingExecution,
  getParlaysNeedingResolution,
  getParlaysNeedingSettlement,
} from "./watcher.js";
import { executeParlayTrades } from "./executor.js";
import { resolveLegs, trySettle } from "./resolver.js";

let running = true;

async function loop() {
  console.log(`[Keeper] Starting UGP Keeper`);
  console.log(`[Keeper] Address: ${keeperAddress}`);
  console.log(`[Keeper] Factory: ${config.factoryAddress}`);
  console.log(`[Keeper] Polling: parlays=${config.pollNewParlays}ms, resolutions=${config.pollResolutions}ms`);

  while (running) {
    try {
      const parlays = await getActiveParlays();
      console.log(`[Keeper] Active parlays: ${parlays.length}`);

      // Execute parlays that passed their deposit deadline
      const needExecution = getParlaysNeedingExecution(parlays);
      for (const p of needExecution) {
        console.log(`[Keeper] Executing parlay ${p.address}`);
        await executeParlayTrades(p);
      }

      // Resolve legs for executed parlays
      const needResolution = getParlaysNeedingResolution(parlays);
      for (const p of needResolution) {
        const resolved = await resolveLegs(p);
        if (resolved > 0) {
          console.log(`[Keeper] Resolved ${resolved} legs for ${p.address}`);
        }
      }

      // Settle fully resolved parlays
      const needSettlement = getParlaysNeedingSettlement(parlays);
      for (const p of needSettlement) {
        await trySettle(p);
      }
    } catch (e) {
      console.error("[Keeper] Loop error:", e);
    }

    // Wait before next iteration
    await sleep(config.pollNewParlays);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Keeper] Shutting down...");
  running = false;
});
process.on("SIGTERM", () => {
  console.log("\n[Keeper] Shutting down...");
  running = false;
});

loop().catch((e) => {
  console.error("[Keeper] Fatal error:", e);
  process.exit(1);
});
