import type { Metadata } from "next";
import "./globals.css";
import WalletProvider from "@/components/providers/WalletProvider";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "UGP - User Generated Parlays",
  description:
    "Create custom parlays on Polymarket. Share with friends. Earn 1% on every deposit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#1a1a1f] text-[#e8e4dc]">
        <WalletProvider>
          <Header />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
