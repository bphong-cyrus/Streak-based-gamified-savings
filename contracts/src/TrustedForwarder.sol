// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title TrustedForwarder (Tính năng 45)
/// @notice Meta-tx: ngườ dùng ký message EIP-712, relayer gửi tx và trả gas.
///         Contracts khác (EIP2771-aware) nhận diện msgSender qua forwarder này.
contract TrustedForwarder is Ownable, EIP712 {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        uint256 deadline;
        bytes data;
    }

    bytes32 private constant TYPEHASH = keccak256(
        "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint256 deadline,bytes data)"
    );

    mapping(address => uint256) public nonces;
    mapping(address => bool) public registeredContracts;

    event ContractRegistered(address indexed target);
    error SignatureMismatch();
    error DeadlinePassed();
    error TargetNotRegistered();
    error CallFailed();

    constructor() Ownable(msg.sender) EIP712("StreakForwarder", "1") {}

    function registerContract(address target) external onlyOwner {
        registeredContracts[target] = true;
        emit ContractRegistered(target);
    }

    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(TYPEHASH, req.from, req.to, req.value, req.gas, req.nonce, req.deadline, keccak256(req.data))
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        return hash.recover(signature) == req.from;
    }

    function execute(ForwardRequest calldata req, bytes calldata signature)
        external
        returns (bool, bytes memory)
    {
        if (!registeredContracts[req.to]) revert TargetNotRegistered();
        if (block.timestamp > req.deadline) revert DeadlinePassed();
        if (nonces[req.from] != req.nonce) revert SignatureMismatch();
        if (!verify(req, signature)) revert SignatureMismatch();
        nonces[req.from] += 1;

        (bool ok, bytes memory returndata) = req.to.call{gas: req.gas, value: req.value}(
            abi.encodePacked(req.data, req.from) // EIP-2771: nối địa chỉ signer
        );
        if (!ok) revert CallFailed();
        return (ok, returndata);
    }
}
