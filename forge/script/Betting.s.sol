// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Betting} from "../src/Betting.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BettingScript is Script {
    Betting public betting;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        address usdc = vm.envAddress("USDC_ADDRESS");
        betting = new Betting(IERC20(usdc));

        vm.stopBroadcast();
    }
}
