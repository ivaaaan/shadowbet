// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@redstone-finance/evm-connector/dist/contracts/data-services/PrimaryProdDataServiceConsumerBase.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Betting is PrimaryProdDataServiceConsumerBase {
    using SafeERC20 for IERC20;

    enum Direction { GreaterThan, LessThan }
    enum MarketStatus { Active, Resolved, Cancelled }

    struct Market {
        string   name;
        string   symbol;
        string   quoteSymbol;        // optional; empty or USD means USD-quoted
        Direction direction;          // semantic only (what we compare against)
        uint256  targetPrice;         // human readable price, e.g 4500

        uint64   revealDeadline;      // commit < deadline; reveal >= deadline
        uint64   resolutionDeadline;  // resolution < deadline; claim >= deadline
        uint64   claimDeadline;       // reward claim deadline
        uint64   createdAt;           // market creation timestamp

        MarketStatus status;

        // tallied on reveal (use uint256 to avoid overflow)
        uint256 totalGreaterThan;
        uint256 totalLessThan;

        // resolution
        uint256  resolvedPrice;
        Direction winningDirection;
        bool     resolved;
    }

    struct Bet {
        bytes32   commit;     // keccak256(abi.encodePacked(direction, salt, user))
        uint128   amount;     // in token's smallest unit (e.g., 6d USDC -> "wei"-like)
        Direction direction;  // set on reveal
        bool      revealed;   // set on reveal
        bool      claimed;    // set on claim
    }

    address public owner;
    IERC20 public immutable token; // e.g., USDC
    uint256 public nextMarketId;

    mapping(uint256 => Market) public markets;                 // marketId -> market
    mapping(uint256 => mapping(address => Bet)) public bets;   // marketId -> user -> bet

    // Totals
    mapping(uint256 => uint256) public committedVolume;        // marketId -> total committed (all bet() amounts)
    mapping(uint256 => uint256) public marketBalance;          // **per-market escrow** balance

    bool private locked;
    modifier nonReentrant() {
        require(!locked, "Reentrant");
        locked = true; _;
        locked = false;
    }
    modifier onlyOwner() { require(msg.sender == owner, "NotOwner"); _; }

    modifier marketCanResolve(uint256 id) {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Active, "MarketNotActive");
        require(block.timestamp >= m.resolutionDeadline, "TooEarlyToResolve");
        _;
    }

    event MarketCreated(uint256 indexed marketId, string name, uint256 targetPrice, uint64 revealDeadline);
    event BetCommitted(uint256 indexed marketId, address indexed user, uint128 amount, bytes32 commit);
    event BetRevealed(uint256 indexed marketId, address indexed user, Direction direction, uint128 amount);
    event MarketResolved(uint256 indexed marketId, Direction winningDirection, uint256 resolvedPrice);
    event Claimed(uint256 indexed marketId, address indexed user, uint256 amount);

    error MarketNotFound(uint256 id);
    error MarketNotActive(uint256 id);
    error CommitPhaseOver(uint256 id);
    error AlreadyCommitted(address user);
    error AmountZero();
    error InvalidTimestamp(uint256 receivedTimestampSeconds, uint256 expectedTimestamp);
    error ZeroAddr();

    constructor(IERC20 _token) {
        owner = msg.sender;
        token = _token;
    }

    function createMarket(
        string memory _name,
        string memory _symbol,
        string memory _quoteSymbol,
        Direction _direction,
        uint256 _targetPrice,
        uint64  _revealDeadline,
        uint64  _resolutionDeadline
    ) external onlyOwner returns (uint256 id) {
        require(_revealDeadline > block.timestamp, "BadRevealDeadline");
        require(_resolutionDeadline > _revealDeadline, "BadResolutionDeadline");
        id = nextMarketId++;
        markets[id] = Market({
            name: _name,
            symbol: _symbol,
            quoteSymbol: _quoteSymbol,
            direction: _direction,
            targetPrice: _targetPrice,
            revealDeadline: _revealDeadline,
            resolutionDeadline: _resolutionDeadline,
            claimDeadline: uint64(_resolutionDeadline + 1 days),
            createdAt: uint64(block.timestamp),
            status: MarketStatus.Active,
            totalGreaterThan: 0,
            totalLessThan: 0,
            resolvedPrice: 0,
            winningDirection: Direction.GreaterThan, // placeholder until resolve
            resolved: false
        });
        marketBalance[id] = 0; // initialize escrow bucket
        emit MarketCreated(id, _name, _targetPrice, _revealDeadline);
    }

    function bet(uint256 id, bytes32 commit, uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();
        if (id >= nextMarketId) revert MarketNotFound(id);

        Market storage m = markets[id];
        if (m.status != MarketStatus.Active) revert MarketNotActive(id);
        if (block.timestamp >= m.revealDeadline) revert CommitPhaseOver(id);

        Bet storage b = bets[id][msg.sender];
        if (b.amount != 0 || b.commit != bytes32(0)) revert AlreadyCommitted(msg.sender);

        b.commit = commit;
        b.amount = uint128(amount);

        committedVolume[id] += amount;
        marketBalance[id] += amount;

        token.safeTransferFrom(msg.sender, address(this), amount);
        emit BetCommitted(id, msg.sender, b.amount, commit);
    }

    function reveal(uint256 _marketId, Direction _direction, uint256 _salt) external {
        if (_marketId >= nextMarketId) revert MarketNotFound(_marketId);

        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.Active, "MarketNotActive");
        require(block.timestamp >= m.revealDeadline, "TooEarlyToReveal");
        require(block.timestamp < m.resolutionDeadline, "RevealOver");

        Bet storage b = bets[_marketId][msg.sender];
        require(b.commit != bytes32(0), "NoBet");
        require(!b.revealed, "AlreadyRevealed");

        bytes32 expected = keccak256(abi.encodePacked(_direction, _salt, msg.sender));
        require(expected == b.commit, "BadCommit");

        b.revealed = true;
        b.direction = _direction;

        if (_direction == Direction.GreaterThan) {
            m.totalGreaterThan += uint256(b.amount);
        } else {
            m.totalLessThan += uint256(b.amount);
        }

        emit BetRevealed(_marketId, msg.sender, _direction, b.amount);
    }

    function resolveMarket(uint256 id) external marketCanResolve(id) {
        if (id >= nextMarketId) revert MarketNotFound(id);
        Market storage m = markets[id];
        require(!m.resolved, "AlreadyResolved");
        uint256 resolvedPrice;
        if (_isUSD(m.quoteSymbol)) {
            resolvedPrice = getHistoricalPrice(bytes32(bytes(m.symbol)), m.resolutionDeadline);
        } else {
            // Pair price base/quote with 8 decimals: priceBaseUsd * 1e8 / priceQuoteUsd
            uint256 baseUsd = getHistoricalPrice(bytes32(bytes(m.symbol)), m.resolutionDeadline);
            uint256 quoteUsd = getHistoricalPrice(bytes32(bytes(m.quoteSymbol)), m.resolutionDeadline);
            require(quoteUsd > 0, "QuoteZero");
            resolvedPrice = (baseUsd * (10 ** 8)) / quoteUsd;
        }

        uint256 targetScaled = m.targetPrice * (10 ** 8);
        if (resolvedPrice > targetScaled) {
            m.winningDirection = Direction.GreaterThan;
        } else if (resolvedPrice < targetScaled) {
            m.winningDirection = Direction.LessThan;
        } else {
            // Tie policy: cancel for full refunds
            m.status = MarketStatus.Cancelled;
            m.resolved = true;
            m.resolvedPrice = resolvedPrice;
            emit MarketResolved(id, m.winningDirection, resolvedPrice);
            return;
        }

        // if no one revealed on the winning side, cancel so everyone can refund
        uint256 winnersRevealed = (m.winningDirection == Direction.GreaterThan)
            ? m.totalGreaterThan
            : m.totalLessThan;

        if (winnersRevealed == 0) {
            m.status = MarketStatus.Cancelled;
            m.resolved = true;
            m.resolvedPrice = resolvedPrice;
            emit MarketResolved(id, m.winningDirection, resolvedPrice);
            return;
        }

        m.status = MarketStatus.Resolved;
        m.resolved = true;
        m.resolvedPrice = resolvedPrice;
        emit MarketResolved(id, m.winningDirection, resolvedPrice);
    }

    function _isUSD(string memory s) internal pure returns (bool) {
        if (bytes(s).length == 0) return true; // default USD if empty
        return keccak256(bytes(s)) == keccak256(bytes("USD"));
    }

    function getHistoricalPrice(bytes32 asset, uint256 allowedTimestampSec) public view returns (uint256) {
        uint256 receivedMs = extractTimestampsAndAssertAllAreEqual();
        uint256 receivedSec = receivedMs / 1000;
        uint256 expected = allowedTimestampSec;
        uint256 delta = receivedSec > expected ? (receivedSec - expected) : (expected - receivedSec);
        require(delta <= 300, "InvalidTimestamp"); // 5 minutes tolerance
        return getOracleNumericValueFromTxMsg(asset);
    }

    function validateTimestamp(uint256 /*receivedTimestampMilliseconds*/) public view virtual override {}

    function claim(uint256 id) external nonReentrant {
        if (id >= nextMarketId) revert MarketNotFound(id);

        Market storage m = markets[id];
        Bet storage b = bets[id][msg.sender];

        require(b.commit != bytes32(0), "NoBet");
        require(!b.claimed, "AlreadyClaimed");

        // Cancelled markets: refund stake regardless of reveal
        if (m.status == MarketStatus.Cancelled) {
            b.claimed = true;
            marketBalance[id] -= uint256(b.amount); // per-market escrow decrease
            token.safeTransfer(msg.sender, b.amount);
            emit Claimed(id, msg.sender, b.amount);
            return;
        }

        require(m.resolved && m.status == MarketStatus.Resolved, "NotResolved");
        require(block.timestamp <= m.claimDeadline, "ClaimExpired");
        require(b.revealed, "NotRevealed");
        require(b.direction == m.winningDirection, "NotWinner");

        uint256 winnersPool = (m.winningDirection == Direction.GreaterThan)
            ? m.totalGreaterThan
            : m.totalLessThan;
        uint256 losersPool = (m.winningDirection == Direction.GreaterThan)
            ? m.totalLessThan
            : m.totalGreaterThan;

        // Forfeit unrevealed commitments to losersPool after reveal window closes
        uint256 revealedTotal = m.totalGreaterThan + m.totalLessThan;
        if (committedVolume[id] > revealedTotal) {
            uint256 unrevealed = committedVolume[id] - revealedTotal;
            losersPool += unrevealed;
        }

        // standard pari-mutuel payout
        uint256 payout = uint256(b.amount) + (losersPool * uint256(b.amount)) / winnersPool;

        b.claimed = true;
        marketBalance[id] -= payout; // per-market escrow decrease

        token.safeTransfer(msg.sender, payout);
        emit Claimed(id, msg.sender, payout);
    }

    function sweepUnclaimed(uint256 id, address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddr();
        if (id >= nextMarketId) revert MarketNotFound(id);

        Market storage m = markets[id];
        require(m.resolved, "NotResolved");
        require(block.timestamp > m.claimDeadline, "NotExpired");

        uint256 amt = marketBalance[id];
        marketBalance[id] = 0;
        token.safeTransfer(to, amt);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddr();
        owner = newOwner;
    }

    /// Helper for off-chain commitment calculation
    function commitmentFor(address user, Direction dir, uint256 salt) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(dir, salt, user));
    }

    function getRevealedVolume(uint256 id) external view returns (uint256) {
        Market storage m = markets[id];
        return m.totalGreaterThan + m.totalLessThan;
    }
}
