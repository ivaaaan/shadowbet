'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EyeOff, Zap, Network, Shield, Coins, Lock } from "lucide-react";

export default function Benefits() {
    const items = [
        { icon: <EyeOff className="h-5 w-5" />, title: "Privacy by design", body: "Bets remain hidden until reveal. No frontrunning and herding" },
        { icon: <Network className="h-5 w-5" />, title: "Oracle‑resolved", body: "Outcomes decided via transparent RedStone oracles, minimizing governance drama." },
        { icon: <Lock className="h-5 w-5" />, title: "Permissionless", body: "Anyone can resolve a market with no centralized escrow risk." },
    ];
    return (

        <section id="benefits">
            < h2 className="text-2xl font-bold text-white mb-6" >Why</h2 >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((b, i) => (
                    <Card key={i} className="border-white/10 bg-white/5">
                        <CardHeader className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-base text-fuchsia-300">{b.icon} <span className="text-sm uppercase tracking-wide">{b.title}</span></CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-300 text-sm">{b.body}</CardContent>
                    </Card>
                ))}
            </div>
        </section >
    );
}