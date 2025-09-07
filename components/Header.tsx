"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Github } from "lucide-react";
import { Wallet2 } from "lucide-react";



export function Header() {

    return (
        <div className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 border-b border-white/10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500" />
                        <span className="text-lg font-bold tracking-tight text-white">ShadowBet</span>
                        <Badge variant="secondary" className="ml-2 bg-white/10 text-white">alpha</Badge>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
                        <a href="#markets" className="hover:text-white">Markets</a>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ConnectButton showBalance={false} chainStatus="icon" />
                </div>
            </div>
        </div>
    );
}


