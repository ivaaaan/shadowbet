import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { getMarkets, type UiMarket } from "@/lib/marketsService";
import MarketCard from "./markets/components/MarketCard";
import Benefits from "./markets/components/Benefits";

// Quick blacklist: set NEXT_PUBLIC_MARKET_BLACKLIST to comma-separated IDs, e.g. "m-2,3,7"
// Accepts both full ids (e.g., "m-3") and numeric ids (e.g., "3")
const MARKET_BLACKLIST = new Set<string>(
    (process.env.NEXT_PUBLIC_MARKET_BLACKLIST || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
);

function isBlacklisted(m: UiMarket): boolean {
    const idStr = m.id;
    const numeric = String(Number((m.id || "").split("-")[1] || m.id));
    return MARKET_BLACKLIST.has(idStr) || MARKET_BLACKLIST.has(numeric);
}

export default async function Home() {
    const markets = await getMarkets();
    const sorted = [...markets].sort((a, b) => {
        const ai = Number((a.id || '').split('-')[1] || 0);
        const bi = Number((b.id || '').split('-')[1] || 0);
        return bi - ai;
    });
    const filtered = sorted.filter((m) => !isBlacklisted(m));
    const top = filtered; // show all; change to .slice(0, 6) to limit

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="max-w-3xl mx-auto text-center">
                <div className="inline-block px-3 py-1 text-xs rounded-full border mb-4">Hackathon Edition</div>
                <h1 className="text-4xl sm:text-5xl font-semibold mb-3 text-white">Bet privately</h1>
                <p className="opacity-80 mb-8 text-base sm:text-lg text-slate-300">
                    Commit your choice on-chain without revealing.
                </p>
                <div className="flex items-center justify-center">
                    <ConnectButton showBalance={false} chainStatus="icon" />
                </div>
                <div className="mt-6 text-sm">
                    Or browse <Link className="underline" href="/markets">all markets</Link>.
                </div>
            </div>

            <section id="markets" className="mt-12 flex flex-col gap-4">
                <div className="flex items-end justify-between">
                    <h2 className="text-2xl font-bold text-white">Live Markets</h2>
                    <Link href="/markets" className="text-sm text-cyan-300 hover:underline">View all</Link>
                </div>
                {top.length === 0 ? (
                    <div className="text-slate-400">No markets available.</div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {top.map((m) => (
                            <MarketCard key={m.id} m={m} />
                        ))}
                    </div>
                )}
                <Benefits />
            </section>
        </div>
    );
}


