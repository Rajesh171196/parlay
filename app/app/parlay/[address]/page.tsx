"use client";

import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { VAULT_ABI } from "@/lib/contracts";
import DepositButton from "@/components/DepositButton";

interface Leg {
  conditionId: string;
  outcomeIndex: bigint;
  description: string;
  resolved: boolean;
  won: boolean;
}

export default function ParlayPage() {
  const params = useParams();
  const address = params.address as `0x${string}`;

  const { data: status } = useReadContract({
    address,
    abi: VAULT_ABI,
    functionName: "getStatus",
  });

  const { data: legs } = useReadContract({
    address,
    abi: VAULT_ABI,
    functionName: "getLegs",
  });

  const { data: creator } = useReadContract({
    address,
    abi: VAULT_ABI,
    functionName: "creator",
  });

  if (!status || !legs) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[#6a6a70] text-sm">Loading parlay...</div>
      </div>
    );
  }

  const [
    executed,
    settled,
    allLegsWon,
    totalDeposits,
    depositPool,
    legsResolved,
    totalLegs,
    totalWinnings,
    depositDeadline,
    depositorsCount,
  ] = status;

  const isOpen = BigInt(Math.floor(Date.now() / 1000)) < depositDeadline && !settled;
  const shortCreator = creator
    ? `${(creator as string).slice(0, 6)}...${(creator as string).slice(-4)}`
    : "...";

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-[#e8e4dc]">Parlay</h1>
          <p className="text-xs text-[#4a4a50] font-mono mt-0.5">
            {(address as string).slice(0, 10)}...{(address as string).slice(-8)}
          </p>
        </div>
        {settled ? (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              allLegsWon
                ? "bg-brand-accent/15 text-brand-accent"
                : "bg-brand-rose/15 text-brand-rose"
            }`}
          >
            {allLegsWon ? "WON" : "LOST"}
          </span>
        ) : isOpen ? (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-brand-accent/15 text-brand-accent">
            OPEN
          </span>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-brand-warm/15 text-brand-warm">
            IN PLAY
          </span>
        )}
      </div>

      {/* Creator */}
      <div className="text-xs text-[#6a6a70] mb-6">
        by <span className="text-[#8a8a90] font-mono">{shortCreator}</span>
      </div>

      {/* Legs */}
      <div className="bg-[#22222a] border border-[#2a2a30] rounded-xl p-5 mb-5">
        <h2 className="text-xs uppercase tracking-widest text-[#6a6a70] mb-4">
          Legs ({Number(legsResolved)}/{Number(totalLegs)})
        </h2>
        <div className="space-y-2.5">
          {(legs as Leg[]).map((leg, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-[#1a1a1f] rounded-lg"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  leg.resolved
                    ? leg.won
                      ? "bg-brand-accent/15 text-brand-accent"
                      : "bg-brand-rose/15 text-brand-rose"
                    : "bg-[#2a2a30] text-[#6a6a70]"
                }`}
              >
                {leg.resolved ? (leg.won ? "W" : "L") : i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#c8c4bc]">{leg.description}</p>
                <p className="text-xs text-[#4a4a50] mt-0.5">
                  {Number(leg.outcomeIndex) === 1 ? "Yes" : "No"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {
            val: `$${formatUnits(totalDeposits, 6)}`,
            label: "Deposited",
          },
          { val: Number(depositorsCount).toString(), label: "Depositors" },
          {
            val: new Date(Number(depositDeadline) * 1000).toLocaleDateString(),
            label: "Deadline",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[#22222a] border border-[#2a2a30] rounded-lg p-3 text-center"
          >
            <div className="text-base font-medium text-brand-accent">
              {s.val}
            </div>
            <div className="text-[10px] text-[#6a6a70] mt-1 uppercase tracking-wider">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Winnings */}
      {settled && allLegsWon && totalWinnings > BigInt(0) && (
        <div className="bg-brand-accent/10 border border-brand-accent/20 rounded-xl p-5 mb-5 text-center">
          <div className="text-xs text-brand-accent uppercase tracking-widest mb-1">
            Total Winnings
          </div>
          <div className="text-2xl font-light text-brand-accent">
            ${formatUnits(totalWinnings, 6)} USDC
          </div>
        </div>
      )}

      {/* Deposit */}
      {isOpen && (
        <div className="mb-5">
          <h2 className="text-xs uppercase tracking-widest text-[#6a6a70] mb-3">
            Ape In
          </h2>
          <DepositButton
            vaultAddress={address}
            depositDeadline={Number(depositDeadline)}
            executed={executed}
          />
        </div>
      )}

      {/* Share */}
      <div className="bg-[#22222a] border border-[#2a2a30] rounded-xl p-4">
        <h2 className="text-xs uppercase tracking-widest text-[#6a6a70] mb-3">
          Share
        </h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-[#1a1a1f] text-brand-accent px-3 py-2 rounded text-xs break-all border border-[#2a2a30]">
            {typeof window !== "undefined"
              ? `${window.location.origin}/parlay/${address}`
              : `/parlay/${address}`}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/parlay/${address}`
              );
            }}
            className="px-3 py-2 bg-[#2a2a30] rounded text-xs hover:bg-[#3a3a40] transition-colors text-[#8a8a90]"
          >
            Copy
          </button>
        </div>
      </div>
    </main>
  );
}
