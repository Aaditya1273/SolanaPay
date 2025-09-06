// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./CrossChainBridge.sol";

/**
 * @title OptimisticBridge
 * @dev Advanced cross-chain bridge with optimistic rollup concepts and proof verification
 * Implements secure cross-chain asset transfers with challenge mechanisms
 */
contract OptimisticBridge is 
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using ECDSA for bytes32;

    struct ProofData {
        bytes32 merkleRoot;
        bytes32[] merkleProof;
        bytes32 txHash;
        uint256 blockNumber;
        uint256 logIndex;
        bytes signature;
    }

    struct OptimisticClaim {
        bytes32 claimId;
        address claimer;
        uint256 sourceChainId;
        uint256 targetChainId;
        bytes32 txHash;
        bytes32 merkleRoot;
        uint256 claimTimestamp;
        uint256 challengePeriod;
        bool isExecuted;
        bool isChallenged;
        uint256 bondAmount;
        address challenger;
        uint256 challengeTimestamp;
    }

    struct AtomicSwap {
        bytes32 swapId;
        address initiator;
        address participant;
        uint256 sourceChainId;
        uint256 targetChainId;
        address sourceToken;
        address targetToken;
        uint256 sourceAmount;
        uint256 targetAmount;
        bytes32 hashLock;
        uint256 timelock;
        bool isInitiated;
        bool isCompleted;
        bool isRefunded;
    }

    // State variables
    mapping(bytes32 => OptimisticClaim) public optimisticClaims;
    mapping(bytes32 => AtomicSwap) public atomicSwaps;
    mapping(uint256 => bytes32) public chainMerkleRoots;
    mapping(address => bool) public authorizedValidators;
    mapping(bytes32 => bool) public processedTransactions;
    
    // Bridge configuration
    uint256 public challengePeriod; // Default 7 days
    uint256 public bondAmount; // Required bond for claims
    uint256 public validatorThreshold; // Minimum validators required
    address public crossChainBridge;
    
    // Consensus tracking
    mapping(bytes32 => mapping(address => bool)) public validatorVotes;
    mapping(bytes32 => uint256) public validatorVoteCount;
    
    // Events
    event OptimisticClaimSubmitted(
        bytes32 indexed claimId,
        address indexed claimer,
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes32 txHash,
        bytes32 merkleRoot
    );
    
    event ClaimChallenged(
        bytes32 indexed claimId,
        address indexed challenger,
        uint256 challengeTimestamp
    );
    
    event ClaimExecuted(
        bytes32 indexed claimId,
        address indexed executor,
        bool successful
    );
    
    event AtomicSwapInitiated(
        bytes32 indexed swapId,
        address indexed initiator,
        address indexed participant,
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes32 hashLock
    );
    
    event AtomicSwapCompleted(
        bytes32 indexed swapId,
        bytes32 preimage
    );
    
    event AtomicSwapRefunded(
        bytes32 indexed swapId,
        address indexed refundee
    );
    
    event MerkleRootUpdated(
        uint256 indexed chainId,
        bytes32 oldRoot,
        bytes32 newRoot,
        uint256 blockNumber
    );
    
    event ValidatorVote(
        bytes32 indexed claimId,
        address indexed validator,
        bool vote
    );

    // Modifiers
    modifier onlyValidator() {
        require(authorizedValidators[msg.sender], "Not authorized validator");
        _;
    }

    modifier validClaim(bytes32 claimId) {
        require(optimisticClaims[claimId].claimer != address(0), "Claim does not exist");
        _;
    }

    modifier validSwap(bytes32 swapId) {
        require(atomicSwaps[swapId].initiator != address(0), "Swap does not exist");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address _crossChainBridge,
        uint256 _challengePeriod,
        uint256 _bondAmount,
        uint256 _validatorThreshold
    ) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        crossChainBridge = _crossChainBridge;
        challengePeriod = _challengePeriod;
        bondAmount = _bondAmount;
        validatorThreshold = _validatorThreshold;
        
        // Add initial validator
        authorizedValidators[initialOwner] = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Submit optimistic claim for cross-chain transaction
     */
    function submitOptimisticClaim(
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes32 txHash,
        ProofData calldata proof
    ) external payable nonReentrant whenNotPaused {
        require(msg.value >= bondAmount, "Insufficient bond amount");
        require(!processedTransactions[txHash], "Transaction already processed");
        
        // Verify Merkle proof
        require(_verifyMerkleProof(proof), "Invalid Merkle proof");
        
        bytes32 claimId = keccak256(abi.encodePacked(
            sourceChainId,
            targetChainId,
            txHash,
            proof.merkleRoot,
            block.timestamp
        ));
        
        require(optimisticClaims[claimId].claimer == address(0), "Claim already exists");
        
        optimisticClaims[claimId] = OptimisticClaim({
            claimId: claimId,
            claimer: msg.sender,
            sourceChainId: sourceChainId,
            targetChainId: targetChainId,
            txHash: txHash,
            merkleRoot: proof.merkleRoot,
            claimTimestamp: block.timestamp,
            challengePeriod: challengePeriod,
            isExecuted: false,
            isChallenged: false,
            bondAmount: msg.value,
            challenger: address(0),
            challengeTimestamp: 0
        });
        
        emit OptimisticClaimSubmitted(
            claimId,
            msg.sender,
            sourceChainId,
            targetChainId,
            txHash,
            proof.merkleRoot
        );
    }

    /**
     * @dev Challenge an optimistic claim
     */
    function challengeClaim(
        bytes32 claimId,
        ProofData calldata counterProof
    ) external payable validClaim(claimId) {
        OptimisticClaim storage claim = optimisticClaims[claimId];
        require(!claim.isExecuted, "Claim already executed");
        require(!claim.isChallenged, "Claim already challenged");
        require(
            block.timestamp <= claim.claimTimestamp + claim.challengePeriod,
            "Challenge period expired"
        );
        require(msg.value >= claim.bondAmount, "Insufficient challenge bond");
        
        // Verify counter-proof
        require(_verifyMerkleProof(counterProof), "Invalid counter-proof");
        
        claim.isChallenged = true;
        claim.challenger = msg.sender;
        claim.challengeTimestamp = block.timestamp;
        
        emit ClaimChallenged(claimId, msg.sender, block.timestamp);
    }

    /**
     * @dev Execute optimistic claim after challenge period
     */
    function executeClaim(bytes32 claimId) external nonReentrant validClaim(claimId) {
        OptimisticClaim storage claim = optimisticClaims[claimId];
        require(!claim.isExecuted, "Claim already executed");
        require(
            block.timestamp > claim.claimTimestamp + claim.challengePeriod,
            "Challenge period not expired"
        );
        
        bool successful = true;
        
        if (claim.isChallenged) {
            // Resolve challenge through validator consensus
            successful = _resolveChallenge(claimId);
        }
        
        if (successful) {
            // Execute the cross-chain transaction
            _executeCrossChainTransaction(claim);
            
            // Return bond to claimer
            payable(claim.claimer).transfer(claim.bondAmount);
            
            // If challenged, slash challenger's bond
            if (claim.isChallenged) {
                // Challenger's bond goes to claimer as reward
                payable(claim.claimer).transfer(claim.bondAmount);
            }
        } else {
            // Claim is invalid, return bond to challenger
            if (claim.isChallenged) {
                payable(claim.challenger).transfer(claim.bondAmount * 2);
            }
        }
        
        claim.isExecuted = true;
        processedTransactions[claim.txHash] = true;
        
        emit ClaimExecuted(claimId, msg.sender, successful);
    }

    /**
     * @dev Initiate atomic swap
     */
    function initiateAtomicSwap(
        address participant,
        uint256 sourceChainId,
        uint256 targetChainId,
        address sourceToken,
        address targetToken,
        uint256 sourceAmount,
        uint256 targetAmount,
        bytes32 hashLock,
        uint256 timelock
    ) external nonReentrant whenNotPaused returns (bytes32) {
        require(participant != address(0), "Invalid participant");
        require(timelock > block.timestamp, "Invalid timelock");
        
        bytes32 swapId = keccak256(abi.encodePacked(
            msg.sender,
            participant,
            sourceChainId,
            targetChainId,
            sourceToken,
            targetToken,
            sourceAmount,
            targetAmount,
            hashLock,
            timelock,
            block.timestamp
        ));
        
        require(atomicSwaps[swapId].initiator == address(0), "Swap already exists");
        
        atomicSwaps[swapId] = AtomicSwap({
            swapId: swapId,
            initiator: msg.sender,
            participant: participant,
            sourceChainId: sourceChainId,
            targetChainId: targetChainId,
            sourceToken: sourceToken,
            targetToken: targetToken,
            sourceAmount: sourceAmount,
            targetAmount: targetAmount,
            hashLock: hashLock,
            timelock: timelock,
            isInitiated: true,
            isCompleted: false,
            isRefunded: false
        });
        
        // Lock source tokens
        IERC20(sourceToken).transferFrom(msg.sender, address(this), sourceAmount);
        
        emit AtomicSwapInitiated(
            swapId,
            msg.sender,
            participant,
            sourceChainId,
            targetChainId,
            hashLock
        );
        
        return swapId;
    }

    /**
     * @dev Complete atomic swap with preimage
     */
    function completeAtomicSwap(
        bytes32 swapId,
        bytes32 preimage
    ) external nonReentrant validSwap(swapId) {
        AtomicSwap storage swap = atomicSwaps[swapId];
        require(swap.isInitiated, "Swap not initiated");
        require(!swap.isCompleted, "Swap already completed");
        require(!swap.isRefunded, "Swap already refunded");
        require(block.timestamp <= swap.timelock, "Swap expired");
        require(keccak256(abi.encodePacked(preimage)) == swap.hashLock, "Invalid preimage");
        
        swap.isCompleted = true;
        
        // Transfer tokens to participant
        IERC20(swap.sourceToken).transfer(swap.participant, swap.sourceAmount);
        
        emit AtomicSwapCompleted(swapId, preimage);
    }

    /**
     * @dev Refund atomic swap after timelock expires
     */
    function refundAtomicSwap(bytes32 swapId) external nonReentrant validSwap(swapId) {
        AtomicSwap storage swap = atomicSwaps[swapId];
        require(swap.isInitiated, "Swap not initiated");
        require(!swap.isCompleted, "Swap already completed");
        require(!swap.isRefunded, "Swap already refunded");
        require(block.timestamp > swap.timelock, "Swap not expired");
        require(msg.sender == swap.initiator, "Only initiator can refund");
        
        swap.isRefunded = true;
        
        // Return tokens to initiator
        IERC20(swap.sourceToken).transfer(swap.initiator, swap.sourceAmount);
        
        emit AtomicSwapRefunded(swapId, swap.initiator);
    }

    /**
     * @dev Validator vote on challenged claim
     */
    function validatorVote(bytes32 claimId, bool vote) external onlyValidator validClaim(claimId) {
        require(optimisticClaims[claimId].isChallenged, "Claim not challenged");
        require(!validatorVotes[claimId][msg.sender], "Already voted");
        
        validatorVotes[claimId][msg.sender] = true;
        if (vote) {
            validatorVoteCount[claimId]++;
        }
        
        emit ValidatorVote(claimId, msg.sender, vote);
    }

    /**
     * @dev Update Merkle root for a chain
     */
    function updateMerkleRoot(
        uint256 chainId,
        bytes32 newRoot,
        uint256 blockNumber,
        bytes[] calldata validatorSignatures
    ) external onlyValidator {
        require(validatorSignatures.length >= validatorThreshold, "Insufficient validator signatures");
        
        bytes32 messageHash = keccak256(abi.encodePacked(chainId, newRoot, blockNumber));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        // Verify validator signatures
        address[] memory signers = new address[](validatorSignatures.length);
        for (uint256 i = 0; i < validatorSignatures.length; i++) {
            address signer = ethSignedMessageHash.recover(validatorSignatures[i]);
            require(authorizedValidators[signer], "Invalid validator signature");
            
            // Check for duplicate signers
            for (uint256 j = 0; j < i; j++) {
                require(signers[j] != signer, "Duplicate validator signature");
            }
            signers[i] = signer;
        }
        
        bytes32 oldRoot = chainMerkleRoots[chainId];
        chainMerkleRoots[chainId] = newRoot;
        
        emit MerkleRootUpdated(chainId, oldRoot, newRoot, blockNumber);
    }

    /**
     * @dev Verify Merkle proof
     */
    function _verifyMerkleProof(ProofData calldata proof) internal view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(proof.txHash, proof.blockNumber, proof.logIndex));
        return MerkleProof.verify(proof.merkleProof, proof.merkleRoot, leaf);
    }

    /**
     * @dev Resolve challenge through validator consensus
     */
    function _resolveChallenge(bytes32 claimId) internal view returns (bool) {
        uint256 totalValidators = _getValidatorCount();
        uint256 requiredVotes = (totalValidators * 2) / 3 + 1; // 2/3 majority
        
        return validatorVoteCount[claimId] >= requiredVotes;
    }

    /**
     * @dev Execute cross-chain transaction
     */
    function _executeCrossChainTransaction(OptimisticClaim memory claim) internal {
        // Call the main bridge contract to execute the transaction
        CrossChainBridge(crossChainBridge).completeBridge(
            claim.txHash,
            address(0) // Target contract will be determined by bridge
        );
    }

    /**
     * @dev Get total number of validators
     */
    function _getValidatorCount() internal view returns (uint256) {
        // This would typically iterate through all validators
        // For simplicity, we'll return a fixed number
        return 5; // This should be dynamic in production
    }

    // Admin functions
    function addValidator(address validator) external onlyOwner {
        authorizedValidators[validator] = true;
    }

    function removeValidator(address validator) external onlyOwner {
        authorizedValidators[validator] = false;
    }

    function setChallengePeriod(uint256 _challengePeriod) external onlyOwner {
        challengePeriod = _challengePeriod;
    }

    function setBondAmount(uint256 _bondAmount) external onlyOwner {
        bondAmount = _bondAmount;
    }

    function setValidatorThreshold(uint256 _validatorThreshold) external onlyOwner {
        validatorThreshold = _validatorThreshold;
    }

    // View functions
    function getOptimisticClaim(bytes32 claimId) external view returns (OptimisticClaim memory) {
        return optimisticClaims[claimId];
    }

    function getAtomicSwap(bytes32 swapId) external view returns (AtomicSwap memory) {
        return atomicSwaps[swapId];
    }

    function isClaimExecutable(bytes32 claimId) external view returns (bool) {
        OptimisticClaim memory claim = optimisticClaims[claimId];
        return !claim.isExecuted && 
               block.timestamp > claim.claimTimestamp + claim.challengePeriod;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
