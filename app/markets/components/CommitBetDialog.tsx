"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Hash } from "lucide-react";
import { formatUnits, keccak256, encodePacked, parseUnits } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { approveAndBet, claim, getUserBet, reveal, subscribeToBettingEvents, type UiMarket } from "@/lib/marketsService";

function cryptoRandomSalt(bytes = 16) {
    const a = new Uint8Array(bytes);
    (globalThis.crypto || window.crypto).getRandomValues(a);
    return Array.from(a).map(x => x.toString(16).padStart(2, '0')).join('');
}

export function CommitBetDialog({ m }: { m: UiMarket }) {
    const [open, setOpen] = useState(false);
    const [_, setTick] = useState(0);
    const { address } = useAccount();
    const [userBet, setUserBet] = useState<{ amount: bigint; commit: `0x${string}`; direction?: number; revealed?: boolean; claimed?: boolean } | null>(null);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);
    const revealOpen = useMemo(() => Date.now() >= new Date(m.closesAt).getTime(), [m.closesAt]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!address) { setUserBet(null); return; }
                const marketIndex = Number((m.id || "").split("-")[1] || 0);
                const bet = await getUserBet(marketIndex, address);
                if (!cancelled) setUserBet(bet);
            } catch {
                if (!cancelled) setUserBet(null);
            }
        })();
        const unsubscribe = subscribeToBettingEvents(async ({ logs }) => {
            if (!address) return;
            // Filter by this market or by this user to reduce noise
            const marketIndex = Number((m.id || "").split("-")[1] || 0);
            const relevant = logs.some((log) => {
                try {
                    const args = (log as { args?: { marketId?: bigint | number | string; user?: string } }).args || {};
                    //eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mid = Number(args?.marketId ?? (args as any)?.marketId?.toString?.() ?? -1);
                    const user = (args?.user || '').toLowerCase();
                    if (!Number.isFinite(mid)) return false;
                    // Update if this market or if user is involved
                    return mid === marketIndex || user === (address as string).toLowerCase();
                } catch { return false; }
            });
            if (!relevant) return;
            try {
                const bet = await getUserBet(marketIndex, address);
                if (!cancelled) setUserBet(bet);
            } catch { }
        });
        return () => { cancelled = true; unsubscribe(); };
    }, [address, m.id]);

    const committed = !!userBet;
    const hasRevealed = !!userBet?.revealed;
    const isResolved = m.status === 1;
    const isCancelled = m.status === 2;
    const isWinner = committed && hasRevealed && typeof userBet?.direction === 'number' && typeof m.winningDirection === 'number' && userBet!.direction === m.winningDirection;

    const { ctaLabel, ctaClasses } = useMemo(() => {
        // defaults: commit state
        let label = "Commit a bet";
        let classes = "mt-4 w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90";

        if (!committed) {
            return { ctaLabel: label, ctaClasses: classes };
        }

        if (!revealOpen) {
            label = "View your bet";
            classes = "mt-4 w-full bg-white/10 text-white hover:bg-white/20";
            return { ctaLabel: label, ctaClasses: classes };
        }

        if (revealOpen && !hasRevealed) {
            label = "Reveal bet";
            classes = "mt-4 w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90";
            return { ctaLabel: label, ctaClasses: classes };
        }

        if (isCancelled) {
            label = userBet?.claimed ? "Refund claimed" : "Claim refund";
            classes = userBet?.claimed
                ? "mt-4 w-full bg-white/10 text-white"
                : "mt-4 w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:opacity-90";
            return { ctaLabel: label, ctaClasses: classes };
        }

        if (isResolved) {
            if (isWinner) {
                label = userBet?.claimed ? "Reward claimed" : "Claim reward";
                classes = userBet?.claimed
                    ? "mt-4 w-full bg-white/10 text-white"
                    : "mt-4 w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:opacity-90";
            } else {
                label = "Your bet was wrong";
                classes = "mt-4 w-full bg-rose-500/20 text-rose-200 hover:bg-rose-500/30";
            }
            return { ctaLabel: label, ctaClasses: classes };
        }

        // Fallback while waiting for resolution
        label = "View your bet";
        classes = "mt-4 w-full bg-white/10 text-white hover:bg-white/20";
        return { ctaLabel: label, ctaClasses: classes };
    }, [committed, revealOpen, hasRevealed, isResolved, isCancelled, isWinner, userBet?.claimed]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={ctaClasses}>
                    {ctaLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border-white/10 text-slate-200 w-[92vw] max-w-lg sm:max-w-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{revealOpen ? 'Reveal your bet' : 'Commit a bet'}</DialogTitle>
                    <DialogDescription>
                        {revealOpen ? 'Reveal your committed side to count towards the pool.' : 'Publish a commitment hash now. Reveal after resolution to claim rewards.'}
                    </DialogDescription>
                </DialogHeader>
                <details className="mb-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                    <summary className="cursor-pointer select-none text-slate-400">Debug</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] text-slate-300">{JSON.stringify(m, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)}</pre>
                </details>
                <CommitBetDialogContent m={m} revealOpen={revealOpen} onCommitted={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}

function CommitBetDialogContent({ m, onCommitted, revealOpen }: { m: UiMarket, onCommitted?: () => void, revealOpen: boolean }) {
    const [side, setSide] = useState("YES");
    const [amount, setAmount] = useState(150);
    const [salt, setSalt] = useState(cryptoRandomSalt());
    const [saltLoaded, setSaltLoaded] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [existing, setExisting] = useState<{ amount: bigint; commit: `0x${string}`; direction?: number; revealed?: boolean; claimed?: boolean } | null>(null);
    const [revealing, setRevealing] = useState(false);
    const [revealHash, setRevealHash] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [claimHash, setClaimHash] = useState<string | null>(null);

    const { data: walletClient } = useWalletClient();
    const { address } = useAccount();

    let directionValue = 0;
    switch (side) {
        case "YES":
            directionValue = m.direction == 1 ? 1 : 0;
            break;
        case "NO":
            directionValue = m.direction == 1 ? 0 : 1;
            break;
    }

    useEffect(() => {
        try {
            const key = `bet-salt-${m.id}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                setSalt(saved);
            } else {
                // Persist the initially generated salt only if nothing was saved yet
                localStorage.setItem(key, salt);
            }
        } catch { }
        finally {
            setSaltLoaded(true);
        }
    }, [m.id]);
    useEffect(() => {
        if (!saltLoaded) return;
        try { localStorage.setItem(`bet-salt-${m.id}`, salt); } catch { }
    }, [salt, m.id, saltLoaded]);

    const commitment = useMemo(() => {
        try {
            if (!address) return "0x";
            const saltBig = BigInt('0x' + (salt.startsWith('0x') ? salt.slice(2) : salt));
            return keccak256(encodePacked(['uint8', 'uint256', 'address'], [directionValue, saltBig, address]));
        } catch { return "0x"; }
    }, [directionValue, salt, address]);
    const committed = !!existing;
    const hasRevealed = !!existing?.revealed;
    const commitmentToShow = committed ? (existing!.commit) : commitment;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!address) { setExisting(null); return; }
                const marketIndex = Number((m.id || "").split("-")[1] || 0);
                const bet = await getUserBet(marketIndex, address);
                if (!cancelled) setExisting(bet);
            } catch (e) {
                if (!cancelled) setExisting(null);
            }
        })();
        return () => { cancelled = true; };
    }, [address, m.id]);

    async function onCommit() {
        try {
            setSubmitError(null);
            setSubmitting(true);
            setTxHash(null);
            if (!walletClient || !address) throw new Error("Connect a wallet");
            if (!amount || Number(amount) <= 0) throw new Error("Enter amount > 0");
            if (!commitment || commitment === "0x") throw new Error("Invalid commitment");
            if (existing) throw new Error("You have already committed a bet for this market");
            const marketIndex = Number((m.id || "").split("-")[1] || 0);
            const amountU6 = parseUnits(String(amount), 6);
            const { hash } = await approveAndBet({ walletClient, account: address, marketId: marketIndex, commit: commitment as `0x${string}`, amount: amountU6 });
            setTxHash(hash);
            onCommitted?.();
        } catch (e) {
            setSubmitError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    async function onReveal() {
        try {
            setSubmitError(null);
            setRevealing(true);
            setRevealHash(null);
            if (!walletClient || !address) throw new Error("Connect a wallet");
            const marketIndex = Number((m.id || "").split("-")[1] || 0);
            const saltBig = BigInt('0x' + (salt.startsWith('0x') ? salt.slice(2) : salt));
            const { hash } = await reveal({ walletClient, account: address, marketId: marketIndex, direction: directionValue, salt: saltBig });
            setRevealHash(hash);
            onCommitted?.();
        } catch (e) {
            setSubmitError((e as Error).message);
        } finally {
            setRevealing(false);
        }
    }

    async function onClaim() {
        try {
            setSubmitError(null);
            setClaiming(true);
            setClaimHash(null);
            if (!walletClient || !address) throw new Error("Connect a wallet");
            const marketIndex = Number((m.id || "").split("-")[1] || 0);
            const { hash } = await claim({ walletClient, account: address, marketId: marketIndex });
            setClaimHash(hash);
            onCommitted?.();
        } catch (e) {
            setSubmitError((e as Error).message);
        } finally {
            setClaiming(false);
        }
    }

    if (committed && !revealOpen) {
        return (
            <div className="space-y-4">
                <details className="mb-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                    <summary className="cursor-pointer select-none text-slate-400">Debug: Your bet</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] text-slate-300">{JSON.stringify(existing, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)}</pre>
                </details>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-2 text-slate-300 text-sm"><Hash className="h-4 w-4" /> Your commitment</div>
                    <code className="mt-2 block break-all text-xs text-slate-200">{existing!.commit}</code>
                    <div className="mt-3 text-xs text-slate-400">Amount: <span className="text-slate-300">{formatUnits(existing!.amount, 6)} USDC</span></div>
                    <div className="mt-2 text-xs text-slate-400">Reveal will open after the reveal deadline.</div>
                </div>
            </div>
        );
    }

    const canClaim = Boolean(
        m.resolved &&
        typeof m.winningDirection === 'number' &&
        existing &&
        existing.revealed &&
        typeof existing.direction === 'number' &&
        !existing.claimed &&
        existing.direction === m.winningDirection
    );


    if (committed && revealOpen && hasRevealed && !canClaim) {
        return (
            <div className="space-y-4">
                <details className="mb-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                    <summary className="cursor-pointer select-none text-slate-400">Debug: Your bet</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] text-slate-300">{JSON.stringify(existing, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)}</pre>
                </details>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="text-emerald-200 text-sm">You have revealed your bet.</div>
                    <div className="mt-2 text-xs text-slate-300">Direction: {existing!.direction === 1 ? 'YES (GreaterThan)' : 'NO (LessThan)'}; Amount: {formatUnits(existing!.amount, 6)} USDC</div>
                    <div className="mt-2 text-xs text-slate-400">{m.resolved ? 'Market resolved.' : 'Waiting for market resolution…'}</div>
                </div>
            </div>
        );
    }

    if (committed && hasRevealed && canClaim) {
        return (
            <div className="space-y-4">
                <details className="mb-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                    <summary className="cursor-pointer select-none text-slate-400">Debug: Your bet</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] text-slate-300">{JSON.stringify(existing, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)}</pre>
                </details>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="text-emerald-200 text-sm">You won! Claim your reward.</div>
                    <div className="mt-2 text-xs text-slate-300">Reward: {formatUnits((() => {
                        try {
                            const toU6 = (v: number) => BigInt(Math.round(v * 1_000_000));
                            const winnersPoolU6 = m.winningDirection === 0 ? toU6(m.pools.yes) : toU6(m.pools.no);
                            const losersPoolU6 = m.winningDirection === 0 ? toU6(m.pools.no) : toU6(m.pools.yes);
                            const revealedTotalU6 = toU6(m.revealedVolume);
                            const committedTotalU6 = toU6(m.committedVolume);
                            const unrevealedU6 = committedTotalU6 > revealedTotalU6 ? (committedTotalU6 - revealedTotalU6) : BigInt(0);
                            const losersWithForfeitU6 = losersPoolU6 + unrevealedU6;
                            const userAmtU6 = BigInt(existing!.amount);
                            if (winnersPoolU6 === BigInt(0)) return userAmtU6;
                            const bonusU6 = (losersWithForfeitU6 * userAmtU6) / winnersPoolU6;
                            return userAmtU6 + bonusU6;
                        } catch { return BigInt(existing!.amount); }
                    })(), 6)} USDC</div>
                    <div className="mt-3">
                        <Button disabled={claiming || existing!.claimed} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:opacity-90" onClick={onClaim}>
                            {existing!.claimed ? 'Already claimed' : (claiming ? 'Claiming…' : 'Claim')}
                        </Button>
                    </div>
                    {claimHash && (
                        <div className="mt-2 text-emerald-400 text-xs break-all">Claim Tx: {claimHash}</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <details className="mb-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                <summary className="cursor-pointer select-none text-slate-400">Debug: Your bet</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] text-slate-300">{JSON.stringify(existing, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)}</pre>
            </details>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {!revealOpen && (
                        <div className="flex flex-col gap-2 w-full">
                            <Label>Market</Label>
                            <Input readOnly value={m.question} className="bg-black/30 border-white/10 text-slate-200" />
                        </div>
                    )}
                    <div className={`flex flex-col w-full${revealOpen ? "" : " sm:w-1/2"} gap-2`}>
                        <Label>Side</Label>
                        <Select value={side} onValueChange={setSide}>
                            <SelectTrigger className="bg-black/30 border-white/10 text-slate-200"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                <SelectItem value="YES">YES</SelectItem>
                                <SelectItem value="NO">NO</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {!revealOpen && (
                    <div className="flex flex-col w-full gap-2">
                        <Label>Stake (USDC)</Label>
                        <Input value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="bg-black/30 border-white/10 text-slate-200" />
                    </div>
                )}
                <div className="flex flex-col w-full gap-2">
                    <Label>Secret salt</Label>
                    <div className="flex gap-2">
                        <Input value={salt} onChange={(e) => setSalt(e.target.value)} className="bg-black/30 border-white/10 text-slate-200" />
                        <Button type="button" variant="secondary" className="bg-white/10 text-white hover:bg-white/20" onClick={() => setSalt(cryptoRandomSalt())}>New</Button>
                    </div>
                </div>
            </div>

            {!revealOpen && existing && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 text-xs">
                    You already committed a bet for this market. Amount: {formatUnits(existing.amount, 6)} USDC.
                </div>
            )}

            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-2 text-slate-300 text-sm"><Hash className="h-4 w-4" /> Commitment hash</div>
                <code className="mt-2 block break-all text-xs text-slate-200">{commitmentToShow}</code>
                <div className="mt-3 text-xs text-slate-400 break-words">Payload: <span className="text-slate-300 break-words">encodePacked(uint8 direction={directionValue}, uint256 salt, address user)</span></div>
            </div>
            {submitError && (
                <div className="text-red-400 text-xs">{submitError}</div>
            )}
            {txHash && (
                <div className="text-emerald-400 text-xs break-all">Tx: {txHash}</div>
            )}
            {!revealOpen && (
                <DialogFooter>
                    <Button disabled={submitting || !!existing} className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90" onClick={onCommit}>
                        {existing ? "Already committed" : (submitting ? "Submitting…" : "Commit")}
                    </Button>
                </DialogFooter>
            )}
            {revealOpen && !hasRevealed && (
                <DialogFooter>
                    <Button disabled={revealing} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90" onClick={onReveal}>
                        {revealing ? "Revealing…" : "Reveal"}
                    </Button>
                </DialogFooter>
            )}
            {revealHash && (
                <div className="text-emerald-400 text-xs break-all">Reveal Tx: {revealHash}</div>
            )}
        </div>
    );
}

export default CommitBetDialog;


