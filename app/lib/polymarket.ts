import { POLYMARKET_API, POLYMARKET_CLOB } from "./constants";

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  end_date_iso: string;
  active: boolean;
  closed: boolean;
  markets: PolymarketMarket[];
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomePrices: string; // JSON string "[\"0.55\",\"0.45\"]"
  outcomes: string; // JSON string "[\"Yes\",\"No\"]"
  active: boolean;
  closed: boolean;
  end_date_iso: string;
  tokens: { token_id: string; outcome: string }[];
  volume: string;
}

export async function searchMarkets(query: string): Promise<PolymarketEvent[]> {
  const res = await fetch(
    `${POLYMARKET_API}/events?title_like=${encodeURIComponent(query)}&active=true&closed=false&limit=10`
  );
  if (!res.ok) throw new Error(`Polymarket API error: ${res.status}`);
  return res.json();
}

export async function getMarket(
  conditionId: string
): Promise<PolymarketMarket | null> {
  const res = await fetch(
    `${POLYMARKET_API}/markets?condition_id=${conditionId}`
  );
  if (!res.ok) return null;
  const markets = await res.json();
  return markets[0] ?? null;
}

export async function getMarketPrice(
  tokenId: string
): Promise<{ bid: number; ask: number; mid: number }> {
  const res = await fetch(`${POLYMARKET_CLOB}/book?token_id=${tokenId}`);
  if (!res.ok) throw new Error(`CLOB error: ${res.status}`);
  const book = await res.json();

  const bestBid = book.bids?.[0]?.price ?? 0;
  const bestAsk = book.asks?.[0]?.price ?? 1;
  return {
    bid: Number(bestBid),
    ask: Number(bestAsk),
    mid: (Number(bestBid) + Number(bestAsk)) / 2,
  };
}

export function parseOutcomePrices(market: PolymarketMarket): number[] {
  try {
    return JSON.parse(market.outcomePrices).map(Number);
  } catch {
    return [0.5, 0.5];
  }
}

export function parseOutcomes(market: PolymarketMarket): string[] {
  try {
    return JSON.parse(market.outcomes);
  } catch {
    return ["Yes", "No"];
  }
}

export function calculateParlayOdds(probabilities: number[]): number {
  // Combined odds = product of individual decimal odds
  // Decimal odds = 1 / probability
  return probabilities.reduce((acc, p) => acc * (1 / p), 1);
}
