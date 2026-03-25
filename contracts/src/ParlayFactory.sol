// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ParlayVault} from "./ParlayVault.sol";

/// @title ParlayFactory
/// @notice Deploys minimal proxy clones of ParlayVault for each new parlay
contract ParlayFactory is Ownable {
    using Clones for address;

    // ─── State ──────────────────────────────────────────────────────────

    address public immutable implementation;
    address public immutable usdc;
    address public immutable conditionalTokens;

    address public protocolFeeAddress;
    address public keeper;

    address[] public parlays;
    mapping(address => address[]) public parlaysByCreator;
    mapping(address => bool) public isParlayVault;

    // ─── Events ─────────────────────────────────────────────────────────

    event ParlayCreated(
        address indexed parlay,
        address indexed creator,
        uint256 legsCount,
        uint256 depositDeadline
    );
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);
    event ProtocolFeeAddressUpdated(address indexed oldAddress, address indexed newAddress);

    // ─── Errors ─────────────────────────────────────────────────────────

    error ZeroAddress();
    error NoLegs();
    error DeadlineInPast();

    // ─── Constructor ────────────────────────────────────────────────────

    constructor(
        address _usdc,
        address _conditionalTokens,
        address _protocolFeeAddress,
        address _keeper
    ) Ownable(msg.sender) {
        if (_usdc == address(0) || _conditionalTokens == address(0)) revert ZeroAddress();
        if (_protocolFeeAddress == address(0) || _keeper == address(0)) revert ZeroAddress();

        usdc = _usdc;
        conditionalTokens = _conditionalTokens;
        protocolFeeAddress = _protocolFeeAddress;
        keeper = _keeper;

        // Deploy the implementation contract
        implementation = address(new ParlayVault());
    }

    // ─── Create Parlay ──────────────────────────────────────────────────

    /// @notice Create a new parlay vault
    /// @param legs Array of parlay legs (Polymarket conditions + outcomes)
    /// @param depositDeadline Timestamp until which deposits are accepted
    /// @return vault Address of the new parlay vault
    function createParlay(
        ParlayVault.Leg[] calldata legs,
        uint256 depositDeadline
    ) external returns (address vault) {
        if (legs.length == 0) revert NoLegs();
        if (depositDeadline <= block.timestamp) revert DeadlineInPast();

        // Deploy minimal proxy clone
        bytes32 salt = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, parlays.length)
        );
        vault = implementation.cloneDeterministic(salt);

        // Initialize the vault
        ParlayVault(vault).initialize(
            msg.sender,
            keeper,
            protocolFeeAddress,
            usdc,
            conditionalTokens,
            depositDeadline,
            legs
        );

        // Track
        parlays.push(vault);
        parlaysByCreator[msg.sender].push(vault);
        isParlayVault[vault] = true;

        emit ParlayCreated(vault, msg.sender, legs.length, depositDeadline);
    }

    // ─── Admin ──────────────────────────────────────────────────────────

    /// @notice Update the keeper address
    function setKeeper(address _keeper) external onlyOwner {
        if (_keeper == address(0)) revert ZeroAddress();
        emit KeeperUpdated(keeper, _keeper);
        keeper = _keeper;
    }

    /// @notice Update the protocol fee address
    function setProtocolFeeAddress(address _protocolFeeAddress) external onlyOwner {
        if (_protocolFeeAddress == address(0)) revert ZeroAddress();
        emit ProtocolFeeAddressUpdated(protocolFeeAddress, _protocolFeeAddress);
        protocolFeeAddress = _protocolFeeAddress;
    }

    // ─── Views ──────────────────────────────────────────────────────────

    /// @notice Get total number of parlays created
    function getParlaysCount() external view returns (uint256) {
        return parlays.length;
    }

    /// @notice Get all parlay addresses
    function getAllParlays() external view returns (address[] memory) {
        return parlays;
    }

    /// @notice Get parlays created by a specific address
    function getParlaysByCreator(address creator) external view returns (address[] memory) {
        return parlaysByCreator[creator];
    }

    /// @notice Get a paginated list of parlays
    function getParlaysPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory result) {
        uint256 len = parlays.length;
        if (offset >= len) return new address[](0);

        uint256 end = offset + limit;
        if (end > len) end = len;

        result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = parlays[i];
        }
    }
}
