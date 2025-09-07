"use client";

import { useEffect, useState } from "react";
import { getMarkets, subscribeToBettingEvents, type UiMarket } from "@/lib/marketsService";

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
import MarketCard from "./components/MarketCard";
import Benefits from "./components/Benefits";

export default function MarketsPage() {
    const [markets, setMarkets] = useState<UiMarket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const mapped = await getMarkets();
                const sorted = [...mapped].sort((a, b) => {
                    const ai = Number((a.id || '').split('-')[1] || 0);
                    const bi = Number((b.id || '').split('-')[1] || 0);
                    return bi - ai;
                });
                const filtered = sorted.filter((m) => !isBlacklisted(m));
                if (!cancelled) setMarkets(filtered);
            } catch (e) {
                if (!cancelled) setError((e as Error).message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        const unsubscribe = subscribeToBettingEvents(async () => {
            try {
                const mapped = await getMarkets();
                const sorted = [...mapped].sort((a, b) => {
                    const ai = Number((a.id || '').split('-')[1] || 0);
                    const bi = Number((b.id || '').split('-')[1] || 0);
                    return bi - ai;
                });
                const filtered = sorted.filter((m) => !isBlacklisted(m));
                if (!cancelled) setMarkets(filtered);
            } catch { }
        });
        return () => { cancelled = true; unsubscribe(); };
    }, []);

    return (
        <section id="markets" className="flex flex-col gap-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-end justify-between">
                <h2 className="text-2xl font-bold text-white">Live Markets</h2>
            </div>
            {error && (
                <div className="text-red-400 text-sm mb-4">{error}</div>
            )}
            {loading ? (
                <div className="text-slate-400">Loading markets…</div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {markets.map((m) => (
                        <MarketCard key={m.id} m={m} />
                    ))}
                </div>
            )}
            <Benefits />
        </section>
    );
}

