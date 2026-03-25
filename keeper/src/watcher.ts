import {
  getAllParlays,
  getParlayStatus,
  getParlayLegs,
  type ParlayStatus,
  type LegData,
} from "./contracts.js";

export interface ActiveParlay {
  address: `0x${string}`;
  status: ParlayStatus;
  legs: LegData[];
}

export async function getActiveParlays(): Promise<ActiveParlay[]> {
  const addresses = await getAllParlays();
  const active: ActiveParlay[] = [];

  for (const addr of addresses) {
    try {
      const status = await getParlayStatus(addr);
      // Skip fully settled parlays
      if (status.settled) continue;

      const legs = await getParlayLegs(addr);
      active.push({ address: addr, status, legs });
    } catch (e) {
      console.error(`Error reading parlay ${addr}:`, e);
    }
  }

  return active;
}

export function getParlaysNeedingExecution(
  parlays: ActiveParlay[]
): ActiveParlay[] {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return parlays.filter(
    (p) =>
      !p.status.executed &&
      p.status.depositDeadline <= now &&
      p.status.depositPool > 0n
  );
}

export function getParlaysNeedingResolution(
  parlays: ActiveParlay[]
): ActiveParlay[] {
  return parlays.filter(
    (p) =>
      p.status.executed &&
      !p.status.settled &&
      p.status.legsResolved < p.status.totalLegs
  );
}

export function getParlaysNeedingSettlement(
  parlays: ActiveParlay[]
): ActiveParlay[] {
  return parlays.filter(
    (p) =>
      p.status.executed &&
      !p.status.settled &&
      p.status.legsResolved === p.status.totalLegs
  );
}
