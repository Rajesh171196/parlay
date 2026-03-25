import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { legs, depositDeadline } = await req.json();

    // Validate legs
    if (!Array.isArray(legs) || legs.length === 0) {
      return NextResponse.json({ error: "At least one leg required" }, { status: 400 });
    }

    if (legs.length > 10) {
      return NextResponse.json({ error: "Maximum 10 legs" }, { status: 400 });
    }

    for (const leg of legs) {
      if (!leg.conditionId || leg.outcomeIndex === undefined || !leg.description) {
        return NextResponse.json({ error: "Invalid leg format" }, { status: 400 });
      }
    }

    if (!depositDeadline || depositDeadline <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: "Deadline must be in the future" }, { status: 400 });
    }

    // Return validated data for frontend to execute transaction
    return NextResponse.json({
      legs: legs.map((leg: { conditionId: string; outcomeIndex: number; description: string }) => ({
        conditionId: leg.conditionId,
        outcomeIndex: leg.outcomeIndex,
        description: leg.description,
        resolved: false,
        won: false,
      })),
      depositDeadline,
    });
  } catch (error) {
    console.error("Create parlay error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
