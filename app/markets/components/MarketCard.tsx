"use client";

import { useEffect, useMemo, useState } from "react";
import redstone from "redstone-api";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler,
    Legend,
} from "chart.js";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import CommitBetDialog from "./CommitBetDialog";
import type { UiMarket } from "@/lib/marketsService";

function timeLeft(targetISO: string) {
    const target = new Date(targetISO).getTime();
    const ms = target - Date.now();
    if (ms <= 0) return "closed";
    const s = Math.floor(ms / 1000);
    const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

    // Under 1 hour: show minutes and seconds countdown
    if (s < 3600) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        if (m > 0) return `${plural(m, "minute")} ${plural(sec, "second")}`;
        return plural(sec, "second");
    }

    const days = Math.floor(s / 86400);
    if (days >= 30) {
        const months = Math.floor(days / 30);
        const remDays = days % 30;
        return remDays > 0
            ? `${plural(months, "month")} and ${plural(remDays, "day")}`
            : `${plural(months, "month")}`;
    }

    if (days >= 1) {
        const remHours = Math.floor((s % 86400) / 3600);
        return remHours > 0
            ? `${plural(days, "day")} ${plural(remHours, "hour")}`
            : `${plural(days, "day")}`;
    }

    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    return minutes > 0
        ? `${plural(hours, "hour")} ${plural(minutes, "minute")}`
        : `${plural(hours, "hour")}`;
}

export default function MarketCard({ m }: { m: UiMarket }) {
    // ensure chart.js scales are registered once
    ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);
    const [tick, setTick] = useState(0);
    const [prices, setPrices] = useState<number[] | null>(null);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);
    const tl = useMemo(() => timeLeft(m.closesAt), [m.closesAt]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const days = 30;
                const endDate = new Date();
                const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
                const display = (m.symbol || "ETH").toString().toUpperCase();
                const [base, quote] = display.includes('/') ? display.split('/') : [display, 'USD'];
                const baseSeries = await redstone.getHistoricalPrice(base, {
                    startDate,
                    endDate,
                    interval: 24 * 60 * 60 * 1000,
                    provider: "redstone",
                });
                const baseCloses: number[] = Array.isArray(baseSeries)
                    ? baseSeries.map((p: { value: number | string }) => (typeof p?.value === 'number' ? p.value : Number(p?.value)))
                        .filter((v: number) => Number.isFinite(v))
                    : [];
                let closes: number[] = baseCloses;
                if (quote && quote !== 'USD') {
                    const quoteSeries = await redstone.getHistoricalPrice(quote, {
                        startDate,
                        endDate,
                        interval: 24 * 60 * 60 * 1000,
                        provider: "redstone",
                    });
                    const quoteCloses: number[] = Array.isArray(quoteSeries)
                        ? quoteSeries.map((p: { value: number | string }) => (typeof p?.value === 'number' ? p.value : Number(p?.value)))
                            .filter((v: number) => Number.isFinite(v))
                        : [];
                    const len = Math.min(baseCloses.length, quoteCloses.length);
                    closes = Array.from({ length: len }, (_, i) => baseCloses[i] / quoteCloses[i]).filter((v) => Number.isFinite(v));
                }
                if (!cancelled) setPrices(closes);
            } catch {
                if (!cancelled) setPrices(null);
            }
        })();
        return () => { cancelled = true; };
    }, [m]);

    return (
        <Card className="group border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/10">
            <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">{m.category}</Badge>
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {tl}</span>
                </div>
                <CardTitle className="text-slate-100 text-base leading-snug">{m.question}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
                    <span>Oracle:</span>
                    <span className="text-slate-300">{m.oracle}</span>
                </div>
                <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Total volume</span>
                        <span className="text-slate-300">{m.committedVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span>
                    </div>
                </div>
                {prices && prices.length > 1 && (
                    <div className="mb-4 flex flex-col gap-2">
                        <div className="text-[10px] text-slate-400">Last 30 days price</div>
                        <div className="h-28">
                            <Line
                                data={{
                                    labels: prices.map((_, i) => `${i - prices.length + 1}d`),
                                    datasets: [
                                        {
                                            label: m.symbol || "Price",
                                            data: prices,
                                            borderColor: "rgba(52, 211, 153, 1)",
                                            backgroundColor: "rgba(52, 211, 153, 0.15)",
                                            tension: 0.3,
                                            pointRadius: 0,
                                            fill: true,
                                        },
                                    ],
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        x: { display: false },
                                        y: {
                                            ticks: {
                                                color: "#94a3b8",
                                                callback: (v) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 6 })}`,
                                            },
                                            grid: { color: "rgba(255,255,255,0.06)" },
                                        },
                                    },
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            mode: "index",
                                            intersect: false,
                                            callbacks: {
                                                label: (ctx) => `${Number(ctx.parsed.y).toLocaleString(undefined, { maximumFractionDigits: 6 })}`,
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                )}
                <CommitBetDialog m={m} />
            </CardContent>
        </Card>
    );
}

function MiniSparkline({ data }: { data: number[] }) {
    const w = 320;
    const h = 48;
    const pad = 4;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));
    const points = data.map((v, i) => {
        const x = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
        const y = pad + (1 - norm(v)) * (h - pad * 2);
        return `${x},${y}`;
    }).join(" ");
    const up = data[data.length - 1] >= data[0];
    return (
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="block">
            <polyline fill="none" stroke={up ? "#34d399" : "#f472b6"} strokeWidth="2" points={points} />
        </svg>
    );
}


