"use client";

import Link from "next/link";

interface Leg {
  description: string;
  resolved: boolean;
  won: boolean;
}

interface ParlayCardProps {
  address: string;
  legs: Leg[];
  totalDeposits: string;
  depositorsCount: number;
  depositDeadline: number;
  settled: boolean;
  allLegsWon: boolean;
  combinedOdds?: number;
}

export default function ParlayCard({
  address,
  legs,
  totalDeposits,
  depositorsCount,
  depositDeadline,
  settled,
  allLegsWon,
  combinedOdds,
}: ParlayCardProps) {
  const isOpen = Date.now() / 1000 < depositDeadline && !settled;
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <Link href={`/parlay/${address}`}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-green-400/50 transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500 font-mono">{shortAddr}</span>
          {settled ? (
            <span
              className={`text-xs px-2 py-1 rounded-full ${allLegsWon ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}
            >
              {allLegsWon ? "WON" : "LOST"}
            </span>
          ) : isOpen ? (
            <span className="text-xs px-2 py-1 rounded-full bg-green-400/20 text-green-400">
              OPEN
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-400/20 text-yellow-400">
              IN PLAY
            </span>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {legs.map((leg, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">
                {leg.resolved ? (leg.won ? "+" : "x") : "-"}
              </span>
              <span className="text-sm text-gray-300 truncate">
                {leg.description}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-500">
            <span className="text-white font-medium">${totalDeposits}</span>{" "}
            USDC
          </div>
          <div className="text-gray-500">
            {depositorsCount} depositor{depositorsCount !== 1 ? "s" : ""}
          </div>
          {combinedOdds && (
            <div className="text-green-400 font-medium">
              {combinedOdds.toFixed(1)}x
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
