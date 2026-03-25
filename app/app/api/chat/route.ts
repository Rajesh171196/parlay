import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the UGP (User Generated Parlays) assistant. You help users create parlay bets combining multiple Polymarket outcomes.

IMPORTANT RULES:
- You will receive Polymarket market data injected into the user's message (after "Here are relevant Polymarket markets I found:"). Use this data — it contains real conditionIds and prices.
- When the user describes the outcomes they want, immediately match them to the Polymarket markets provided and present a parlay summary.
- As soon as you have matched markets for ALL legs the user wants, include the <parlay_action> block. Do NOT wait for a separate confirmation message. The frontend shows a "Deploy Parlay" button — the user confirms there.
- If you can only find some of the requested markets, present what you found and ask about the missing ones.

RESPONSE FORMAT when you have all legs:
1. Brief summary of the parlay (the legs, odds for each, combined odds)
2. Then ALWAYS include this exact JSON block at the end:

<parlay_action>
{"action":"create_parlay","legs":[{"conditionId":"0xACTUAL_CONDITION_ID","outcomeIndex":1,"description":"Short description of the bet"}],"combinedOdds":5.0,"depositDeadline":UNIX_TIMESTAMP}
</parlay_action>

FIELD RULES:
- conditionId: Use the EXACT conditionId from the Polymarket data. Must start with 0x.
- outcomeIndex: 1 = Yes, 0 = No
- description: Short human-readable description like "Bitcoin over $100k by Dec 2025"
- combinedOdds: Multiply (1/probability) for each leg. E.g., if legs are 60% and 40%, combined = (1/0.6) * (1/0.4) = 4.17
- depositDeadline: Use the earliest market close date as unix timestamp. If no close date, use 30 days from now.

CRITICAL RULES:
- If the user asks for markets that don't exist in the data, DO NOT just say "not found". Instead, show them the trending markets and say "those markets aren't on Polymarket yet, but here are some fire options you can parlay instead:" and list 5-8 interesting ones.
- ALWAYS be proactive. Your job is to get users to CREATE parlays, not to turn them away.
- If the user says "yes" or "let's do it" or picks markets, IMMEDIATELY output the <parlay_action> block. Don't ask for more confirmation.
- Keep responses short and crypto-native. No fluff.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Always fetch Polymarket data so the AI has real markets to work with
    const lastMessage = messages[messages.length - 1]?.content ?? "";
    let marketContext = "";

    const searchTerms = extractSearchTerms(lastMessage);
    const { matched, trending } = await searchPolymarket(searchTerms);

    if (matched.length > 0) {
      marketContext = `\n\n[POLYMARKET DATA - USE THESE REAL CONDITION IDS]\nMatching markets:\n${matched.join("\n")}`;
    }
    if (trending.length > 0) {
      marketContext += `\n\nTrending/popular markets (suggest these if no match above):\n${trending.join("\n")}`;
    }
    if (matched.length === 0 && trending.length === 0) {
      marketContext = "\n\n[No Polymarket markets found. Ask user to try different topics like politics, crypto, sports, AI, geopolitics.]";
    }

    const claudeMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content:
          m.role === "user" && marketContext && m === messages[messages.length - 1]
            ? m.content + marketContext
            : m.content,
      })
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract action if present
    let action = null;
    const actionMatch = text.match(
      /<parlay_action>([\s\S]*?)<\/parlay_action>/
    );
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);

        // CRITICAL: Ensure depositDeadline is in the future
        // The AI often picks stale dates from market data
        const now = Math.floor(Date.now() / 1000);
        const thirtyDays = 30 * 24 * 60 * 60;
        if (!action.depositDeadline || action.depositDeadline <= now) {
          action.depositDeadline = now + thirtyDays;
          console.log("[Chat] Fixed deadline to 30 days from now:", action.depositDeadline);
        }

        console.log("[Chat] Parsed parlay action:", JSON.stringify(action));
      } catch (e) {
        console.error("[Chat] Failed to parse action JSON:", actionMatch[1], e);
      }
    } else {
      console.log("[Chat] No <parlay_action> block found in response");
    }

    // Clean message (remove action tags)
    const message = text
      .replace(/<parlay_action>[\s\S]*?<\/parlay_action>/, "")
      .trim();

    return NextResponse.json({ message, action });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again.", action: null },
      { status: 500 }
    );
  }
}

