import React from "react";
import { EyeOff, Lock } from "lucide-react";

export function Hero() {
    return (
        <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid lg:grid-cols-1 gap-10 items-center">
                <div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">ShadowBet <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">Prediction Market</span></h1>
                    <p className="mt-5 text-lg text-slate-300 max-w-xl">
                        Commit your bet privately, reveal only when the market resolves, and claim your rewards. MEV‑resilient, non‑custodial, and composable on-chain.
                    </p>
                    <div className="mt-6 flex items-center gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1"><Lock className="h-4 w-4" /> Commit‑Reveal</div>
                        <div className="flex items-center gap-1"><EyeOff className="h-4 w-4" /> Private by default</div>
                    </div>
                </div>
                <div className="absolute -inset-2 -z-10 rounded-3xl bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 blur-2xl" />
            </div>
        </section>
    );
}