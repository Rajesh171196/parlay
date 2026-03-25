// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ParlayFactory} from "../src/ParlayFactory.sol";

contract DeployUGP is Script {
    // Polygon mainnet addresses
    address constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address constant CONDITIONAL_TOKENS = 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045;

    function run() external {
        address protocolFeeAddress = vm.envAddress("PROTOCOL_FEE_ADDRESS");
        address keeper = vm.envAddress("KEEPER_ADDRESS");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        ParlayFactory factory = new ParlayFactory(
            USDC,
            CONDITIONAL_TOKENS,
            protocolFeeAddress,
            keeper
        );

        console2.log("ParlayFactory deployed at:", address(factory));
        console2.log("Implementation at:", factory.implementation());

        vm.stopBroadcast();
    }
}