function extractSearchTerms(message: string): string[] {
  // Simple extraction: look for key prediction topics
  const terms: string[] = [];
  const lower = message.toLowerCase();

  // Split on common delimiters and extract meaningful phrases
  const parts = lower.split(/[+,&]|and\b|\bwith\b|\bplus\b/);
  for (const part of parts) {
    const cleaned = part.trim();
    if (cleaned.length > 3) {
      terms.push(cleaned);
    }
  }

  // If no splits found, use the whole message
  if (terms.length === 0 && message.length > 3) {
    terms.push(message);
  }

  return terms.slice(0, 5); // Max 5 search terms
}

async function searchPolymarket(
  terms: string[]
): Promise<{ matched: string[]; trending: string[] }> {
  const matched: string[] = [];
  const trending: string[] = [];
  const seen = new Set<string>();

  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/events?limit=200&active=true&closed=false`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return { matched, trending };

    const events = await res.json();

    for (const event of events) {
      if (!event.markets) continue;
      const titleLower = (event.title ?? "").toLowerCase();
      const descLower = (event.description ?? "").toLowerCase();

      const isMatch = terms.some((term) => {
        const words = term.toLowerCase().split(/\s+/);
        return words.some(
          (w) => w.length > 2 && (titleLower.includes(w) || descLower.includes(w))
        );
      });

      for (const market of event.markets) {
        if (seen.has(market.conditionId)) continue;
        seen.add(market.conditionId);

        let prices: number[] = [0.5, 0.5];
        try {
          prices = JSON.parse(market.outcomePrices).map(Number);
        } catch {}

        const line = `- "${market.question}" | Condition: ${market.conditionId} | Yes: ${(prices[0] * 100).toFixed(0)}% / No: ${(prices[1] * 100).toFixed(0)}% | Closes: ${market.end_date_iso ?? "TBD"} | Volume: $${Number(market.volume ?? 0).toLocaleString()}`;

        if (isMatch) {
          matched.push(line);
        }
      }
    }

    // Always include some trending markets (high volume, interesting topics)
    // Pick up to 15 random diverse markets from the pool for the AI to suggest
    const allMarkets: { line: string; volume: number }[] = [];
    for (const event of events) {
      if (!event.markets) continue;
      for (const market of event.markets) {
        let prices: number[] = [0.5, 0.5];
        try {
          prices = JSON.parse(market.outcomePrices).map(Number);
        } catch {}
        const vol = Number(market.volume ?? 0);
        // Only include markets with meaningful volume and not already matched
        if (vol > 1000 && !matched.some((m) => m.includes(market.conditionId))) {
          allMarkets.push({
            line: `- "${market.question}" | Condition: ${market.conditionId} | Yes: ${(prices[0] * 100).toFixed(0)}% / No: ${(prices[1] * 100).toFixed(0)}% | Closes: ${market.end_date_iso ?? "TBD"} | Volume: $${vol.toLocaleString()}`,
            volume: vol,
          });
        }
      }
    }
    // Sort by volume descending, take top 15
    allMarkets.sort((a, b) => b.volume - a.volume);
    for (const m of allMarkets.slice(0, 15)) {
      trending.push(m.line);
    }
  } catch (e) {
    console.error("[Search] Polymarket fetch error:", e);
  }

  console.log(
    `[Search] Found ${matched.length} matched, ${trending.length} trending for: ${terms.join(", ")}`
  );
  return { matched, trending };
}
