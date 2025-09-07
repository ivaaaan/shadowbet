import { keccak256, stringToHex } from "viem";

export type Market = {
    id: string;
    question: string;
    deadline: string; // ISO date string
};

export const markets: Market[] = [
    {
        id: "btc-105k-2025-12-20",
        question: "Will Bitcoin price be > $105,000 on 20.12.25?",
        deadline: "2025-12-20T00:00:00.000Z",
    },
    {
        id: "eth-10k-2026-01-01",
        question: "Will Ethereum price be > $10,000 on 01.01.26?",
        deadline: "2026-01-01T00:00:00.000Z",
    },
];

export type Choice = "yes" | "no";

export function computeCommitHash(
    marketId: string,
    choice: Choice,
    emojiSalt: string,
    bettor: string
) {
    const preimage = `${marketId}|${choice}|${emojiSalt}|${bettor.toLowerCase()}`;
    return keccak256(stringToHex(preimage));
}

export async function commitBet(
    marketId: string,
    commitHash: `0x${string}`
): Promise<{ txHash: `0x${string}` }>
// In a real integration, call the contract; here, mock a tx hash
{
    await new Promise((r) => setTimeout(r, 600));
    const txHash = ("0x" + commitHash.slice(2, 18).padEnd(66, "0")) as `0x${string}`;
    return { txHash };
}


