// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IConditionalTokens
/// @notice Interface for Gnosis Conditional Token Framework used by Polymarket
interface IConditionalTokens {
    /// @notice Emitted when a condition is resolved
    event ConditionResolution(
        bytes32 indexed conditionId,
        address indexed oracle,
        bytes32 indexed questionId,
        uint256 outcomeSlotCount,
        uint256[] payoutNumerators
    );

    /// @notice Get the balance of a specific position token
    function balanceOf(address owner, uint256 id) external view returns (uint256);

    /// @notice Get the outcome slot count for a condition
    function getOutcomeSlotCount(bytes32 conditionId) external view returns (uint256);

    /// @notice Get payout numerator for a specific outcome of a condition
    function payoutNumerators(bytes32 conditionId, uint256 index) external view returns (uint256);

    /// @notice Get the payout denominator for a condition
    function payoutDenominator(bytes32 conditionId) external view returns (uint256);

    /// @notice Calculate the position ID from collateral and collection
    function getPositionId(address collateralToken, bytes32 collectionId) external pure returns (uint256);

    /// @notice Calculate the collection ID
    function getCollectionId(
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256 indexSet
    ) external view returns (bytes32);

    /// @notice Redeem positions for payout
    function redeemPositions(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata indexSets
    ) external;

    /// @notice Safe transfer of ERC1155 tokens
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external;

    /// @notice Batch transfer of ERC1155 tokens
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external;

    /// @notice Set approval for all tokens
    function setApprovalForAll(address operator, bool approved) external;

    /// @notice Check if operator is approved for all tokens
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}
