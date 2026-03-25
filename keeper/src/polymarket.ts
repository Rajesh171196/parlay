const GAMMA_API = "https://gamma-api.polymarket.com";
const CLOB_API = "https://clob.polymarket.com";

export interface MarketData {
  id: string;
  question: string;
  conditionId: string;
  outcomePrices: string;
  outcomes: string;
  active: boolean;
  closed: boolean;
  end_date_iso: string;
  tokens: { token_id: string; outcome: string }[];
}

export async function getMarketByCondition(
  conditionId: string
): Promise<MarketData | null> {
  try {
    const res = await fetch(
      `${GAMMA_API}/markets?condition_id=${conditionId}`
    );
    if (!res.ok) return null;
    const markets = await res.json();
    return markets[0] ?? null;
  } catch (e) {
    console.error(`Failed to fetch market ${conditionId}:`, e);
    return null;
  }
}

export interface OrderBookEntry {
  price: string;
  size: string;
}

export async function getOrderBook(
  tokenId: string
): Promise<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }> {
  const res = await fetch(`${CLOB_API}/book?token_id=${tokenId}`);
  if (!res.ok) throw new Error(`CLOB error: ${res.status}`);
  return res.json();
}

export async function getPrice(
  tokenId: string
): Promise<{ bid: number; ask: number; mid: number }> {
  const book = await getOrderBook(tokenId);
  const bestBid = Number(book.bids?.[0]?.price ?? 0);
  const bestAsk = Number(book.asks?.[0]?.price ?? 1);
  return { bid: bestBid, ask: bestAsk, mid: (bestBid + bestAsk) / 2 };
}

export function isMarketResolved(market: MarketData): boolean {
  return market.closed;
}

export function getWinningOutcome(market: MarketData): number | null {
  if (!market.closed) return null;

  try {
    const prices = JSON.parse(market.outcomePrices).map(Number);
    // After resolution, winning outcome has price ~1.0, losing ~0.0
    if (prices[0] > 0.95) return 0;
    if (prices[1] > 0.95) return 1;
    return null;
  } catch {
    return null;
  }
}

export function getTokenIdForOutcome(
  market: MarketData,
  outcomeIndex: number
): string | null {
  if (!market.tokens || market.tokens.length <= outcomeIndex) return null;
  const outcome = outcomeIndex === 1 ? "Yes" : "No";
  const token = market.tokens.find((t) => t.outcome === outcome);
  return token?.token_id ?? null;
}
