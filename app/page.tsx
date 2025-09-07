"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useReadContract } from "wagmi";

export default function Home() {
    const { isConnected } = useAccount();
    const router = useRouter();

    useEffect(() => {
        if (isConnected) router.replace("/markets");
    }, [isConnected, router]);

    // Example: read markets from a contract (replace abi/address/functionName as needed)
    const marketHubAbi = [
        {
            type: "function",
            stateMutability: "view",
            name: "getMarkets",
            inputs: [],
            outputs: [
                {
                    type: "tuple[]",
                    components: [
                        { name: "id", type: "string" },
                        { name: "question", type: "string" },
                        { name: "deadline", type: "uint256" },
                    ],
                },
            ],
        },
    ] as const;

    const MARKET_HUB_ADDRESS = "0x0000000000000000000000000000000000000000" as const; // TODO: replace

    const { data: marketsData, error: marketsError } = useReadContract({
        abi: marketHubAbi,
        address: MARKET_HUB_ADDRESS,
        functionName: "getMarkets",
        args: [],
    });

    return (
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
            <div className="inline-block px-3 py-1 text-xs rounded-full border mb-4">Hackathon Edition</div>
            <h1 className="text-4xl sm:text-5xl font-semibold mb-3">
                Bet privately
            </h1>
            <p className="opacity-80 mb-8 text-base sm:text-lg">
                Commit your choice on-chain without revealing.
            </p>
            <div className="flex items-center justify-center">
                <ConnectButton showBalance={false} chainStatus="icon" />
            </div>
            <div className="mt-6 text-sm">
                Or browse <Link className="underline" href="/markets">markets</Link> first.
            </div>
            {/* Example output of the contract call (for development) */}
            <div className="mt-10 text-left">
                <div className="text-xs opacity-70 mb-2">Example: read markets via contract</div>
                {marketsError ? (
                    <div className="text-red-400 text-sm">{String(marketsError)}</div>
                ) : (
                    <pre className="bg-black/40 p-3 rounded text-xs overflow-auto">
                        {JSON.stringify(marketsData ?? null, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}


