"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="border-b border-[#2a2a30] bg-[#1a1a1f]/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-semibold tracking-tight text-brand-accent">
            UGP
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <Link
              href="/create"
              className="text-[#8a8a90] hover:text-[#e8e4dc] transition-colors"
            >
              Create
            </Link>
            <Link
              href="/"
              className="text-[#8a8a90] hover:text-[#e8e4dc] transition-colors"
            >
              Explore
            </Link>
          </nav>
        </div>
        <ConnectButton
          chainStatus="icon"
          accountStatus="address"
          showBalance={false}
        />
      </div>
    </header>
  );
}
