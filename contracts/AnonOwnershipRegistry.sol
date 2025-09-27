// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// Import the actual Semaphore contract interface
import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

contract AnonOwnershipRegistry {
    ISemaphore public immutable semaphore;
    uint256 public immutable groupId;

    mapping(bytes32 => bool) public claimed;
    mapping(bytes32 => uint256) public ownerNullifier;

    event OwnershipClaimed(bytes32 indexed objectHash, uint256 ownerNullifier);
    event OwnershipProved(bytes32 indexed objectHash, uint256 ownerNullifier);

    error AlreadyClaimed();
    error NotClaimed();
    error WrongOwner();

    constructor(address semaphoreAddress, uint256 semaphoreGroupId) {
        semaphore = ISemaphore(semaphoreAddress);
        groupId = semaphoreGroupId;
    }

    function claimOwnership(
        bytes32 objectHash,
        uint256 merkleTreeDepth,
        uint256 merkleTreeRoot,
        uint256 nullifierHash,
        uint256[8] calldata proofPoints
    ) external {
        if (claimed[objectHash]) revert AlreadyClaimed();

        uint256 signal = uint256(objectHash);
        uint256 externalNullifier = uint256(objectHash);

        ISemaphore.SemaphoreProof memory proof = ISemaphore.SemaphoreProof({
            merkleTreeDepth: merkleTreeDepth,
            merkleTreeRoot: merkleTreeRoot,
            nullifier: nullifierHash,
            message: signal,
            scope: externalNullifier,
            points: proofPoints
        });

        try semaphore.verifyProof(groupId, proof) returns (bool isValid) {
            require(isValid, "Invalid proof");
        } catch {
            revert("Semaphore verification failed");
        }

        claimed[objectHash] = true;
        ownerNullifier[objectHash] = nullifierHash;

        emit OwnershipClaimed(objectHash, nullifierHash);
    }

    function proveOwnership(
        bytes32 objectHash,
        uint256 merkleTreeDepth,
        uint256 merkleTreeRoot,
        uint256 nullifierHash,
        uint256[8] calldata proofPoints
    ) external {
        if (!claimed[objectHash]) revert NotClaimed();

        uint256 signal = uint256(objectHash);
        uint256 externalNullifier = uint256(objectHash);

        ISemaphore.SemaphoreProof memory proof = ISemaphore.SemaphoreProof({
            merkleTreeDepth: merkleTreeDepth,
            merkleTreeRoot: merkleTreeRoot,
            nullifier: nullifierHash,
            message: signal,
            scope: externalNullifier,
            points: proofPoints
        });

        try semaphore.verifyProof(groupId, proof) returns (bool isValid) {
            require(isValid, "Invalid proof");
        } catch {
            revert("Semaphore verification failed");
        }

        if (nullifierHash != ownerNullifier[objectHash]) revert WrongOwner();

        emit OwnershipProved(objectHash, nullifierHash);
    }

    function hasOwner(bytes32 objectHash) external view returns (bool) {
        return claimed[objectHash];
    }
}