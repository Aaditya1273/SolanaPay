// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IRWARegistry.sol";

/**
 * @title RWAFractional
 * @dev ERC20 token representing fractional ownership of RWA NFTs
 * Supports cross-chain transfers, compliance, and governance features
 */
contract RWAFractional is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    IRWARegistry public rwaRegistry;
    
    struct FractionalInfo {
        uint256 assetId;
        uint256 originalTokenId;
        address originalNFTContract;
        uint256 totalFractions;
        uint256 creationTimestamp;
        address fractionalizer;
        bool isRedeemable;
        uint256 redemptionDeadline;
        mapping(address => uint256) lockedBalances;
        mapping(address => uint256) lockExpiry;
    }

    FractionalInfo public fractionalInfo;
    
    // Governance and voting
    mapping(address => uint256) public votingPower;
    mapping(bytes32 => bool) public executedProposals;
    
    // Cross-chain support
    mapping(uint256 => mapping(address => uint256)) public crossChainBalances;
    mapping(bytes32 => bool) public processedCrossChainTx;
    
    // Compliance and restrictions
    mapping(address => bool) public restrictedAddresses;
    mapping(address => uint256) public maxHoldings;
    uint256 public globalMaxHolding;
    
    // Events
    event FractionalCreated(
        uint256 indexed assetId,
        uint256 indexed originalTokenId,
        address indexed originalNFTContract,
        uint256 totalFractions,
        address fractionalizer
    );
    
    event TokensLocked(
        address indexed holder,
        uint256 amount,
        uint256 lockExpiry,
        string reason
    );
    
    event TokensUnlocked(
        address indexed holder,
        uint256 amount
    );
    
    event CrossChainTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes32 txHash
    );
    
    event RedemptionInitiated(
        address indexed redeemer,
        uint256 amount,
        uint256 deadline
    );
    
    event ComplianceTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        bool complianceChecked
    );

    // Modifiers
    modifier onlyFractionalizer() {
        require(msg.sender == fractionalInfo.fractionalizer, "Not fractionalizer");
        _;
    }

    modifier notRestricted(address account) {
        require(!restrictedAddresses[account], "Address is restricted");
        _;
    }

    modifier validAmount(address to, uint256 amount) {
        uint256 newBalance = balanceOf(to) + amount;
        require(
            maxHoldings[to] == 0 || newBalance <= maxHoldings[to],
            "Exceeds individual max holding"
        );
        require(
            globalMaxHolding == 0 || newBalance <= globalMaxHolding,
            "Exceeds global max holding"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name,
        string memory symbol,
        uint256 assetId,
        uint256 originalTokenId,
        address originalNFTContract,
        uint256 totalFractions,
        address fractionalizer,
        address registryAddress,
        address initialOwner
    ) public initializer {
        __ERC20_init(name, symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        rwaRegistry = IRWARegistry(registryAddress);
        
        // Set fractional info
        fractionalInfo.assetId = assetId;
        fractionalInfo.originalTokenId = originalTokenId;
        fractionalInfo.originalNFTContract = originalNFTContract;
        fractionalInfo.totalFractions = totalFractions;
        fractionalInfo.creationTimestamp = block.timestamp;
        fractionalInfo.fractionalizer = fractionalizer;
        fractionalInfo.isRedeemable = true;
        fractionalInfo.redemptionDeadline = 0; // No deadline initially
        
        // Mint all fractions to fractionalizer initially
        _mint(fractionalizer, totalFractions);
        
        emit FractionalCreated(
            assetId,
            originalTokenId,
            originalNFTContract,
            totalFractions,
            fractionalizer
        );
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Enhanced transfer with compliance checking
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        notRestricted(msg.sender) 
        notRestricted(to) 
        validAmount(to, amount)
        returns (bool) 
    {
        require(_isComplianceTransfer(msg.sender, to, amount), "Transfer not compliant");
        
        bool success = super.transfer(to, amount);
        if (success) {
            _updateVotingPower(msg.sender, to, amount);
            emit ComplianceTransfer(msg.sender, to, amount, true);
        }
        return success;
    }

    /**
     * @dev Enhanced transferFrom with compliance checking
     */
    function transferFrom(address from, address to, uint256 amount)
        public
        override
        notRestricted(from)
        notRestricted(to)
        validAmount(to, amount)
        returns (bool)
    {
        require(_isComplianceTransfer(from, to, amount), "Transfer not compliant");
        
        bool success = super.transferFrom(from, to, amount);
        if (success) {
            _updateVotingPower(from, to, amount);
            emit ComplianceTransfer(from, to, amount, true);
        }
        return success;
    }

    /**
     * @dev Check if transfer meets compliance requirements
     */
    function _isComplianceTransfer(address from, address to, uint256 amount) internal view returns (bool) {
        // Check if sender has enough unlocked balance
        uint256 lockedAmount = fractionalInfo.lockedBalances[from];
        uint256 availableBalance = balanceOf(from) - lockedAmount;
        if (amount > availableBalance) {
            return false;
        }
        
        // Get asset compliance requirements
        IRWARegistry.RWAAsset memory asset = rwaRegistry.getAsset(fractionalInfo.assetId);
        
        // Check recipient compliance
        IRWARegistry.ComplianceLevel toCompliance = rwaRegistry.userCompliance(to);
        if (uint8(toCompliance) < uint8(asset.requiredCompliance)) {
            return false;
        }
        
        return true;
    }

    /**
     * @dev Lock tokens for governance or other purposes
     */
    function lockTokens(
        address holder,
        uint256 amount,
        uint256 lockDuration,
        string memory reason
    ) external onlyOwner {
        require(balanceOf(holder) >= amount, "Insufficient balance");
        require(lockDuration > 0, "Lock duration must be positive");
        
        uint256 lockExpiry = block.timestamp + lockDuration;
        fractionalInfo.lockedBalances[holder] += amount;
        fractionalInfo.lockExpiry[holder] = lockExpiry;
        
        emit TokensLocked(holder, amount, lockExpiry, reason);
    }

    /**
     * @dev Unlock tokens after lock period expires
     */
    function unlockTokens(address holder) external {
        require(
            block.timestamp >= fractionalInfo.lockExpiry[holder] || msg.sender == owner(),
            "Lock period not expired"
        );
        
        uint256 lockedAmount = fractionalInfo.lockedBalances[holder];
        require(lockedAmount > 0, "No locked tokens");
        
        fractionalInfo.lockedBalances[holder] = 0;
        fractionalInfo.lockExpiry[holder] = 0;
        
        emit TokensUnlocked(holder, lockedAmount);
    }

    /**
     * @dev Cross-chain transfer (called by bridge)
     */
    function crossChainTransfer(
        address from,
        address to,
        uint256 amount,
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes32 txHash
    ) external onlyOwner {
        require(!processedCrossChainTx[txHash], "Transaction already processed");
        
        processedCrossChainTx[txHash] = true;
        
        if (targetChainId == block.chainid) {
            // Minting on target chain
            _mint(to, amount);
        } else {
            // Burning on source chain
            _burn(from, amount);
        }
        
        crossChainBalances[targetChainId][to] += amount;
        
        emit CrossChainTransfer(from, to, amount, sourceChainId, targetChainId, txHash);
    }

    /**
     * @dev Initiate redemption process
     */
    function initiateRedemption(uint256 deadline) external onlyFractionalizer {
        require(fractionalInfo.isRedeemable, "Redemption not allowed");
        require(deadline > block.timestamp, "Invalid deadline");
        
        fractionalInfo.redemptionDeadline = deadline;
        
        emit RedemptionInitiated(msg.sender, totalSupply(), deadline);
    }

    /**
     * @dev Update voting power based on balance changes
     */
    function _updateVotingPower(address from, address to, uint256 amount) internal {
        if (from != address(0)) {
            votingPower[from] = balanceOf(from);
        }
        if (to != address(0)) {
            votingPower[to] = balanceOf(to);
        }
    }

    // Admin functions
    function setRestricted(address account, bool restricted) external onlyOwner {
        restrictedAddresses[account] = restricted;
    }

    function setMaxHolding(address account, uint256 maxAmount) external onlyOwner {
        maxHoldings[account] = maxAmount;
    }

    function setGlobalMaxHolding(uint256 maxAmount) external onlyOwner {
        globalMaxHolding = maxAmount;
    }

    function setRedeemable(bool redeemable) external onlyFractionalizer {
        fractionalInfo.isRedeemable = redeemable;
    }

    function updateRegistry(address newRegistry) external onlyOwner {
        rwaRegistry = IRWARegistry(newRegistry);
    }

    // View functions
    function getLockedBalance(address holder) external view returns (uint256, uint256) {
        return (fractionalInfo.lockedBalances[holder], fractionalInfo.lockExpiry[holder]);
    }

    function getAvailableBalance(address holder) external view returns (uint256) {
        uint256 totalBalance = balanceOf(holder);
        uint256 lockedAmount = fractionalInfo.lockedBalances[holder];
        return totalBalance - lockedAmount;
    }

    function getFractionalInfo() external view returns (
        uint256 assetId,
        uint256 originalTokenId,
        address originalNFTContract,
        uint256 totalFractions,
        uint256 creationTimestamp,
        address fractionalizer,
        bool isRedeemable,
        uint256 redemptionDeadline
    ) {
        return (
            fractionalInfo.assetId,
            fractionalInfo.originalTokenId,
            fractionalInfo.originalNFTContract,
            fractionalInfo.totalFractions,
            fractionalInfo.creationTimestamp,
            fractionalInfo.fractionalizer,
            fractionalInfo.isRedeemable,
            fractionalInfo.redemptionDeadline
        );
    }

    // Required overrides
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._update(from, to, value);
        _updateVotingPower(from, to, value);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
