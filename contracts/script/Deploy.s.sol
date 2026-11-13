// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TokenisedDeposit} from "../src/TokenisedDeposit.sol";

/// @notice Deploys TokenisedDeposit and prints addresses/roles for local Anvil demos.
contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envOr(
            "DEPLOYER_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address admin = vm.envOr("ADMIN_ADDRESS", vm.addr(deployerKey));
        address issuer = vm.envOr(
            "ISSUER_ADDRESS",
            address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
        );
        address custodian = vm.envOr(
            "CUSTODIAN_ADDRESS",
            address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
        );

        vm.startBroadcast(deployerKey);
        TokenisedDeposit token = new TokenisedDeposit(admin, issuer, custodian);
        vm.stopBroadcast();

        console2.log("TokenisedDeposit", address(token));
        console2.log("admin", admin);
        console2.log("issuer", issuer);
        console2.log("custodian", custodian);
    }
}
