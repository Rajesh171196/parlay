// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {ParlayFactory} from "../src/ParlayFactory.sol";
import {ParlayVault} from "../src/ParlayVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Mock ConditionalTokens (just needs to exist for constructor)
contract MockConditionalTokens {
    function balanceOf(address, uint256) external pure returns (uint256) {
        return 0;
    }
}

contract ParlayVaultTest is Test {
    ParlayFactory public factory;
    MockUSDC public usdc;
    MockConditionalTokens public ctf;

    address public owner = address(this);
    address public creator = address(0x1);
    address public keeper = address(0x2);
    address public protocolFee = address(0x3);
    address public alice = address(0x4);
    address public bob = address(0x5);

    function setUp() public {
        usdc = new MockUSDC();
        ctf = new MockConditionalTokens();
        factory = new ParlayFactory(
            address(usdc),
            address(ctf),
            protocolFee,
            keeper
        );

        // Fund users
        usdc.mint(alice, 1000e6);
        usdc.mint(bob, 1000e6);
    }

    function _createDefaultParlay() internal returns (address) {
        ParlayVault.Leg[] memory legs = new ParlayVault.Leg[](2);
        legs[0] = ParlayVault.Leg({
            conditionId: bytes32(uint256(1)),
            outcomeIndex: 1,
            description: "Trump wins 2024",
            resolved: false,
            won: false
        });
        legs[1] = ParlayVault.Leg({
            conditionId: bytes32(uint256(2)),
            outcomeIndex: 1,
            description: "BTC over 100k",
            resolved: false,
            won: false
        });

        vm.prank(creator);
        return factory.createParlay(legs, block.timestamp + 1 days);
    }

    function test_CreateParlay() public {
        address vault = _createDefaultParlay();
        assertTrue(factory.isParlayVault(vault));
        assertEq(factory.getParlaysCount(), 1);

        ParlayVault v = ParlayVault(vault);
        assertEq(v.creator(), creator);
        assertEq(v.getLegsCount(), 2);
    }

    function test_Deposit() public {
        address vault = _createDefaultParlay();
        ParlayVault v = ParlayVault(vault);

        uint256 amount = 100e6; // 100 USDC
        vm.startPrank(alice);
        usdc.approve(vault, amount);
        v.deposit(amount);
        vm.stopPrank();

        // 2% total fees (1% creator + 1% protocol)
        uint256 expectedCreatorFee = 1e6; // 1 USDC
        uint256 expectedProtocolFee = 1e6; // 1 USDC
        uint256 expectedNet = 98e6; // 98 USDC

        assertEq(v.deposits(alice), expectedNet);
        assertEq(v.totalDeposits(), amount);
        assertEq(v.depositPool(), expectedNet);
        assertEq(usdc.balanceOf(creator), expectedCreatorFee);
        assertEq(usdc.balanceOf(protocolFee), expectedProtocolFee);
    }

    function test_DepositBelowMin() public {
        address vault = _createDefaultParlay();
        ParlayVault v = ParlayVault(vault);

        vm.startPrank(alice);
        usdc.approve(vault, 0.5e6);
        vm.expectRevert(ParlayVault.BelowMinDeposit.selector);
        v.deposit(0.5e6);
        vm.stopPrank();
    }

    function test_DepositAfterDeadline() public {
        address vault = _createDefaultParlay();
        ParlayVault v = ParlayVault(vault);

        vm.warp(block.timestamp + 2 days);

        vm.startPrank(alice);
        usdc.approve(vault, 100e6);
        vm.expectRevert(ParlayVault.DepositWindowClosed.selector);
        v.deposit(100e6);
        vm.stopPrank();
    }

    function test_FullLifecycle_AllWin() public {
        address vault = _createDefaultParlay();
        ParlayVault v = ParlayVault(vault);

        // Alice deposits 100 USDC
        vm.startPrank(alice);
        usdc.approve(vault, 100e6);
        v.deposit(100e6);
        vm.stopPrank();

        // Bob deposits 100 USDC
        vm.startPrank(bob);
        usdc.approve(vault, 100e6);
        v.deposit(100e6);
        vm.stopPrank();

        // Keeper executes
        vm.prank(keeper);
        v.execute();
        assertTrue(v.executed());

        // Simulate winnings: keeper redeems on Polymarket and sends USDC back
        // In a real scenario, vault's depositPool USDC was used to buy tokens,
        // but in this test it stays in the vault. Mint extra winnings on top.
        usdc.mint(vault, 784e6);

        // Resolve legs
        vm.prank(keeper);
        v.resolveLeg(0, true);
        vm.prank(keeper);
        v.resolveLeg(1, true);

        // Settle
        vm.prank(keeper);
        v.settle();
        assertTrue(v.settled());
        assertTrue(v.allLegsWon());

        // totalWinnings = vault balance = depositPool(196) + minted(784) = 980
        uint256 vaultBalance = usdc.balanceOf(vault);
        assertEq(vaultBalance, 980e6);

        // Alice claims (50% of pool: 98/196)
        uint256 aliceExpected = (vaultBalance * 98e6) / 196e6; // 490
        vm.prank(alice);
        v.claimWinnings();
        assertEq(usdc.balanceOf(alice), 900e6 + aliceExpected);

        // Bob claims (50% of pool)
        vm.prank(bob);
        v.claimWinnings();
        assertEq(usdc.balanceOf(bob), 900e6 + aliceExpected);
    }

    function test_FullLifecycle_OneLoses() public {
        address vault = _createDefaultParlay();
        ParlayVault v = ParlayVault(vault);

        vm.startPrank(alice);
        usdc.approve(vault, 100e6);
        v.deposit(100e6);
        vm.stopPrank();

        vm.prank(keeper);
        v.execute();

        // Leg 1 wins, leg 2 loses
        vm.prank(keeper);
        v.resolveLeg(0, true);
        vm.prank(keeper);
        v.resolveLeg(1, false);

        vm.prank(keeper);
        v.settle();
        assertTrue(v.settled());
        assertFalse(v.allLegsWon());

        // Alice can't claim
        vm.prank(alice);
        vm.expectRevert(ParlayVault.NothingToClaim.selector);
        v.claimWinnings();
    }

    function test_EmergencyWithdraw() public {
        address vault = _createDefaultParlay();
        ParlayVault v = ParlayVault(vault);

        vm.startPrank(alice);
        usdc.approve(vault, 100e6);
        v.deposit(100e6);
        vm.stopPrank();

        // Can't withdraw before deadline + 7 days
        vm.prank(alice);
        vm.expectRevert(ParlayVault.EmergencyNotReady.selector);
        v.emergencyWithdraw();

        // Warp past deadline + emergency delay
        vm.warp(block.timestamp + 1 days + 7 days + 1);

        vm.prank(alice);
        v.emergencyWithdraw();

        // Alice gets back net amount (fees already taken)
        assertEq(usdc.balanceOf(alice), 998e6); // 1000 - 100 + 98 = 998
    }

    function test_MultipleDepositors() public {
        address vault = _createDefaultParlay();
        ParlayVault v = ParlayVault(vault);

        vm.startPrank(alice);
        usdc.approve(vault, 50e6);
        v.deposit(50e6);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(vault, 150e6);
        v.deposit(150e6);
        vm.stopPrank();

        assertEq(v.getDepositorsCount(), 2);
        assertEq(v.totalDeposits(), 200e6);
        // Alice: 49 USDC net, Bob: 147 USDC net
        assertEq(v.deposits(alice), 49e6);
        assertEq(v.deposits(bob), 147e6);
    }

    function test_OnlyKeeperCanExecute() public {
        address vault = _createDefaultParlay();
        ParlayVault v = ParlayVault(vault);

        vm.prank(alice);
        vm.expectRevert(ParlayVault.NotKeeper.selector);
        v.execute();
    }

    function test_OnlyKeeperCanResolve() public {
        address vault = _createDefaultParlay();
        ParlayVault v = ParlayVault(vault);

        vm.prank(alice);
        vm.expectRevert(ParlayVault.NotKeeper.selector);
        v.resolveLeg(0, true);
    }

    function test_FactoryPagination() public {
        // Create 5 parlays
        for (uint256 i = 0; i < 5; i++) {
            _createDefaultParlay();
        }

        address[] memory page = factory.getParlaysPaginated(1, 3);
        assertEq(page.length, 3);
        assertEq(page[0], factory.parlays(1));
        assertEq(page[2], factory.parlays(3));
    }
}
