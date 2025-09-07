"use client";
import { PropsWithChildren, useMemo, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia, optimism, arbitrum, polygon, baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, okxWallet, rabbyWallet, bybitWallet, binanceWallet, phantomWallet } from '@rainbow-me/rainbowkit/wallets';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { coinbaseWallet } from '@rainbow-me/rainbowkit/wallets';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID;

const chains = [mainnet, optimism, arbitrum, polygon, sepolia, baseSepolia] as const;

const transports = chains.reduce<Record<number, ReturnType<typeof http>>>((acc, chain) => {
    acc[chain.id] = chain.id === baseSepolia.id ? http("https://sepolia.base.org") : http();
    return acc;
}, {});

const connectors = connectorsForWallets(
    [
        {
            groupName: 'Recommended',
            wallets: [metaMaskWallet, rabbyWallet, okxWallet, coinbaseWallet,],
        },
    ],
    {
        appName: 'ShadowBet',
        projectId: projectId || '',
    }
);


const config = createConfig({
    chains,
    connectors: connectors,
    transports,
    ssr: true,
});



export default function Providers({ children }: PropsWithChildren) {
    const [queryClient] = useState(() => new QueryClient());
    const theme = useMemo(
        () =>
            darkTheme({
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


