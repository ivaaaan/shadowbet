import { createPublicClient, decodeErrorResult, http, type Address, type WalletClient } from 'viem';
import { baseSepolia } from 'viem/chains';

export type UiMarket = {
    id: string;
    symbol: string;
    token: string;
    question: string;
    deadline: string;
    category: string;
    oracle: string;
    direction: number;
    pools: { yes: number; no: number };
    closesAt: string;
    resolved: boolean;
    status: number;
    winningDirection: number;
    resolvedPrice: number;
    committedVolume: number;
    revealedVolume: number;
};

export const bettingAbi = [
    { type: 'function', name: 'nextMarketId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    {
        type: 'function', name: 'markets', stateMutability: 'view',
        inputs: [{ type: 'uint256' }],
        outputs: [
            { name: 'name', type: 'string' },
            { name: 'symbol', type: 'string' },
            { name: 'quoteSymbol', type: 'string' },
            { name: 'direction', type: 'uint8' },
            { name: 'targetPrice', type: 'uint256' },
            { name: 'revealDeadline', type: 'uint64' },
            { name: 'resolutionDeadline', type: 'uint64' },
            { name: 'claimDeadline', type: 'uint64' },
            { name: 'createdAt', type: 'uint64' },
            { name: 'status', type: 'uint8' },
            { name: 'totalGreaterThan', type: 'uint128' },
            { name: 'totalLessThan', type: 'uint128' },
            { name: 'resolvedPrice', type: 'uint256' },
            { name: 'winningDirection', type: 'uint8' },
            { name: 'resolved', type: 'bool' },
        ],
    },
    { type: 'function', name: 'committedVolume', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
    { type: 'function', name: 'getRevealedVolume', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
    {
        type: 'function',
        name: 'bets',
        stateMutability: 'view',
        inputs: [
            { name: '_marketId', type: 'uint256' },
            { name: '_user', type: 'address' },
        ],
        outputs: [
            { name: 'commit', type: 'bytes32' },
            { name: 'amount', type: 'uint128' },
            { name: 'direction', type: 'uint8' },
            { name: 'revealed', type: 'bool' },
            { name: 'claimed', type: 'bool' },
        ],
    },
    {
        type: 'function',
        name: 'bet',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_marketId', type: 'uint256' },
            { name: '_commit', type: 'bytes32' },
            { name: '_amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'reveal',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_marketId', type: 'uint256' },
            { name: '_direction', type: 'uint8' },
            { name: '_salt', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'claim',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_marketId', type: 'uint256' },
        ],
        outputs: [],
    },
    // Events
    {
        type: 'event', name: 'MarketCreated', inputs: [
            { name: 'marketId', type: 'uint256', indexed: true },
            { name: 'name', type: 'string', indexed: false },
            { name: 'targetPrice', type: 'uint256', indexed: false },
            { name: 'revealDeadline', type: 'uint64', indexed: false },
        ]
    },
    {
        type: 'event', name: 'BetCommitted', inputs: [
            { name: 'marketId', type: 'uint256', indexed: true },
            { name: 'user', type: 'address', indexed: true },
            { name: 'amount', type: 'uint128', indexed: false },
            { name: 'commit', type: 'bytes32', indexed: false },
        ]
    },
    {
        type: 'event', name: 'BetRevealed', inputs: [
            { name: 'marketId', type: 'uint256', indexed: true },
            { name: 'user', type: 'address', indexed: true },
            { name: 'direction', type: 'uint8', indexed: false },
            { name: 'amount', type: 'uint128', indexed: false },
        ]
    },
    {
        type: 'event', name: 'MarketResolved', inputs: [
            { name: 'marketId', type: 'uint256', indexed: true },
            { name: 'winningDirection', type: 'uint8', indexed: false },
            { name: 'resolvedPrice', type: 'uint256', indexed: false },
        ]
    },
    {
        type: 'event', name: 'Claimed', inputs: [
            { name: 'marketId', type: 'uint256', indexed: true },
            { name: 'user', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
        ]
    },
] as const;

export const betCommittedEvent = {
    type: 'event',
    name: 'BetCommitted',
    inputs: [
        { name: 'marketId', type: 'uint256', indexed: true },
        { name: 'user', type: 'address', indexed: true },
        { name: 'amount', type: 'uint128', indexed: false },
        { name: 'commit', type: 'bytes32', indexed: false },
    ],
} as const;

export const BETTING_ADDRESS = (process.env.NEXT_PUBLIC_BETTING_ADDRESS as Address) || ('0x0000000000000000000000000000000000000000' as Address);
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS as Address) || ('0x0000000000000000000000000000000000000000' as Address);

export const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

const erc20Abi = [
    { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
    { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
    { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const;

async function waitUntilAllowanceAtLeast(params: { token: Address; owner: Address; spender: Address; minAmount: bigint; timeoutMs?: number; intervalMs?: number; }) {
    const { token, owner, spender, minAmount } = params;
    const timeoutMs = params.timeoutMs ?? 30_000;
    const intervalMs = params.intervalMs ?? 1_000;
    const start = Date.now();
    while (true) {
        const current: bigint = await publicClient.readContract({
            address: token,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [owner, spender],
        });
        if (current >= minAmount) return;
        if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for token allowance to update');
        await new Promise((r) => setTimeout(r, intervalMs));
    }
}

export type MarketTuple = readonly [
    string, // name
    string, // symbol
    string, // quoteSymbol
    number, // direction
    bigint, // targetPrice
    bigint, // revealDeadline (sec)
    bigint, // resolutionDeadline (sec)
    bigint, // claimDeadline (sec)
    bigint, // createdAt (sec)
    number, // status
    bigint, // totalGreaterThan
    bigint, // totalLessThan
    bigint, // resolvedPrice
    number, // winningDirection
    boolean, // resolved
];

export function mapTupleToUiMarket(tuple: MarketTuple, index: number, committed: bigint = BigInt(0), revealed: bigint = BigInt(0)): UiMarket {
    const [name, baseSymbol, quoteSymbol, _direction, _targetPrice, revealDeadline, resolutionDeadline, _claimDeadline, _createdAt, _status, totalGreaterThan, totalLessThan, resolvedPrice, winningDirection, resolved] = tuple;
    const toIso = (seconds: bigint) => new Date(Number(seconds) * 1000).toISOString();
    const toUsdc = (v: bigint) => Number(v) / 1_000_000;
    const showPair = (quoteSymbol ?? '').length > 0 && (quoteSymbol ?? '').toUpperCase() !== 'USD';
    const displaySymbol = showPair ? `${baseSymbol}/${quoteSymbol}` : baseSymbol;
    return {
        id: `m-${index}`,
        symbol: displaySymbol,
        token: USDC_ADDRESS,
        question: name,
        category: "Crypto",
        oracle: "RedStone",
        closesAt: toIso(revealDeadline),
        deadline: toIso(resolutionDeadline),
        status: _status,
        direction: _direction,
        resolved,
        winningDirection,
        pools: {
            yes: toUsdc(totalGreaterThan),
            no: toUsdc(totalLessThan),
        },
        resolvedPrice: Number(resolvedPrice),
        committedVolume: toUsdc(committed),
        revealedVolume: toUsdc(revealed),
    };
}

export async function getMarkets(): Promise<UiMarket[]> {
    const nextId = await publicClient.readContract({
        address: BETTING_ADDRESS,
        abi: bettingAbi,
        functionName: 'nextMarketId',
    });
    const bettingContract = {
        address: BETTING_ADDRESS,
        abi: bettingAbi,
    } as const;
    const calls = Array.from({ length: Number(nextId) }, (_, i) => ({
        ...bettingContract,
        functionName: 'markets' as const,
        args: [BigInt(i)],
    }));
    const [marketsResults, volumesResults] = await Promise.all([
        publicClient.multicall({ contracts: calls }),
        publicClient.multicall({
            contracts: [
                // committedVolume for each market
                ...Array.from({ length: Number(nextId) }, (_, i) => ({
                    ...bettingContract,
                    functionName: 'committedVolume' as const,
                    args: [BigInt(i)],
                })),
                // getRevealedVolume for each market
                ...Array.from({ length: Number(nextId) }, (_, i) => ({
                    ...bettingContract,
                    functionName: 'getRevealedVolume' as const,
                    args: [BigInt(i)],
                })),
            ],
        }),
    ]);

    const tuples = marketsResults
        .map(r => r.result)
        .filter((v): v is NonNullable<typeof v> => Array.isArray(v));
    const committedList: bigint[] = [];
    const revealedList: bigint[] = [];
    const half = Number(nextId);
    volumesResults.forEach((r, idx) => {
        if (r.result === undefined) return;
        if (idx < half) {
            committedList[idx] = r.result as bigint;
        } else {
            revealedList[idx - half] = r.result as bigint;
        }
    });
    return tuples.map((t, idx) => mapTupleToUiMarket(t as unknown as MarketTuple, idx, committedList[idx] ?? BigInt(0), revealedList[idx] ?? BigInt(0)));
}

export type BetParams = {
    walletClient: WalletClient;
    account?: Address;
    marketId: number | bigint;
    commit: `0x${string}`;
    amount: bigint; // token amount in smallest unit
    tokenAddress?: Address;
};

export async function approveAndBet({ walletClient, account, marketId, commit, amount, tokenAddress }: BetParams) {
    const caller = account ?? walletClient.account;
    if (!caller) throw new Error('Missing account for bet()');
    const token = tokenAddress ?? USDC_ADDRESS;
    if (token === '0x0000000000000000000000000000000000000000') throw new Error('Missing USDC token address. Set NEXT_PUBLIC_USDC_ADDRESS');

    const allowance: bigint = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [caller as Address, BETTING_ADDRESS],
    });
    console.log("allowance:", allowance, "amount:", amount);

    if (allowance < amount) {
        try {
            const { request: approveReq } = await publicClient.simulateContract({
                account: caller,
                address: token,
                abi: erc20Abi,
                functionName: 'approve',
                args: [BETTING_ADDRESS, amount],
            });
            const approveHash = await walletClient.writeContract(approveReq);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });
            // Some RPCs/indexers may lag; ensure on-chain allowance reflects the new amount before proceeding.
            await waitUntilAllowanceAtLeast({ token, owner: caller as Address, spender: BETTING_ADDRESS, minAmount: amount, timeoutMs: 45_000, intervalMs: 1_500 });
        } catch (e) {
            console.error(e);
            throw new Error('Failed to approve token allowance');
        }
    }


    const { request } = await publicClient.simulateContract({
        account: caller,
        address: BETTING_ADDRESS,
        abi: bettingAbi,
        functionName: 'bet',
        args: [BigInt(marketId), commit, amount],
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
}

export async function getUserBet(marketId: number | bigint, account: Address) {
    try {
        const result = await publicClient.readContract({
            address: BETTING_ADDRESS,
            abi: bettingAbi,
            functionName: 'bets',
            args: [BigInt(marketId), account],
        });
        const [commit, amount, direction, revealed, claimed] = result as unknown as readonly [`0x${string}`, bigint, number, boolean, boolean];
        const zeroCommit = `0x${''.padEnd(64, '0')}` as `0x${string}`;
        if (amount === BigInt(0) && (commit as string).toLowerCase() === zeroCommit) return null;
        return { amount, commit, direction, revealed, claimed };
    } catch {
        return null;
    }
}

export async function reveal({ walletClient, account, marketId, direction, salt }: { walletClient: WalletClient; account?: Address; marketId: number | bigint; direction: bigint | number; salt: bigint; }) {
    const caller = account ?? walletClient.account;
    if (!caller) throw new Error('Missing account for reveal()');

    const { request } = await publicClient.simulateContract({
        account: caller,
        address: BETTING_ADDRESS,
        abi: bettingAbi,
        functionName: 'reveal',
        args: [BigInt(marketId), Number(direction), salt],
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
}

export async function claim({ walletClient, account, marketId }: { walletClient: WalletClient; account?: Address; marketId: number | bigint; }) {
    const caller = account ?? walletClient.account;
    if (!caller) throw new Error('Missing account for claim()');

    const { request } = await publicClient.simulateContract({
        account: caller,
        address: BETTING_ADDRESS,
        abi: bettingAbi,
        functionName: 'claim',
        args: [BigInt(marketId)],
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
}

export type BettingEventName = 'MarketCreated' | 'BetCommitted' | 'BetRevealed' | 'MarketResolved' | 'Claimed';
export type BettingEventLog = { args?: { marketId?: bigint | number | string; user?: string } };
export function subscribeToBettingEvents(onEvent: (params: { name: BettingEventName; logs: BettingEventLog[] }) => void) {
    const unsubscribes: Array<() => void> = [];
    const add = (name: BettingEventName) => {
        const unwatch = publicClient.watchContractEvent({
            address: BETTING_ADDRESS,
            abi: bettingAbi,
            eventName: name,
            onLogs: (logs) => onEvent({ name, logs: logs as BettingEventLog[] }),
            pollingInterval: 4_000,
        });
        unsubscribes.push(unwatch);
    };
    add('MarketCreated');
    add('BetCommitted');
    add('BetRevealed');
    add('MarketResolved');
    add('Claimed');
    return () => unsubscribes.forEach((u) => { try { u(); } catch { } });
}