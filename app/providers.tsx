"use client";
import { PropsWithChildren, useMemo, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia, optimism, arbitrum, polygon, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID;

const chains = [mainnet, optimism, arbitrum, polygon, sepolia, baseSepolia] as const;

const transports = chains.reduce<Record<number, ReturnType<typeof http>>>((acc, chain) => {
    acc[chain.id] = chain.id === baseSepolia.id ? http("https://sepolia.base.org") : http();
    return acc;
}, {});

const baseConnectors = [injected({ shimDisconnect: true })];

const connectors = projectId
    ? [...baseConnectors, walletConnect({ projectId })]
    : baseConnectors;

const config = createConfig({
    chains,
    connectors,
    transports,
    ssr: true,
});

export default function Providers({ children }: PropsWithChildren) {
    const [queryClient] = useState(() => new QueryClient());
    const theme = useMemo(
        () =>
            lightTheme({
                borderRadius: "large",
                overlayBlur: "small",
                accentColor: "#2563eb",
            }),
        []
    );

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}


