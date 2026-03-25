import { NextRequest, NextResponse } from "next/server";

const GAMMA_API = "https://gamma-api.polymarket.com";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const conditionId = req.nextUrl.searchParams.get("conditionId");

  try {
    if (conditionId) {
      const res = await fetch(
        `${GAMMA_API}/markets?condition_id=${conditionId}`
      );
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (query) {
      const res = await fetch(
        `${GAMMA_API}/events?title_like=${encodeURIComponent(query)}&active=true&closed=false&limit=10`
      );
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Provide ?q= or ?conditionId=" }, { status: 400 });
  } catch (error) {
    console.error("Polymarket API error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
