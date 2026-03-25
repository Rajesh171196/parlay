import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto px-4">
      {/* Hero */}
      <section className="py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6 text-[#e8e4dc]">
          Create Parlays.{" "}
          <span className="text-brand-accent">Share.</span>{" "}
          <span className="text-brand-warm">Earn.</span>
        </h1>
        <p className="text-lg text-[#8a8a90] max-w-xl mx-auto mb-10 leading-relaxed">
          Combine Polymarket outcomes into custom parlays.
          Share with friends. Earn 1% on every deposit.
        </p>
        <Link
          href="/create"
          className="inline-block bg-brand-accent text-[#1a1a1f] font-medium text-sm px-6 py-3 rounded-lg hover:bg-brand-accent/80 transition-colors"
        >
          Create a Parlay
        </Link>
      </section>

      {/* How it Works */}
      <section className="py-16 border-t border-[#2a2a30]">
        <h2 className="text-sm uppercase tracking-widest text-[#6a6a70] text-center mb-12">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              n: "1",
              title: "Build",
              desc: "Chat with AI to combine multiple Polymarket outcomes into one parlay bet.",
              color: "text-brand-accent",
            },
            {
              n: "2",
              title: "Share",
              desc: "Every parlay gets a unique link. Share it anywhere. Friends ape in with USDC.",
              color: "text-brand-warm",
            },
            {
              n: "3",
              title: "Earn",
              desc: "You earn 1% of every USDC deposited into your parlay. Create viral bets, get paid.",
              color: "text-brand-rose",
            },
          ].map((step) => (
            <div
              key={step.n}
              className="bg-[#22222a] border border-[#2a2a30] rounded-lg p-5"
            >
              <div className={`text-xs font-medium ${step.color} mb-3`}>
                Step {step.n}
              </div>
              <h3 className="text-base font-medium mb-2 text-[#e8e4dc]">
                {step.title}
              </h3>
              <p className="text-sm text-[#8a8a90] leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-t border-[#2a2a30]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { val: "$0", label: "Volume" },
            { val: "0", label: "Parlays" },
            { val: "0", label: "Users" },
            { val: "$0", label: "Creator Earnings" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-light text-brand-accent">
                {stat.val}
              </div>
              <div className="text-xs text-[#6a6a70] mt-1 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[#2a2a30] text-center text-[#4a4a50] text-xs">
        UGP — User Generated Parlays. Polygon. Polymarket liquidity.
      </footer>
    </main>
  );
}
