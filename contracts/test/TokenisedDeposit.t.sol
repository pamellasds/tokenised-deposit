// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TokenisedDeposit} from "../src/TokenisedDeposit.sol";

contract TokenisedDepositTest is Test {
    TokenisedDeposit internal token;

    address internal admin = makeAddr("admin");
    address internal issuer = makeAddr("issuer");
    address internal custodian = makeAddr("custodian");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal issuerPk = 0xA11CE;

    function setUp() public {
        issuer = vm.addr(issuerPk);
        token = new TokenisedDeposit(admin, issuer, custodian);
    }

    function test_mint_byIssuer() public {
        vm.prank(issuer);
        token.mint(alice, 1_000e18);
        assertEq(token.balanceOf(alice), 1_000e18);
    }

    function test_mint_revertsForNonIssuer() public {
        vm.prank(alice);
        vm.expectRevert();
        token.mint(alice, 1);
    }

    function test_redeem_twoStep() public {
        vm.prank(issuer);
        token.mint(alice, 500e18);

        vm.prank(alice);
        uint256 id = token.requestRedeem(200e18);

        assertEq(token.balanceOf(alice), 300e18);
        assertEq(token.balanceOf(address(token)), 200e18);

        vm.prank(custodian);
        token.confirmRedeem(id);

        assertEq(token.balanceOf(address(token)), 0);
        assertEq(token.totalSupply(), 300e18);
        (address holder, uint256 amount, bool pending) = token.redeems(id);
        assertEq(holder, alice);
        assertEq(amount, 200e18);
        assertFalse(pending);
    }

    function test_cancelRedeem() public {
        vm.prank(issuer);
        token.mint(alice, 100e18);

        vm.prank(alice);
        uint256 id = token.requestRedeem(40e18);

        vm.prank(alice);
        token.cancelRedeem(id);

        assertEq(token.balanceOf(alice), 100e18);
    }

    function test_mintWithAuthorization() public {
        uint256 amount = 250e18;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 days;

        bytes32 typeHash = token.MINT_AUTH_TYPEHASH();
        bytes32 structHash = keccak256(abi.encode(typeHash, alice, amount, nonce, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(issuerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(bob);
        token.mintWithAuthorization(alice, amount, nonce, deadline, signature);

        assertEq(token.balanceOf(alice), amount);
        assertEq(token.mintNonces(alice), 1);
    }

    function test_pauseBlocksMint() public {
        vm.prank(admin);
        token.pause();

        vm.prank(issuer);
        vm.expectRevert();
        token.mint(alice, 1);
    }

    function testFuzz_mintAndRedeem(uint256 amount) public {
        amount = bound(amount, 1, 1_000_000e18);
        vm.prank(issuer);
        token.mint(alice, amount);

        vm.prank(alice);
        uint256 id = token.requestRedeem(amount);

        vm.prank(custodian);
        token.confirmRedeem(id);

        assertEq(token.totalSupply(), 0);
    }
}
