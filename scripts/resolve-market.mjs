import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { ethers } from "ethers";
import { getSignersForDataServiceId } from "@redstone-finance/sdk";

const abi = [
    "function resolveMarket(uint256)",
    "function markets(uint256) view returns (string name, string symbol, string quoteSymbol, uint8 direction, uint256 targetPrice, uint64 revealDeadline, uint64 resolutionDeadline, uint64 claimDeadline, uint64 createdAt, uint8 status, uint128 totalGreaterThan, uint128 totalLessThan, uint256 resolvedPrice, uint8 winningDirection, bool resolved)"
];
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);            // ← add signer
const address = process.env.NEXT_PUBLIC_BETTING_ADDRESS;
const contractRead = new ethers.Contract(address, abi, provider);
const contractWrite = new ethers.Contract(address, abi, signer);

const marketId = process.argv[2];

const m = await contractRead.markets(marketId);
const base = String(m.symbol || "BTC").toUpperCase();
const quote = String(m.quoteSymbol || "").toUpperCase();
const ids = quote && quote !== "USD" ? [base, quote] : [base];

const wrappedContract = WrapperBuilder.wrap(contractWrite).usingDataService({
    uniqueSignersCount: 3,
    dataServiceId: "redstone-primary-prod",
    dataPackagesIds: ids,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
});

console.log(`Resolving market ${marketId} with feeds: ${ids.join(", ")}`);
const tx = await wrappedContract.resolveMarket(marketId);
console.log(tx);
