"use client";

import { useState, useRef, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { decodeEventLog } from "viem";
import { CONTRACTS } from "@/lib/constants";
import { FACTORY_ABI } from "@/lib/contracts";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ParlayAction {
  action: "create_parlay";
  legs: {
    conditionId: string;
    outcomeIndex: number;
    description: string;
  }[];
  combinedOdds: number;
  depositDeadline: number;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        'What outcomes do you want to parlay?\n\nTry: "bitcoin 150k + trump impeached" or "lakers nba + btc 200k"',
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ParlayAction | null>(null);
  const [createdAddress, setCreatedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isConnected, chain } = useAccount();

  const {
    writeContract,
    data: createTx,
    isPending: isCreating,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: createSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash: createTx });

  useEffect(() => {
    if (receipt && receipt.logs.length > 0) {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "ParlayCreated") {
            setCreatedAddress((decoded.args as { parlay: string }).parlay);
            return;
          }
        } catch {
          // not our event
        }
      }
      if (receipt.logs[0]?.topics[1]) {
        setCreatedAddress("0x" + receipt.logs[0].topics[1].slice(26));
      }
    }
  }, [receipt]);

  useEffect(() => {
    if (writeError) {
      const msg = writeError.message?.includes("User rejected")
        ? "Transaction rejected"
        : writeError.message?.includes("insufficient")
          ? "Insufficient MATIC for gas"
          : `Error: ${writeError.message?.slice(0, 100)}`;
      setError(msg);
    }
  }, [writeError]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingAction, error]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
      if (data.action) setPendingAction(data.action);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateParlay = () => {
    if (!pendingAction) return;
    setError(null);
    resetWrite();

    const legs = pendingAction.legs.map((leg) => ({
      conditionId: leg.conditionId as `0x${string}`,
      outcomeIndex: BigInt(leg.outcomeIndex),
      description: leg.description,
      resolved: false,
      won: false,
    }));

    writeContract({
      address: CONTRACTS.factory,
      abi: FACTORY_ABI,
      functionName: "createParlay",
      args: [legs, BigInt(pendingAction.depositDeadline)],
    });
  };

  const wrongChain = isConnected && chain?.id !== 137;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-brand-accent/20 text-[#e8e4dc] border border-brand-accent/30"
                  : "bg-[#22222a] text-[#c8c4bc] border border-[#2a2a30]"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#22222a] border border-[#2a2a30] rounded-xl px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-brand-accent/50 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-brand-accent/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-1.5 h-1.5 bg-brand-accent/50 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        {/* Parlay Action Card */}
        {pendingAction && !createSuccess && (
          <div className="bg-[#22222a] border border-brand-accent/20 rounded-xl p-5 max-w-[85%]">
            <h3 className="text-xs uppercase tracking-widest text-brand-accent mb-4">
              Your Parlay
            </h3>
            <div className="space-y-2 mb-4">
              {pendingAction.legs.map((leg, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm text-[#c8c4bc]"
                >
                  <span className="text-brand-warm text-xs font-medium w-5">
                    {i + 1}.
                  </span>
                  {leg.description}
                </div>
              ))}
            </div>
            <div className="text-sm text-[#6a6a70] mb-5 border-t border-[#2a2a30] pt-3">
              Combined odds{" "}
              <span className="text-brand-warm font-medium">
                {pendingAction.combinedOdds.toFixed(1)}x
              </span>
            </div>

            {!isConnected ? (
              <div className="space-y-3">
                <p className="text-xs text-brand-rose">
                  Connect wallet to deploy on Polygon
                </p>
                <ConnectButton />
              </div>
            ) : wrongChain ? (
              <p className="text-xs text-brand-rose">
                Switch to Polygon in your wallet
              </p>
            ) : (
              <button
                onClick={handleCreateParlay}
                disabled={isCreating || isConfirming}
                className="w-full bg-brand-accent text-[#1a1a1f] font-medium py-3 rounded-lg hover:bg-brand-accent/80 disabled:opacity-50 transition-colors"
              >
                {isCreating
                  ? "Confirm in wallet..."
                  : isConfirming
                    ? "Deploying..."
                    : "Deploy Parlay"}
              </button>
            )}

            {error && (
              <p className="text-xs text-brand-rose mt-3">{error}</p>
            )}
          </div>
        )}

        {/* Success */}
        {createSuccess && (
          <div className="bg-[#22222a] border border-brand-accent/30 rounded-xl p-5 max-w-[85%]">
            <h3 className="text-xs uppercase tracking-widest text-brand-accent mb-3">
              Parlay Deployed
            </h3>
            {createdAddress ? (
              <>
                <p className="text-sm text-[#8a8a90] mb-3">
                  Share this link — friends can ape in:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#1a1a1f] text-brand-accent px-3 py-2 rounded text-xs break-all border border-[#2a2a30]">
                    {typeof window !== "undefined" ? window.location.origin : ""}/parlay/{createdAddress}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/parlay/${createdAddress}`
                      );
                    }}
                    className="px-3 py-2 bg-[#2a2a30] rounded text-xs hover:bg-[#3a3a40] transition-colors text-[#8a8a90]"
                  >
                    Copy
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#8a8a90]">Transaction confirmed.</p>
                {createTx && (
                  <a
                    href={`https://polygonscan.com/tx/${createTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-accent underline mt-2 block"
                  >
                    View on Polygonscan
                  </a>
                )}
              </>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#2a2a30] p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Describe your parlay..."
            className="flex-1 bg-[#22222a] border border-[#2a2a30] rounded-lg px-4 py-3 text-[#e8e4dc] placeholder-[#4a4a50] focus:outline-none focus:border-brand-accent/50 text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-brand-accent text-[#1a1a1f] font-medium px-5 py-3 rounded-lg hover:bg-brand-accent/80 disabled:opacity-50 transition-colors text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
