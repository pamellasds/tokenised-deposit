// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title TokenisedDeposit
/// @notice ERC-20 bank deposit certificate (CDB/CD analogue; RWA-lite / deposit token).
/// @dev Cash stays off-chain; this token is the on-chain certificate. Redemption is two-step:
///      holder requests (locks tokens); custodian confirms after off-chain payout (burns).
///      Inspired by OpenZeppelin AccessControl/Pausable/EIP-712 patterns used in production
///      tokenisation stacks. Kept intentionally small for a demo-grade portfolio project.
contract TokenisedDeposit is ERC20, ERC20Permit, AccessControl, Pausable {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");

    /// @dev EIP-712 typehash for off-chain mint authorisations (meta-tx style).
    bytes32 public constant MINT_AUTH_TYPEHASH = keccak256(
        "MintAuthorization(address to,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    struct RedeemRequest {
        address holder;
        uint256 amount;
        bool pending;
    }

    uint256 public nextRedeemId;
    mapping(uint256 => RedeemRequest) public redeems;

    /// @notice Nonce per beneficiary for mint authorisations (replay protection).
    mapping(address => uint256) public mintNonces;

    event Minted(address indexed to, uint256 amount, address indexed actor);
    event MintAuthorized(address indexed to, uint256 amount, uint256 nonce, address indexed issuer);
    event RedeemRequested(uint256 indexed id, address indexed holder, uint256 amount);
    event RedeemConfirmed(uint256 indexed id, address indexed holder, uint256 amount);
    event RedeemCancelled(uint256 indexed id, address indexed holder, uint256 amount);

    error ExpiredDeadline();
    error InvalidIssuerSignature();
    error InvalidAmount();
    error RedeemNotPending();
    error NotRedeemHolder();

    constructor(address admin, address issuer, address custodian)
        ERC20("Tokenised Deposit Receipt", "tDEP")
        ERC20Permit("Tokenised Deposit Receipt")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, issuer);
        _grantRole(CUSTODIAN_ROLE, custodian);
    }

    // -------------------------------------------------------------------------
    // Issuance (on-chain mint after off-chain deposit is booked)
    // -------------------------------------------------------------------------

    /// @notice Issuer mints deposit certificates directly (ops desk / backend wallet).
    function mint(address to, uint256 amount) external onlyRole(ISSUER_ROLE) whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        _mint(to, amount);
        emit Minted(to, amount, msg.sender);
    }

    /// @notice Anyone can submit a mint if they carry a valid EIP-712 issuer signature.
    /// @dev Useful for gasless UX: issuer signs off-chain; relayer or user posts on-chain.
    function mintWithAuthorization(
        address to,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (block.timestamp > deadline) revert ExpiredDeadline();
        if (nonce != mintNonces[to]) revert InvalidIssuerSignature();

        bytes32 structHash = keccak256(abi.encode(MINT_AUTH_TYPEHASH, to, amount, nonce, deadline));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        if (!hasRole(ISSUER_ROLE, signer)) revert InvalidIssuerSignature();

        mintNonces[to] = nonce + 1;
        _mint(to, amount);
        emit MintAuthorized(to, amount, nonce, signer);
        emit Minted(to, amount, signer);
    }

    // -------------------------------------------------------------------------
    // Two-step redemption
    // -------------------------------------------------------------------------

    /// @notice Holder locks tokens in the contract and opens a redeem request.
    function requestRedeem(uint256 amount) external whenNotPaused returns (uint256 id) {
        if (amount == 0) revert InvalidAmount();
        _transfer(msg.sender, address(this), amount);
        id = nextRedeemId;
        unchecked {
            nextRedeemId = id + 1;
        }
        redeems[id] = RedeemRequest({holder: msg.sender, amount: amount, pending: true});
        emit RedeemRequested(id, msg.sender, amount);
    }

    /// @notice Custodian confirms off-chain payout and burns locked tokens.
    function confirmRedeem(uint256 id) external onlyRole(CUSTODIAN_ROLE) whenNotPaused {
        RedeemRequest storage request = redeems[id];
        if (!request.pending) revert RedeemNotPending();
        request.pending = false;
        _burn(address(this), request.amount);
        emit RedeemConfirmed(id, request.holder, request.amount);
    }

    /// @notice Holder cancels a pending redeem and receives tokens back.
    function cancelRedeem(uint256 id) external whenNotPaused {
        RedeemRequest storage request = redeems[id];
        if (!request.pending) revert RedeemNotPending();
        if (request.holder != msg.sender) revert NotRedeemHolder();
        request.pending = false;
        _transfer(address(this), msg.sender, request.amount);
        emit RedeemCancelled(id, msg.sender, request.amount);
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
