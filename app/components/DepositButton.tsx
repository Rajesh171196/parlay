"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CONTRACTS } from "@/lib/constants";
import { VAULT_ABI, ERC20_ABI } from "@/lib/contracts";

interface DepositButtonProps {
  vaultAddress: `0x${string}`;
  depositDeadline: number;
  executed: boolean;
}

export default function DepositButton({
  vaultAddress,
  depositDeadline,
  executed,
}: DepositButtonProps) {
  const [amount, setAmount] = useState("");
  const { address, isConnected } = useAccount();

  const { data: allowance } = useReadContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, vaultAddress] : undefined,
  });

  const { data: balance } = useReadContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const {
    writeContract: approve,
    data: approveTx,
    isPending: isApproving,
  } = useWriteContract();
  const {
    writeContract: deposit,
    data: depositTx,
    isPending: isDepositing,
  } = useWriteContract();

  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveTx,
  });
  const { isLoading: isDepositConfirming, isSuccess: depositSuccess } =
    useWaitForTransactionReceipt({ hash: depositTx });

  const isExpired = Date.now() / 1000 >= depositDeadline;
  const disabled = !isConnected || isExpired || executed;

  const parsedAmount = amount ? parseUnits(amount, 6) : BigInt(0);
  const needsApproval =
    allowance !== undefined && parsedAmount > 0 && allowance < parsedAmount;

  const handleAction = () => {
    if (!amount || parsedAmount === BigInt(0)) return;

    if (needsApproval) {
      approve({
        address: CONTRACTS.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [vaultAddress, parsedAmount],
      });
    } else {
      deposit({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [parsedAmount],
      });
    }
  };

  if (depositSuccess) {
    return (
      <div className="bg-brand-accent/10 border border-brand-accent/20 rounded-lg p-4 text-center">
        <p className="text-brand-accent text-sm">
          You&apos;re in! Deposited {amount} USDC
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={disabled}
            className="w-full bg-[#22222a] border border-[#2a2a30] rounded-lg px-4 py-3 text-[#e8e4dc] placeholder-[#4a4a50] focus:outline-none focus:border-brand-accent/50 disabled:opacity-50 text-sm"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a4a50] text-xs">
            USDC
          </span>
        </div>
        {balance !== undefined && (
          <button
            onClick={() => setAmount(formatUnits(balance, 6))}
            className="text-xs text-brand-accent hover:text-brand-accent/70"
          >
            MAX
          </button>
        )}
      </div>

      <button
        onClick={handleAction}
        disabled={disabled || !amount || parsedAmount === BigInt(0)}
        className="w-full bg-brand-accent text-[#1a1a1f] font-medium py-3 rounded-lg hover:bg-brand-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {isApproving || isApproveConfirming
          ? "Approving..."
          : isDepositing || isDepositConfirming
            ? "Depositing..."
            : needsApproval
              ? "Approve USDC"
              : isExpired
                ? "Window Closed"
                : executed
                  ? "Executed"
                  : "Ape In"}
      </button>
    </div>
  );
}
