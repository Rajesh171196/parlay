// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IConditionalTokens} from "./interfaces/IConditionalTokens.sol";

/// @title ParlayVault
/// @notice Holds deposits and manages a single parlay bet across multiple Polymarket outcomes
/// @dev Deployed as a minimal proxy clone via ParlayFactory
contract ParlayVault is ERC1155Holder, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Structs ────────────────────────────────────────────────────────

    struct Leg {
        bytes32 conditionId;
        uint256 outcomeIndex; // 0 or 1
        string description;
        bool resolved;
        bool won;
    }

    // ─── Constants ──────────────────────────────────────────────────────

    uint256 public constant CREATOR_FEE_BPS = 100; // 1%
    uint256 public constant PROTOCOL_FEE_BPS = 100; // 1%
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MIN_DEPOSIT = 1e6; // 1 USDC
    uint256 public constant EMERGENCY_DELAY = 7 days;

    // ─── State ──────────────────────────────────────────────────────────

    IERC20 public usdc;
    IConditionalTokens public conditionalTokens;
    address public factory;
    address public creator;
    address public keeper;
    address public protocolFeeAddress;

    Leg[] public legs;
    uint256 public depositDeadline;

    mapping(address => uint256) public deposits;
    address[] public depositors;
    uint256 public totalDeposits;
    uint256 public depositPool; // deposits minus fees

    bool public initialized;
    bool public executed;
    bool public settled;
    bool public allLegsWon;
    uint256 public totalWinnings;
    uint256 public legsResolved;

    mapping(address => bool) public claimed;

    // ─── Events ─────────────────────────────────────────────────────────

    event Deposited(address indexed depositor, uint256 amount);
    event Executed(uint256 totalAmount);
    event LegResolved(uint256 indexed legIndex, bool won);
    event Settled(bool allWon, uint256 totalWinnings);
    event Claimed(address indexed depositor, uint256 amount);
    event EmergencyWithdraw(address indexed depositor, uint256 amount);
    event TokensReceived(uint256[] tokenIds, uint256[] amounts);

    // ─── Errors ─────────────────────────────────────────────────────────

    error AlreadyInitialized();
    error NotKeeper();
    error NotFactory();
    error DepositWindowClosed();
    error DepositWindowOpen();
    error BelowMinDeposit();
    error AlreadyExecuted();
    error NotExecuted();
    error AlreadySettled();
    error NotSettled();
    error AlreadyClaimed();
    error NothingToClaim();
    error LegAlreadyResolved();
    error InvalidLegIndex();
    error NotAllLegsResolved();
    error EmergencyNotReady();
    error NoDeposit();
    error TransferFailed();

    // ─── Modifiers ──────────────────────────────────────────────────────

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert NotKeeper();
        _;
    }

    // ─── Initialization ─────────────────────────────────────────────────

    /// @notice Initialize the vault (called once by factory via clone)
    function initialize(
        address _creator,
        address _keeper,
        address _protocolFeeAddress,
        address _usdc,
        address _conditionalTokens,
        uint256 _depositDeadline,
        Leg[] calldata _legs
    ) external {
        if (initialized) revert AlreadyInitialized();
        initialized = true;
        factory = msg.sender;
        creator = _creator;
        keeper = _keeper;
        protocolFeeAddress = _protocolFeeAddress;
        usdc = IERC20(_usdc);
        conditionalTokens = IConditionalTokens(_conditionalTokens);
        depositDeadline = _depositDeadline;

        for (uint256 i = 0; i < _legs.length; i++) {
            legs.push(_legs[i]);
        }
    }

    // ─── Deposit ────────────────────────────────────────────────────────

    /// @notice Deposit USDC into the parlay
    /// @param amount Amount of USDC to deposit (6 decimals)
    function deposit(uint256 amount) external nonReentrant {
        if (block.timestamp >= depositDeadline) revert DepositWindowClosed();
        if (amount < MIN_DEPOSIT) revert BelowMinDeposit();
        if (executed) revert AlreadyExecuted();

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Calculate fees
        uint256 creatorFee = (amount * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
        uint256 protocolFee = (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = amount - creatorFee - protocolFee;

        // Transfer fees immediately
        usdc.safeTransfer(creator, creatorFee);
        usdc.safeTransfer(protocolFeeAddress, protocolFee);

        // Track deposit
        if (deposits[msg.sender] == 0) {
            depositors.push(msg.sender);
        }
        deposits[msg.sender] += netAmount;
        totalDeposits += amount;
        depositPool += netAmount;

        emit Deposited(msg.sender, amount);
    }

    // ─── Execution ──────────────────────────────────────────────────────

    /// @notice Mark the parlay as executed (keeper has bought outcome tokens off-chain)
    /// @dev Keeper buys tokens via Polymarket CLOB and transfers them to this contract
    function execute() external onlyKeeper {
        if (executed) revert AlreadyExecuted();
        executed = true;
        emit Executed(depositPool);
    }

    /// @notice Confirm receipt of outcome tokens from keeper
    function confirmTokensReceived(
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external onlyKeeper {
        emit TokensReceived(tokenIds, amounts);
    }

    // ─── Resolution ─────────────────────────────────────────────────────

    /// @notice Resolve a single leg of the parlay
    /// @param legIndex Index of the leg to resolve
    /// @param won Whether this leg won
    function resolveLeg(uint256 legIndex, bool won) external onlyKeeper {
        if (legIndex >= legs.length) revert InvalidLegIndex();
        if (legs[legIndex].resolved) revert LegAlreadyResolved();

        legs[legIndex].resolved = true;
        legs[legIndex].won = won;
        legsResolved++;

        emit LegResolved(legIndex, won);
    }

    /// @notice Settle the parlay after all legs are resolved
    /// @dev Keeper calls this after redeeming winning positions on Polymarket
    function settle() external onlyKeeper nonReentrant {
        if (settled) revert AlreadySettled();
        if (!executed) revert NotExecuted();
        if (legsResolved != legs.length) revert NotAllLegsResolved();

        settled = true;

        // Check if all legs won
        bool _allWon = true;
        for (uint256 i = 0; i < legs.length; i++) {
            if (!legs[i].won) {
                _allWon = false;
                break;
            }
        }
        allLegsWon = _allWon;
        totalWinnings = usdc.balanceOf(address(this));

        emit Settled(_allWon, totalWinnings);
    }

    // ─── Claims ─────────────────────────────────────────────────────────

    /// @notice Claim winnings proportional to deposit
    function claimWinnings() external nonReentrant {
        if (!settled) revert NotSettled();
        if (!allLegsWon) revert NothingToClaim();
        if (claimed[msg.sender]) revert AlreadyClaimed();
        if (deposits[msg.sender] == 0) revert NoDeposit();

        claimed[msg.sender] = true;

        uint256 share = (totalWinnings * deposits[msg.sender]) / depositPool;
        usdc.safeTransfer(msg.sender, share);

        emit Claimed(msg.sender, share);
    }

    // ─── Emergency ──────────────────────────────────────────────────────

    /// @notice Emergency withdraw if keeper hasn't executed within EMERGENCY_DELAY
    function emergencyWithdraw() external nonReentrant {
        if (executed) revert AlreadyExecuted();
        if (block.timestamp < depositDeadline + EMERGENCY_DELAY) revert EmergencyNotReady();
        if (deposits[msg.sender] == 0) revert NoDeposit();

        uint256 amount = deposits[msg.sender];
        deposits[msg.sender] = 0;
        depositPool -= amount;

        usdc.safeTransfer(msg.sender, amount);

        emit EmergencyWithdraw(msg.sender, amount);
    }

    // ─── Views ──────────────────────────────────────────────────────────

    /// @notice Get the number of legs in the parlay
    function getLegsCount() external view returns (uint256) {
        return legs.length;
    }

    /// @notice Get all legs
    function getLegs() external view returns (Leg[] memory) {
        Leg[] memory _legs = new Leg[](legs.length);
        for (uint256 i = 0; i < legs.length; i++) {
            _legs[i] = legs[i];
        }
        return _legs;
    }

    /// @notice Get the number of depositors
    function getDepositorsCount() external view returns (uint256) {
        return depositors.length;
    }

    /// @notice Get all depositors
    function getDepositors() external view returns (address[] memory) {
        return depositors;
    }

    /// @notice Get parlay status summary
    function getStatus()
        external
        view
        returns (
            bool _executed,
            bool _settled,
            bool _allLegsWon,
            uint256 _totalDeposits,
            uint256 _depositPool,
            uint256 _legsResolved,
            uint256 _totalLegs,
            uint256 _totalWinnings,
            uint256 _depositDeadline,
            uint256 _depositorsCount
        )
    {
        return (
            executed,
            settled,
            allLegsWon,
            totalDeposits,
            depositPool,
            legsResolved,
            legs.length,
            totalWinnings,
            depositDeadline,
            depositors.length
        );
    }
}
