// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICTFExchange
/// @notice Interface for Polymarket's CTF Exchange (CLOB settlement)
interface ICTFExchange {
    struct Order {
        uint256 salt;
        address maker;
        address signer;
        address taker;
        uint256 tokenId;
        uint256 makerAmount;
        uint256 takerAmount;
        uint256 expiration;
        uint256 nonce;
        uint256 feeRateBps;
        uint8 side; // 0 = BUY, 1 = SELL
        uint8 signatureType;
    }

    /// @notice Fill an order on the exchange
    function fillOrder(Order memory order, uint256 fillAmount, bytes memory signature) external;

    /// @notice Fill multiple orders
    function fillOrders(
        Order[] memory orders,
        uint256[] memory fillAmounts,
        bytes[] memory signatures
    ) external;

    /// @notice Get the contract's conditional tokens address
    function getCtf() external view returns (address);

    /// @notice Get the collateral token (USDC)
    function getCollateral() external view returns (address);
}
